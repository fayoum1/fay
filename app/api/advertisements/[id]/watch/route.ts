import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getMarketUser } from "@/lib/market-auth";

function database() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getMarketUser(request);
  if (!user) return NextResponse.json({ counted: false, reason: "login_required" }, { status: 401 });
  const client = database();
  if (!client) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const advertisementId = Number((await params).id);
  const body = await request.json().catch(() => ({}));
  const watchedSeconds = Number(body.watched_seconds);
  if (!Number.isInteger(advertisementId) || !Number.isFinite(watchedSeconds) || watchedSeconds < 1) return NextResponse.json({ error: "بيانات المشاهدة غير صحيحة" }, { status: 400 });
  const now = new Date().toISOString();
  const { data: advertisement } = await client.from("advertisements").select("id,media_type").eq("id", advertisementId).eq("status", "مقبول").maybeSingle();
  if (!advertisement || advertisement.media_type !== "video") return NextResponse.json({ counted: false, reason: "video_only" });
  const { data: campaign } = await client.from("ad_reward_campaigns").select("id,budget,max_recipients,per_user_limit").eq("advertisement_id", advertisementId).eq("status", "active").or(`starts_at.is.null,starts_at.lte.${now}`).or(`ends_at.is.null,ends_at.gte.${now}`).maybeSingle();
  if (!campaign) return NextResponse.json({ counted: false, reason: "no_active_campaign" });
  const { data: action } = await client.from("ad_reward_actions").select("id,reward_points,reward_amount,required_seconds,max_rewards").eq("campaign_id", campaign.id).eq("action_type", "view").eq("enabled", true).maybeSingle();
  if (!action) return NextResponse.json({ counted: false, reason: "no_view_reward" });
  const requiredSeconds = Number(action.required_seconds || 30);
  if (watchedSeconds < requiredSeconds) return NextResponse.json({ counted: false, reason: "watch_more", required_seconds: requiredSeconds });
  const actionKey = `view:${campaign.id}:${user.id}:${advertisementId}`;
  const { data: existing } = await client.from("ad_reward_ledger").select("id,status").eq("action_key", actionKey).maybeSingle();
  if (existing) return NextResponse.json({ counted: false, repeated: true, status: existing.status });
  const { count } = await client.from("ad_reward_ledger").select("id", { count: "exact", head: true }).eq("campaign_id", campaign.id).in("status", ["pending", "approved"]);
  const { count: userRewardCount } = await client.from("ad_reward_ledger").select("id", { count: "exact", head: true }).eq("campaign_id", campaign.id).eq("user_id", user.id).in("status", ["pending", "approved"]);
  if (Number(userRewardCount || 0) >= Number(campaign.per_user_limit || 1)) return NextResponse.json({ counted: false, reason: "user_limit" });
  if (action.max_rewards !== null && Number(count || 0) >= Number(action.max_rewards)) return NextResponse.json({ counted: false, reason: "action_limit" });
  if (campaign.max_recipients !== null && Number(count || 0) >= Number(campaign.max_recipients)) return NextResponse.json({ counted: false, reason: "campaign_limit" });
  const { data: rewards } = await client.from("ad_reward_ledger").select("amount").eq("campaign_id", campaign.id).in("status", ["pending", "approved"]);
  const spent = (rewards || []).reduce((sum, reward) => sum + Number(reward.amount || 0), 0);
  const amount = Number(action.reward_amount || 0);
  if (Number(campaign.budget || 0) > 0 && spent + amount > Number(campaign.budget)) return NextResponse.json({ counted: false, reason: "budget_limit" });
  const { error } = await client.from("ad_reward_ledger").insert({ user_id: user.id, campaign_id: campaign.id, action_id: action.id, status: "pending", points: Number(action.reward_points || 0), amount, reason: `مشاهدة فيديو لمدة ${requiredSeconds} ثانية`, action_key: actionKey });
  if (error?.code === "23505") return NextResponse.json({ counted: false, repeated: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ counted: true, status: "pending", required_seconds: requiredSeconds });
}
