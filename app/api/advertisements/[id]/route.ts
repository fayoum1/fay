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
  const [{ count: likes }, { count: referrals }] = await Promise.all([
    client.from("advertisement_engagements").select("id", { count: "exact", head: true }).eq("advertisement_id", id).eq("event_type", "like"),
    client.from("ad_referrals").select("id,ad_reward_campaigns!inner(advertisement_id)", { count: "exact", head: true }).eq("ad_reward_campaigns.advertisement_id", id),
  ]);
  const { data: advertiserProfile } = await client.from("market_users").select("id,display_name,phone,role,account_type,profile_image_url,cover_image_url,referral_code").eq("phone", data.phone).eq("account_type", "market").maybeSingle();
  const { data: rewardCampaign } = await client
    .from("ad_reward_campaigns")
    .select("id,reward_mode,budget,max_recipients,per_user_limit,ad_reward_actions(id,action_type,reward_points,reward_amount,reward_label,required_seconds,max_rewards,enabled)")
    .eq("advertisement_id", id)
    .eq("status", "active")
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
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
  const rewardActions = (rewardCampaign?.ad_reward_actions || []).filter((action) => action.enabled);
  const viewAction = rewardActions.find((action) => action.action_type === "view");
  const watchRequiredSeconds = Number(viewAction?.required_seconds || 0);
  const primaryAction = rewardActions[0];
  const rewardAmount = Number(primaryAction?.reward_amount || 0);
  const rewardPoints = Number(primaryAction?.reward_points || 0);
  const rewardBadge = rewardCampaign?.reward_mode === "cash"
    ? `مكافأة نقدية = ${rewardAmount > 0 ? rewardAmount : Number(rewardCampaign.budget || 0)} جنيه`
    : rewardCampaign?.reward_mode === "discount"
      ? primaryAction?.reward_label || "مكافأة خصم"
      : rewardCampaign?.reward_mode === "gift"
        ? primaryAction?.reward_label || "مكافأة هدية"
        : rewardPoints > 0 ? `مكافأة = ${rewardPoints} نقطة` : "مكافأة متاحة";
  const publicRewardCampaign = rewardCampaign ? {
    reward_mode: rewardCampaign.reward_mode,
    reward_badge: rewardBadge,
    max_recipients: rewardCampaign.max_recipients,
    per_user_limit: rewardCampaign.per_user_limit,
    payout_mode: rewardCampaign.reward_mode === "cash" && rewardActions.some((action) => Number(action.reward_amount) === 0) ? "pool" : "fixed",
    actions: rewardActions.map((action) => ({ action_type: action.action_type, required_seconds: action.required_seconds, max_rewards: action.max_rewards })),
  } : null;
  return NextResponse.json({ ...data, advertiser_profile: advertiserProfile || null, likes: likes || 0, referrals: referrals || 0, reward_campaign: publicRewardCampaign, watch_required_seconds: watchRequiredSeconds || null, other_ads: otherAds || [] });
}