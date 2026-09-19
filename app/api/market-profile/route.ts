import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function database() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
}

export async function GET(request: NextRequest) {
  const client = database();
  if (!client) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const code = request.nextUrl.searchParams.get("referral_code")?.trim();
  if (!code) return NextResponse.json({ error: "الملف غير صحيح" }, { status: 400 });
  const { data: user, error } = await client.from("market_users").select("id,display_name,role,account_type,profile_image_url,referral_code").eq("referral_code", code).eq("account_type", "market").eq("active", true).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!user) return NextResponse.json({ error: "ملف المعلن غير متاح" }, { status: 404 });
  const { data: advertisements } = await client.from("advertisements").select("id,title,description,media_type,image_url,video_url,views,clicks").eq("advertiser_name", user.display_name).eq("status", "مقبول").in("payment_status", ["غير مطلوب", "تم الدفع"]).order("created_at", { ascending: false });
  return NextResponse.json({ user, advertisements: advertisements || [] });
}
