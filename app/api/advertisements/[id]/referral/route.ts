import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getMarketUser } from "@/lib/market-auth";

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
  const { data: referral, error } = await client.from("ad_referrals").insert({ campaign_id: campaign.id, referrer_id: referrer.id, visitor_key: visitorKey }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const { data: action } = await client.from("ad_reward_actions").select("id,reward_points,reward_amount,max_rewards").eq("campaign_id", campaign.id).eq("action_type", "referral").eq("enabled", true).maybeSingle();
  if (!action) return NextResponse.json({ counted: true, reward: false });
  const { data: campaignData } = await client.from("ad_reward_campaigns").select("budget,max_recipients,per_user_limit").eq("id", campaign.id).single();
  const { count: recipientCount } = await client.from("ad_reward_ledger").select("id", { count: "exact", head: true }).eq("campaign_id", campaign.id).in("status", ["pending", "approved"]);
  const { data: existingRewards } = await client.from("ad_reward_ledger").select("amount").eq("campaign_id", campaign.id).in("status", ["pending", "approved"]);
  const spent = (existingRewards || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const maxReached = action.max_rewards !== null && Number(recipientCount || 0) >= Number(action.max_rewards);
  const campaignMaxReached = campaignData?.max_recipients !== null && Number(recipientCount || 0) >= Number(campaignData?.max_recipients || 0);
  const amount = Number(action.reward_amount || 0);
  const budgetReached = Number(campaignData?.budget || 0) > 0 && spent + amount > Number(campaignData?.budget || 0);
  if (maxReached || campaignMaxReached || budgetReached) return NextResponse.json({ counted: true, reward: false, reason: "limit_reached" });
  const referredUser = await getMarketUser(request);
  if (referredUser?.id === referrer.id) return NextResponse.json({ counted: true, reward: false, reason: "self_referral" });
  const { error: rewardError } = await client.from("ad_reward_ledger").insert({ user_id: referrer.id, campaign_id: campaign.id, action_id: action.id, referral_id: referral.id, status: "pending", points: Number(action.reward_points || 0), amount, reason: "إحالة زائر جديد من رابط المشاركة", action_key: `referral:${campaign.id}:${referrer.id}:${visitorKey}` });
  if (rewardError && rewardError.code !== "23505") return NextResponse.json({ error: rewardError.message }, { status: 400 });
  return NextResponse.json({ counted: true, reward: !rewardError });
}
