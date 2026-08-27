import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminRole } from "@/lib/admin-auth";

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
}

export async function GET() {
  const database = client();
  if (!database) return NextResponse.json(null, { status: 204 });
  const { data, error } = await database.from("site_settings").select("*").eq("id", 1).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest) {
  if (getAdminRole(request) !== "admin") return NextResponse.json({ error: "هذه الصلاحية للأدمن فقط" }, { status: 401 });
  const database = client();
  if (!database) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const form = await request.formData();
  const values = { name: String(form.get("name") || "الفيوم للأعلاف والدواجن"), tagline: String(form.get("tagline") || "نظام الطلبات"), branch: String(form.get("branch") || "الفرع الرئيسي"), phone: String(form.get("phone") || ""), secondary_phone: String(form.get("secondary_phone") || "") };
  const image = form.get("logo");
  let logo_url = String(form.get("logo_url") || "") || undefined;
  if (image instanceof File) {
    if (!image.type.startsWith("image/") || image.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Invalid logo" }, { status: 400 });
    const path = `logo-${Date.now()}-${image.name.replace(/[^a-zA-Z0-9._-]/g, "")}`;
    const upload = await database.storage.from("item-images").upload(path, image, { contentType: image.type, upsert: true });
    if (upload.error) return NextResponse.json({ error: upload.error.message }, { status: 400 });
    logo_url = database.storage.from("item-images").getPublicUrl(path).data.publicUrl;
  }
  const { data, error } = await database.from("site_settings").upsert({ id: 1, ...values, logo_url }, { onConflict: "id" }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
