import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getMarketUser } from "@/lib/market-auth";

function database() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
}

export async function GET() {
  const client = database();
  if (!client) return NextResponse.json({ advertisements: [], packages: [] });
  const now = new Date().toISOString();
  const [{ data: advertisements, error }, { data: packages }] = await Promise.all([
    client.from("advertisements").select("id,advertiser_name,title,description,media_type,image_url,video_url,target_url,whatsapp,featured,display_order,starts_at,ends_at").eq("status", "مقبول").in("payment_status", ["غير مطلوب", "تم الدفع"]).or(`starts_at.is.null,starts_at.lte.${now}`).or(`ends_at.is.null,ends_at.gte.${now}`).order("featured", { ascending: false }).order("display_order").order("created_at", { ascending: false }),
    client.from("advertisement_packages").select("id,name,duration_days,price").eq("active", true).order("price"),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ advertisements: advertisements || [], packages: packages || [] });
}

export async function POST(request: NextRequest) {
  const user = await getMarketUser(request);
  if (!user) return NextResponse.json({ error: "سجل الدخول أولًا لإرسال إعلان" }, { status: 401 });
  const client = database();
  if (!client) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const form = await request.formData();
  const title = String(form.get("title") || "").trim().slice(0, 120);
  const description = String(form.get("description") || "").trim().slice(0, 500);
  const mediaType = ["text", "image", "video", "text_image"].includes(String(form.get("media_type"))) ? String(form.get("media_type")) : "text";
  const targetUrl = String(form.get("target_url") || "").trim().slice(0, 500);
  const whatsapp = String(form.get("whatsapp") || user.phone).trim().slice(0, 30);
  const packageId = Number(form.get("package_id"));
  if (!title || !description) return NextResponse.json({ error: "اكتب عنوان الإعلان ووصفه" }, { status: 400 });
  const { data: packageData } = await client.from("advertisement_packages").select("id,duration_days,price").eq("id", packageId).eq("active", true).maybeSingle();
  if (!packageData) return NextResponse.json({ error: "اختر باقة إعلانية صحيحة" }, { status: 400 });
  let imageUrl: string | null = null;
  let videoUrl: string | null = null;
  const media = form.get("media");
  if (media instanceof File && media.size) {
    const isVideo = mediaType === "video";
    const validType = isVideo ? media.type.startsWith("video/") : media.type.startsWith("image/");
    const maxSize = isVideo ? 20 * 1024 * 1024 : 5 * 1024 * 1024;
    if (!validType || media.size > maxSize) return NextResponse.json({ error: isVideo ? "الفيديو يجب أن يكون أقل من 20 ميجابايت" : "الصورة يجب أن تكون أقل من 5 ميجابايت" }, { status: 400 });
    const width = Number(form.get("media_width"));
    const height = Number(form.get("media_height"));
    const ratio = width / height;
    const minimumWidth = isVideo ? 720 : 1280;
    const minimumHeight = isVideo ? 405 : 720;
    if (!Number.isFinite(width) || !Number.isFinite(height) || width < minimumWidth || height < minimumHeight || Math.abs(ratio - 16 / 9) > 0.03) {
      return NextResponse.json({ error: isVideo ? "الفيديو يجب أن يكون بنسبة 16:9 وبمقاس لا يقل عن 720×405" : "الصورة يجب أن تكون بنسبة 16:9 وبمقاس لا يقل عن 1280×720" }, { status: 400 });
    }
    const path = `ads/${Date.now()}-${media.name.replace(/[^a-zA-Z0-9._-]/g, "")}`;
    const upload = await client.storage.from("item-images").upload(path, media, { contentType: media.type, upsert: false });
    if (upload.error) return NextResponse.json({ error: upload.error.message }, { status: 400 });
    const publicUrl = client.storage.from("item-images").getPublicUrl(path).data.publicUrl;
    if (isVideo) videoUrl = publicUrl;
    else imageUrl = publicUrl;
  }
  if (["image", "text_image"].includes(mediaType) && !imageUrl) return NextResponse.json({ error: "أرفق صورة للإعلان" }, { status: 400 });
  if (mediaType === "video" && !videoUrl) return NextResponse.json({ error: "أرفق فيديو قصير للإعلان" }, { status: 400 });
  const { data, error } = await client.from("advertisements").insert({ advertiser_name: user.display_name, phone: user.phone, title, description, media_type: mediaType, image_url: imageUrl, video_url: videoUrl, target_url: targetUrl || null, whatsapp, package_id: packageData.id, duration_days: packageData.duration_days, price: packageData.price, payment_status: packageData.price > 0 ? "قيد الانتظار" : "غير مطلوب" }).select("id,status,admin_note").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}