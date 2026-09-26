import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

function database() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
}

function normalizePhone(value: string) {
  return value.replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))).replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
}

export async function GET() {
  const client = database();
  if (!client) return NextResponse.json({ offers: [] }, { headers: { "Cache-Control": "no-store" } });
  const now = new Date().toISOString();
  const { data, error } = await client
    .from("limited_offers")
    .select("id,title,description,image_url,code_prefix,max_recipients,next_code_number,allowed_districts,show_in_scroll,show_in_popup,starts_at,ends_at")
    .eq("status", "active")
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order("created_at", { ascending: false });
  if (error) {
    if (["42P01", "PGRST205"].includes(error.code || "")) return NextResponse.json({ offers: [] }, { headers: { "Cache-Control": "no-store" } });
    return NextResponse.json({ error: error.message }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
  const offers = (data || []).map(({ next_code_number: nextCodeNumber, ...offer }) => ({
    ...offer,
    remaining: offer.max_recipients === null ? null : Math.max(0, offer.max_recipients - Number(nextCodeNumber || 1) + 1),
  })).filter((offer) => offer.remaining === null || offer.remaining > 0);
  return NextResponse.json({ offers }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(request: NextRequest) {
  const client = database();
  if (!client) return NextResponse.json({ error: "الخدمة غير متاحة الآن" }, { status: 503 });
  const form = await request.formData();
  const offerId = Number(form.get("offer_id"));
  const name = String(form.get("name") || "").trim().slice(0, 100);
  const phone = normalizePhone(String(form.get("phone") || "")).replace(/\D/g, "");
  const district = String(form.get("district") || "").trim().slice(0, 100);
  const village = String(form.get("village") || "").trim().slice(0, 100);
  const attachment = form.get("attachment");
  if (!Number.isInteger(offerId) || !name || !/^(010|011|012|015)\d{8}$/.test(phone) || !district) {
    return NextResponse.json({ error: "أكمل الاسم ورقم الهاتف والمركز بشكل صحيح" }, { status: 400 });
  }
  if (attachment instanceof File && attachment.size > 0 && (!ALLOWED_ATTACHMENT_TYPES.has(attachment.type) || attachment.size > MAX_ATTACHMENT_SIZE)) {
    return NextResponse.json({ error: "المرفق يجب أن يكون صورة JPG أو PNG أو WebP أو PDF وبحجم لا يتجاوز 10 ميجابايت" }, { status: 400 });
  }

  const { data: offer, error: offerError } = await client
    .from("limited_offers")
    .select("id,allowed_districts,status,starts_at,ends_at,max_recipients,next_code_number")
    .eq("id", offerId)
    .eq("status", "active")
    .maybeSingle();
  const currentTime = Date.now();
  if (offerError || !offer || (offer.starts_at && new Date(offer.starts_at).getTime() > currentTime) || (offer.ends_at && new Date(offer.ends_at).getTime() < currentTime)) {
    return NextResponse.json({ error: "هذا العرض لم يعد متاحًا" }, { status: 404 });
  }
  if (!(offer.allowed_districts || []).includes(district)) return NextResponse.json({ error: "اختر مركزًا متاحًا لهذا العرض" }, { status: 400 });
  if (offer.max_recipients !== null && Number(offer.next_code_number) > Number(offer.max_recipients)) {
    return NextResponse.json({ error: "اكتمل العدد المتاح لهذا العرض" }, { status: 409 });
  }

  let attachmentPath: string | null = null;
  let attachmentName: string | null = null;
  if (attachment instanceof File && attachment.size > 0) {
    const extension = attachment.name.toLowerCase().split(".").pop()?.replace(/[^a-z0-9]/g, "") || "file";
    attachmentPath = `${offerId}/${randomUUID()}.${extension}`;
    attachmentName = attachment.name.replace(/[\\/\x00-\x1f]/g, "").slice(0, 160);
    const { error: uploadError } = await client.storage.from("limited-offer-attachments").upload(attachmentPath, attachment, {
      contentType: attachment.type,
      upsert: false,
    });
    if (uploadError) return NextResponse.json({ error: "تعذر رفع المرفق، حاول مرة أخرى" }, { status: 400 });
  }

  const { data, error } = await client.rpc("register_limited_offer_signup", {
    p_offer_id: offerId,
    p_name: name,
    p_phone: phone,
    p_district: district,
    p_village: village,
    p_attachment_path: attachmentPath,
    p_attachment_name: attachmentName,
  });
  if (error) {
    if (attachmentPath) await client.storage.from("limited-offer-attachments").remove([attachmentPath]);
    if (error.code === "23505") return NextResponse.json({ error: "سبق لك التسجيل في هذا العرض بهذا الرقم" }, { status: 409 });
    const reason = error.message.includes("اكتمل العدد")
      ? "اكتمل العدد المتاح لهذا العرض"
      : error.message.includes("غير متاح")
        ? "العرض غير متاح للتسجيل الآن"
        : "تعذر تسجيلك الآن، حاول مرة أخرى";
    return NextResponse.json({ error: reason }, { status: reason.includes("اكتمل") ? 409 : 400 });
  }
  return NextResponse.json({ code: data.code, remaining: data.remaining }, { status: 201 });
}
