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
  const referralCode = typeof body.referral_code === "string" ? body.referral_code.trim().slice(0, 40) : "";
  const visitorKey = typeof body.visitor_key === "string" ? body.visitor_key.trim().slice(0, 100) : "";
  if (!Number.isInteger(advertisementId) || referralCode.length < 8 || visitorKey.length < 16) return NextResponse.json({ error: "بيانات الإحالة غير صحيحة" }, { status: 400 });
  const now = new Date().toISOString();
  const { data: campaign } = await client.from("ad_reward_campaigns").select("id").eq("advertisement_id", advertisementId).eq("status", "active").or(`starts_at.is.null,starts_at.lte.${now}`).or(`ends_at.is.null,ends_at.gte.${now}`).maybeSingle();
  if (!campaign) return NextResponse.json({ counted: false, reason: "no_active_campaign" });
  const { data: referrer } = await client.from("market_users").select("id").eq("referral_code", referralCode).eq("active", true).maybeSingle();
  if (!referrer) return NextResponse.json({ counted: false, reason: "unknown_referrer" });
  const { data: existing } = await client.from("ad_referrals").select("id,landing_count").eq("campaign_id", campaign.id).eq("referrer_id", referrer.id).eq("visitor_key", visitorKey).maybeSingle();
  if (existing) {
    await client.from("ad_referrals").update({ landing_count: Number(existing.landing_count || 1) + 1 }).eq("id", existing.id);
    return NextResponse.json({ counted: false, repeated: true });
  }
  const { error } = await client.from("ad_referrals").insert({ campaign_id: campaign.id, referrer_id: referrer.id, visitor_key: visitorKey });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ counted: true });
}
