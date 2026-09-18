import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function database() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const client = database();
  if (!client) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const advertisementId = Number((await params).id);
  const body = await request.json().catch(() => ({}));
  const eventType = ["view", "click", "like"].includes(body.event_type) ? body.event_type : null;
  const visitorKey = typeof body.visitor_key === "string" ? body.visitor_key.trim().slice(0, 100) : "";
  if (!Number.isInteger(advertisementId) || !eventType || visitorKey.length < 16) return NextResponse.json({ error: "بيانات التفاعل غير صحيحة" }, { status: 400 });
  const { error: insertError } = await client.from("advertisement_engagements").insert({ advertisement_id: advertisementId, event_type: eventType, visitor_key: visitorKey });
  if (insertError?.code === "23505") {
    const { data } = await client.from("advertisements").select("views,clicks").eq("id", advertisementId).maybeSingle();
    return NextResponse.json({ counted: false, liked: eventType === "like", views: data?.views || 0, clicks: data?.clicks || 0 });
  }
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 });
  const field = eventType === "view" ? "views" : eventType === "click" ? "clicks" : null;
  if (field) {
    const { data: current } = await client.from("advertisements").select("views,clicks").eq("id", advertisementId).maybeSingle();
    const currentValue = field === "views" ? current?.views : current?.clicks;
    await client.from("advertisements").update({ [field]: Number(currentValue || 0) + 1 }).eq("id", advertisementId);
  }
  const { data } = await client.from("advertisements").select("views,clicks").eq("id", advertisementId).maybeSingle();
  return NextResponse.json({ counted: true, liked: eventType === "like", views: data?.views || 0, clicks: data?.clicks || 0 });
}