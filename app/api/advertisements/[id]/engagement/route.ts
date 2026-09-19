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
  const eventType = ["view", "click", "like", "share"].includes(body.event_type) ? body.event_type : null;
  const visitorKey = typeof body.visitor_key === "string" ? body.visitor_key.trim().slice(0, 100) : "";
  if (!Number.isInteger(advertisementId) || !eventType || visitorKey.length < 16) return NextResponse.json({ error: "بيانات التفاعل غير صحيحة" }, { status: 400 });
  const rewardsEvent = eventType === "like" || eventType === "share";
  const user = rewardsEvent ? await getMarketUser(request) : null;
  if (rewardsEvent && user?.account_type !== "ordinary") {
    return NextResponse.json({ error: "يجب إنشاء حساب مكافآت حتى تستفيد من التفاعل وجني الأرباح." }, { status: 401 });
  }
  const { error: insertError } = eventType === "share"
    ? { error: null }
    : await client.from("advertisement_engagements").insert({ advertisement_id: advertisementId, event_type: eventType, visitor_key: visitorKey });
  let counted = !insertError;
  if (insertError?.code !== "23505" && insertError) return NextResponse.json({ error: insertError.message }, { status: 400 });
  const field = eventType === "view" ? "views" : eventType === "click" ? "clicks" : null;
  if (field && counted) {
    const { data: current } = await client.from("advertisements").select("views,clicks").eq("id", advertisementId).maybeSingle();
    const currentValue = field === "views" ? current?.views : current?.clicks;
    await client.from("advertisements").update({ [field]: Number(currentValue || 0) + 1 }).eq("id", advertisementId);
  }
  let rewardStatus: string | null = null;
  if (rewardsEvent && user) {
      const now = new Date().toISOString();
      const { data: campaign } = await client.from("ad_reward_campaigns").select("id,budget,max_recipients,per_user_limit").eq("advertisement_id", advertisementId).eq("status", "active").or(`starts_at.is.null,starts_at.lte.${now}`).or(`ends_at.is.null,ends_at.gte.${now}`).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (campaign) {
        const { data: action } = await client.from("ad_reward_actions").select("id,reward_points,reward_amount,max_rewards").eq("campaign_id", campaign.id).eq("action_type", eventType).eq("enabled", true).maybeSingle();
        if (action) {
          const actionKey = `${eventType}:${campaign.id}:${user.id}:${advertisementId}`;
          const { data: existingReward } = await client.from("ad_reward_ledger").select("status").eq("action_key", actionKey).maybeSingle();
          if (existingReward) {
            counted = false;
            rewardStatus = existingReward.status;
          } else {
            const { count } = await client.from("ad_reward_ledger").select("id", { count: "exact", head: true }).eq("campaign_id", campaign.id).in("status", ["pending", "approved"]);
            const { count: userRewardCount } = await client.from("ad_reward_ledger").select("id", { count: "exact", head: true }).eq("campaign_id", campaign.id).eq("user_id", user.id).in("status", ["pending", "approved"]);
            const withinUserLimit = Number(userRewardCount || 0) < Number(campaign.per_user_limit || 1);
            const withinActionLimit = action.max_rewards === null || Number(count || 0) < Number(action.max_rewards);
            const withinCampaignLimit = campaign.max_recipients === null || Number(count || 0) < Number(campaign.max_recipients);
            if (withinUserLimit && withinActionLimit && withinCampaignLimit) {
            const { data: existingRewards } = await client.from("ad_reward_ledger").select("amount").eq("campaign_id", campaign.id).in("status", ["pending", "approved"]);
            const spent = (existingRewards || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
            const amount = Number(action.reward_amount || 0);
            if (!campaign.budget || spent + amount <= Number(campaign.budget)) {
                const points = Number(action.reward_points || 0);
                const reason = eventType === "like" ? "إعجاب داخل صفحة الإعلان" : "مشاركة الإعلان";
                const { error: rewardError } = await client.from("ad_reward_ledger").insert({ user_id: user.id, campaign_id: campaign.id, action_id: action.id, status: "pending", points, amount, reason, action_key: actionKey });
                if (rewardError?.code !== "23505" && rewardError) return NextResponse.json({ error: rewardError.message }, { status: 400 });
                rewardStatus = "pending";
              } else {
                rewardStatus = "budget_limit";
              }
            } else {
              rewardStatus = "limit_reached";
            }
          }
        }
      }
  }
  const { data } = await client.from("advertisements").select("views,clicks").eq("id", advertisementId).maybeSingle();
  const { count: likes } = await client.from("advertisement_engagements").select("id", { count: "exact", head: true }).eq("advertisement_id", advertisementId).eq("event_type", "like");
  const { count: visitorLikes } = await client.from("advertisement_engagements").select("id", { count: "exact", head: true }).eq("advertisement_id", advertisementId).eq("event_type", "like").eq("visitor_key", visitorKey);
  return NextResponse.json({ counted, liked: Number(visitorLikes || 0) > 0, likes: likes || 0, views: data?.views || 0, clicks: data?.clicks || 0, reward_status: rewardStatus });
}