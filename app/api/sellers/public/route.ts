import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getMarketUser } from "@/lib/market-auth";

function database() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
}

function digits(value: string) {
  return value.replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))).replace(/\D/g, "");
}

export async function GET() {
  const client = database();
  if (!client) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const [{ data: items, error: itemsError }, { data: stats, error: statsError }] = await Promise.all([
    client.from("items").select("id,name,category").eq("active", true).order("name"),
    client.from("seller_page_stats").select("visitor_count,submission_count").eq("id", 1).maybeSingle(),
  ]);
  if (itemsError || statsError) return NextResponse.json({ error: itemsError?.message || statsError?.message }, { status: 500 });
  return NextResponse.json({ items: items || [], stats: stats || { visitor_count: 0, submission_count: 0 } });
}

export async function POST(request: NextRequest) {
  const client = database();
  if (!client) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const user = await getMarketUser(request);
  if (!user) return NextResponse.json({ error: "سجل الدخول أولًا لحفظ العرض ومتابعة حالته" }, { status: 401 });
  const form = await request.formData();
  const sellerName = String(form.get("seller_name") || "").trim().slice(0, 100);
  const phone = digits(String(form.get("phone") || "")).slice(0, 15);
  const address = String(form.get("address") || "").trim().slice(0, 240);
  const itemName = String(form.get("item_name") || "").trim().slice(0, 120);
  const quantity = Number(form.get("quantity"));
  const ageOrWeight = String(form.get("age_or_weight") || "").trim().slice(0, 80);
  const price = Number(form.get("price"));
  const visibility = ["admin_only", "selected_traders", "all_traders"].includes(String(form.get("visibility")))
    ? String(form.get("visibility"))
    : "admin_only";
  if (!sellerName || !address || !itemName) return NextResponse.json({ error: "أكمل الاسم والعنوان والصنف" }, { status: 400 });
  if (phone.length < 8) return NextResponse.json({ error: "اكتب رقم هاتف صحيح" }, { status: 400 });
  if (!Number.isInteger(quantity) || quantity < 1) return NextResponse.json({ error: "اكتب عددًا صحيحًا أكبر من صفر" }, { status: 400 });
  if (!Number.isFinite(price) || price < 0) return NextResponse.json({ error: "اكتب سعرًا صحيحًا" }, { status: 400 });

  let imageUrl: string | null = null;
  const image = form.get("image");
  if (image instanceof File && image.size) {
    if (!image.type.startsWith("image/") || image.size > 5 * 1024 * 1024) return NextResponse.json({ error: "الصورة يجب أن تكون أقل من 5 ميجابايت" }, { status: 400 });
    const path = `offers/${Date.now()}-${Math.random().toString(36).slice(2)}-${image.name.replace(/[^a-zA-Z0-9._-]/g, "")}`;
    const upload = await client.storage.from("seller-images").upload(path, image, { contentType: image.type, upsert: false });
    if (upload.error) return NextResponse.json({ error: upload.error.message }, { status: 400 });
    imageUrl = client.storage.from("seller-images").getPublicUrl(path).data.publicUrl;
  }
  const { error } = await client.from("seller_offers").insert({ user_id: user.id, seller_name: sellerName, phone, address, item_name: itemName, quantity, age_or_weight: ageOrWeight || null, price, image_url: imageUrl, visibility, status: "قيد المراجعة" });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await client.rpc("increment_seller_submission_count");
  return NextResponse.json({ success: true }, { status: 201 });
}