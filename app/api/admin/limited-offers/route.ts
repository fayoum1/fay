import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminRole } from "@/lib/admin-auth";

const DISTRICTS = ["الفيوم", "إبشواي", "إطسا", "سنورس", "طامية", "يوسف الصديق"];

function database() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
}

function unauthorized() {
  return NextResponse.json({ error: "هذه الصلاحية للأدمن فقط" }, { status: 401 });
}

export async function GET(request: NextRequest) {
  if (await getAdminRole(request) !== "admin") return unauthorized();
  const client = database();
  if (!client) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const [{ data: offers, error: offersError }, { data: signups, error: signupsError }, { data: items, error: itemsError }] = await Promise.all([
    client.from("limited_offers").select("*").order("created_at", { ascending: false }),
    client.from("limited_offer_signups").select("*").order("created_at", { ascending: false }),
    client.from("items").select("id,name").eq("active", true).order("name"),
  ]);
  if (offersError || signupsError || itemsError) return NextResponse.json({ error: offersError?.message || signupsError?.message || itemsError?.message }, { status: 500 });
  const now = Date.now();
  const diagnosedOffers = (offers || []).map((offer) => {
    const startsAt = offer.starts_at ? new Date(offer.starts_at).getTime() : null;
    const endsAt = offer.ends_at ? new Date(offer.ends_at).getTime() : null;
    const visibilityReason = offer.status !== "active"
      ? "فعّل العرض لنشره"
      : !offer.show_in_scroll && !offer.show_in_popup
        ? "اختر الشريط أو النافذة المنبثقة"
        : startsAt !== null && startsAt > now
          ? "موعد بداية العرض لم يحن بعد"
          : endsAt !== null && endsAt < now
            ? "انتهى موعد العرض"
            : offer.max_recipients !== null && Number(offer.next_code_number) > Number(offer.max_recipients)
              ? "اكتمل العدد المتاح"
              : null;
    return { ...offer, public_visibility: visibilityReason === null, visibility_reason: visibilityReason };
  });
  const signupsWithFiles = await Promise.all((signups || []).map(async (signup) => {
    if (!signup.attachment_path) return signup;
    const { data } = await client.storage.from("limited-offer-attachments").createSignedUrl(signup.attachment_path, 3600);
    return { ...signup, attachment_url: data?.signedUrl || null };
  }));
  return NextResponse.json({ offers: diagnosedOffers, signups: signupsWithFiles, items: items || [] });
}

export async function POST(request: NextRequest) {
  if (await getAdminRole(request) !== "admin") return unauthorized();
  const client = database();
  if (!client) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const form = await request.formData();
  const title = String(form.get("title") || "").trim().slice(0, 120);
  const description = String(form.get("description") || "").trim().slice(0, 600);
  const itemId = Number(form.get("item_id"));
  const quantityPerUserText = String(form.get("quantity_per_user") || "").trim();
  const quantityPerUser = quantityPerUserText ? Number(quantityPerUserText) : null;
  const codePrefix = String(form.get("code_prefix") || "A").trim().slice(0, 8);
  const maxRecipientsText = String(form.get("max_recipients") || "").trim();
  const maxRecipients = maxRecipientsText ? Number(maxRecipientsText) : null;
  let allowedDistricts: string[] = [];
  try {
    const parsed = JSON.parse(String(form.get("allowed_districts") || "[]"));
    if (Array.isArray(parsed)) allowedDistricts = [...new Set(parsed.filter((district): district is string => typeof district === "string" && DISTRICTS.includes(district)))];
  } catch {
    return NextResponse.json({ error: "اختر مراكز العرض بشكل صحيح" }, { status: 400 });
  }
  const showInScroll = String(form.get("show_in_scroll")) === "true";
  const showInPopup = String(form.get("show_in_popup")) === "true";
  const startsAtText = String(form.get("starts_at") || "").trim();
  const endsAtText = String(form.get("ends_at") || "").trim();
  const startsAt = startsAtText ? new Date(startsAtText) : null;
  const endsAt = endsAtText ? new Date(endsAtText) : null;
  const image = form.get("image");
  if (!title || !Number.isInteger(itemId) || itemId < 1 || (quantityPerUser !== null && (!Number.isInteger(quantityPerUser) || quantityPerUser < 1)) || allowedDistricts.length === 0 || !/^[A-Za-z0-9_-]{1,8}$/.test(codePrefix) || (maxRecipients !== null && (!Number.isInteger(maxRecipients) || maxRecipients < 1)) || (!showInScroll && !showInPopup)) {
    return NextResponse.json({ error: "أكمل عنوان العرض والصنف والمراكز، أو أدخل كمية صحيحة" }, { status: 400 });
  }
  const { data: item, error: itemError } = await client.from("items").select("id,name").eq("id", itemId).eq("active", true).maybeSingle();
  if (itemError || !item) return NextResponse.json({ error: "اختر صنفًا نشطًا من قائمة الأصناف" }, { status: 400 });
  if (startsAt && Number.isNaN(startsAt.getTime())) return NextResponse.json({ error: "تاريخ بداية العرض غير صحيح" }, { status: 400 });
  if (endsAt && (Number.isNaN(endsAt.getTime()) || (startsAt && endsAt <= startsAt))) return NextResponse.json({ error: "تاريخ نهاية العرض يجب أن يكون بعد بدايته" }, { status: 400 });
  if (!(image instanceof File) || image.size === 0 || !image.type.startsWith("image/") || image.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "أرفق صورة للعرض بحجم لا يتجاوز 5 ميجابايت" }, { status: 400 });
  }

  const extension = image.name.toLowerCase().split(".").pop()?.replace(/[^a-z0-9]/g, "") || "img";
  const imagePath = `${randomUUID()}.${extension}`;
  const { error: uploadError } = await client.storage.from("limited-offer-images").upload(imagePath, image, { contentType: image.type, upsert: false });
  if (uploadError) return NextResponse.json({ error: "تعذر رفع صورة العرض" }, { status: 400 });
  const imageUrl = client.storage.from("limited-offer-images").getPublicUrl(imagePath).data.publicUrl;
  const { data, error } = await client.from("limited_offers").insert({
    title,
    description,
    image_url: imageUrl,
    item_id: item.id,
    item_name: item.name,
    quantity_per_user: quantityPerUser,
    code_prefix: codePrefix,
    max_recipients: maxRecipients,
    allowed_districts: allowedDistricts,
    show_in_scroll: showInScroll,
    show_in_popup: showInPopup,
    starts_at: startsAt?.toISOString() || null,
    ends_at: endsAt?.toISOString() || null,
    status: "draft",
  }).select("*").single();
  if (error) {
    await client.storage.from("limited-offer-images").remove([imagePath]);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  if (await getAdminRole(request) !== "admin") return unauthorized();
  const client = database();
  if (!client) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  if (request.headers.get("content-type")?.includes("multipart/form-data")) {
    const form = await request.formData();
    const id = Number(form.get("id"));
    const title = String(form.get("title") || "").trim().slice(0, 120);
    const description = String(form.get("description") || "").trim().slice(0, 600);
    const itemId = Number(form.get("item_id"));
    const quantityPerUserText = String(form.get("quantity_per_user") || "").trim();
    const quantityPerUser = quantityPerUserText ? Number(quantityPerUserText) : null;
    const codePrefix = String(form.get("code_prefix") || "").trim().slice(0, 8);
    const maxRecipientsText = String(form.get("max_recipients") || "").trim();
    const maxRecipients = maxRecipientsText ? Number(maxRecipientsText) : null;
    const showInScroll = String(form.get("show_in_scroll")) === "true";
    const showInPopup = String(form.get("show_in_popup")) === "true";
    const startsAtText = String(form.get("starts_at") || "").trim();
    const endsAtText = String(form.get("ends_at") || "").trim();
    const startsAt = startsAtText ? new Date(startsAtText) : null;
    const endsAt = endsAtText ? new Date(endsAtText) : null;
    const image = form.get("image");
    let allowedDistricts: string[] = [];
    try {
      const parsed = JSON.parse(String(form.get("allowed_districts") || "[]"));
      if (Array.isArray(parsed)) allowedDistricts = [...new Set(parsed.filter((district): district is string => typeof district === "string" && DISTRICTS.includes(district)))];
    } catch {
      return NextResponse.json({ error: "اختر المراكز بشكل صحيح" }, { status: 400 });
    }
    if (!Number.isInteger(id) || !title || !Number.isInteger(itemId) || itemId < 1 || (quantityPerUser !== null && (!Number.isInteger(quantityPerUser) || quantityPerUser < 1)) || !/^[A-Za-z0-9_-]{1,8}$/.test(codePrefix) || allowedDistricts.length === 0 || (maxRecipients !== null && (!Number.isInteger(maxRecipients) || maxRecipients < 1)) || (!showInScroll && !showInPopup)) {
      return NextResponse.json({ error: "راجع عنوان العرض والصنف والمراكز أو أدخل كمية صحيحة" }, { status: 400 });
    }
    const { data: item, error: itemError } = await client.from("items").select("id,name").eq("id", itemId).eq("active", true).maybeSingle();
    if (itemError || !item) return NextResponse.json({ error: "اختر صنفًا نشطًا من قائمة الأصناف" }, { status: 400 });
    if (startsAt && Number.isNaN(startsAt.getTime())) return NextResponse.json({ error: "تاريخ بداية العرض غير صحيح" }, { status: 400 });
    if (endsAt && (Number.isNaN(endsAt.getTime()) || (startsAt && endsAt <= startsAt))) return NextResponse.json({ error: "تاريخ نهاية العرض يجب أن يكون بعد بدايته" }, { status: 400 });
    if (image instanceof File && image.size > 0 && (!image.type.startsWith("image/") || image.size > 5 * 1024 * 1024)) {
      return NextResponse.json({ error: "الصورة يجب أن تكون أقل من 5 ميجابايت" }, { status: 400 });
    }
    const { data: existing, error: readError } = await client.from("limited_offers").select("code_prefix,next_code_number,max_recipients,image_url").eq("id", id).maybeSingle();
    if (readError || !existing) return NextResponse.json({ error: readError?.message || "العرض غير موجود" }, { status: 404 });
    if (Number(existing.next_code_number) > 1 && codePrefix !== existing.code_prefix) {
      return NextResponse.json({ error: "لا يمكن تغيير بادئة الكود بعد إصدار أكواد للمسجلين" }, { status: 400 });
    }
    const registeredCount = Math.max(0, Number(existing.next_code_number) - 1);
    if (maxRecipients !== null && maxRecipients < registeredCount) {
      return NextResponse.json({ error: `لا يمكن خفض الحد عن عدد المسجلين الحالي (${registeredCount})` }, { status: 400 });
    }
    let imageUrl = existing.image_url as string;
    let uploadedImagePath: string | null = null;
    if (image instanceof File && image.size > 0) {
      const extension = image.name.toLowerCase().split(".").pop()?.replace(/[^a-z0-9]/g, "") || "img";
      uploadedImagePath = `${randomUUID()}.${extension}`;
      const { error: uploadError } = await client.storage.from("limited-offer-images").upload(uploadedImagePath, image, { contentType: image.type, upsert: false });
      if (uploadError) return NextResponse.json({ error: "تعذر رفع صورة العرض" }, { status: 400 });
      imageUrl = client.storage.from("limited-offer-images").getPublicUrl(uploadedImagePath).data.publicUrl;
    }
    const { data, error } = await client.from("limited_offers").update({
      title,
      description,
      image_url: imageUrl,
      item_id: item.id,
      item_name: item.name,
      quantity_per_user: quantityPerUser,
      code_prefix: codePrefix,
      max_recipients: maxRecipients,
      allowed_districts: allowedDistricts,
      show_in_scroll: showInScroll,
      show_in_popup: showInPopup,
      starts_at: startsAt?.toISOString() || null,
      ends_at: endsAt?.toISOString() || null,
      updated_at: new Date().toISOString(),
    }).eq("id", id).select("*").single();
    if (error) {
      if (uploadedImagePath) await client.storage.from("limited-offer-images").remove([uploadedImagePath]);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (uploadedImagePath && existing.image_url) {
      const oldPath = String(existing.image_url).split("/limited-offer-images/")[1];
      if (oldPath) await client.storage.from("limited-offer-images").remove([oldPath]);
    }
    return NextResponse.json(data);
  }
  const body = await request.json().catch(() => ({}));
  if (body.entity === "signup") {
    const id = Number(body.id);
    const status = ["registered", "contacted", "fulfilled", "cancelled"].includes(body.status) ? body.status : null;
    if (!Number.isInteger(id) || !status) return NextResponse.json({ error: "بيانات التسجيل غير صحيحة" }, { status: 400 });
    const { data, error } = await client.from("limited_offer_signups").update({ status }).eq("id", id).select("id,status").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  }
  const id = Number(body.id);
  const status = ["draft", "active", "paused", "ended"].includes(body.status) ? body.status : null;
  if (!Number.isInteger(id) || !status) return NextResponse.json({ error: "حالة العرض غير صحيحة" }, { status: 400 });
  const { data, error } = await client.from("limited_offers").update({ status, updated_at: new Date().toISOString() }).eq("id", id).select("id,status").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  if (await getAdminRole(request) !== "admin") return unauthorized();
  const client = database();
  if (!client) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const id = Number(body.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "العرض غير صحيح" }, { status: 400 });
  const [{ data: offer, error: offerError }, { data: signups, error: signupsError }] = await Promise.all([
    client.from("limited_offers").select("id,image_url").eq("id", id).maybeSingle(),
    client.from("limited_offer_signups").select("attachment_path").eq("offer_id", id),
  ]);
  if (offerError || signupsError) return NextResponse.json({ error: offerError?.message || signupsError?.message }, { status: 400 });
  if (!offer) return NextResponse.json({ error: "العرض غير موجود" }, { status: 404 });
  const { error } = await client.from("limited_offers").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const imagePath = String(offer.image_url).split("/limited-offer-images/")[1];
  if (imagePath) await client.storage.from("limited-offer-images").remove([imagePath]);
  const attachmentPaths = (signups || []).map((signup) => signup.attachment_path).filter((path): path is string => Boolean(path));
  if (attachmentPaths.length) await client.storage.from("limited-offer-attachments").remove(attachmentPaths);
  return NextResponse.json({ success: true });
}
