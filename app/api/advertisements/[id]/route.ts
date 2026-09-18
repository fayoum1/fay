import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function database() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const client = database();
  if (!client) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "الإعلان غير صحيح" }, { status: 400 });
  const now = new Date().toISOString();
  const { data, error } = await client
    .from("advertisements")
    .select("id,advertiser_name,phone,title,description,media_type,image_url,video_url,target_url,whatsapp,featured,starts_at,ends_at,views,clicks")
    .eq("id", id)
    .eq("status", "مقبول")
    .in("payment_status", ["غير مطلوب", "تم الدفع"])
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "الإعلان غير متاح" }, { status: 404 });
  const { count: likes } = await client.from("advertisement_engagements").select("id", { count: "exact", head: true }).eq("advertisement_id", id).eq("event_type", "like");
  const { data: otherAds } = await client
    .from("advertisements")
    .select("id,advertiser_name,title,description,media_type,image_url,video_url,target_url,whatsapp")
    .eq("advertiser_name", data.advertiser_name)
    .eq("status", "مقبول")
    .in("payment_status", ["غير مطلوب", "تم الدفع"])
    .neq("id", id)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order("created_at", { ascending: false });
  return NextResponse.json({ ...data, likes: likes || 0, other_ads: otherAds || [] });
}