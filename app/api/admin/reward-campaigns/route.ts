import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminRole } from "@/lib/admin-auth";
import { settleExpiredRewardCampaigns, settleRewardCampaign } from "@/lib/reward-settlement";
import { getRewardCampaignStats } from "@/lib/reward-campaign-stats";

function database() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
}

const rewardModes = ["points", "discount", "gift", "cash"];
const campaignStatuses = ["draft", "active", "paused", "completed", "closed"];
const actionTypes = ["referral", "view", "like", "share"];

export async function GET(request: NextRequest) {
  if (await getAdminRole(request) !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const client = database();
  if (!client) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  try {
    await settleExpiredRewardCampaigns(client);
  } catch (reason) {
    return NextResponse.json({ error: reason instanceof Error ? reason.message : "تعذر تسوية الحملات المنتهية" }, { status: 500 });
  }
  const [{ data: campaigns, error }, { data: advertisements, error: adsError }] = await Promise.all([
    client.from("ad_reward_campaigns").select("*, advertisements(id,title), ad_reward_actions(id,action_type,reward_points,reward_amount,reward_label,required_seconds,max_rewards,enabled)").order("created_at", { ascending: false }),
    client.from("advertisements").select("id,title").order("created_at", { ascending: false }),
  ]);
  if (error || adsError) return NextResponse.json({ error: error?.message || adsError?.message }, { status: 500 });
  try {
    const campaignStats = await getRewardCampaignStats(client, (campaigns || []).map((campaign) => campaign.id));
    return NextResponse.json({
      campaigns: (campaigns || []).map((campaign) => ({
        ...campaign,
        stats: campaignStats.get(campaign.id),
      })),
      advertisements: advertisements || [],
    });
  } catch (reason) {
    return NextResponse.json({ error: reason instanceof Error ? reason.message : "تعذر حساب إحصاءات الحملات" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (await getAdminRole(request) !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const id = Number(body.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "الحملة غير صحيحة" }, { status: 400 });
  const update = {
    ...(typeof body.name === "string" ? { name: body.name.trim().slice(0, 100) } : {}),
    ...(rewardModes.includes(body.reward_mode) ? { reward_mode: body.reward_mode } : {}),
    ...(Number.isFinite(Number(body.budget)) && Number(body.budget) >= 0 ? { budget: Number(body.budget) } : {}),
    ...(body.max_recipients === null || body.max_recipients === "" ? { max_recipients: null } : Number.isInteger(Number(body.max_recipients)) && Number(body.max_recipients) > 0 ? { max_recipients: Number(body.max_recipients) } : {}),
    ...(Number.isInteger(Number(body.per_user_limit)) && Number(body.per_user_limit) > 0 ? { per_user_limit: Number(body.per_user_limit) } : {}),
    ...(campaignStatuses.includes(body.status) ? { status: body.status } : {}),
  };
  if (!Object.keys(update).length) return NextResponse.json({ error: "لا توجد تعديلات" }, { status: 400 });
  const client = database();
  if (!client) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  if (["completed", "closed"].includes(body.status)) {
    try {
      await settleRewardCampaign(client, id);
    } catch (reason) {
      return NextResponse.json({ error: reason instanceof Error ? reason.message : "تعذر تقسيم ميزانية الحملة" }, { status: 400 });
    }
  }
  const { data, error } = await client.from("ad_reward_campaigns").update(update).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (["completed", "closed"].includes(body.status)) {
    const { error: advertisementError } = await client
      .from("advertisements")
      .update({ status: "منتهي", featured: false, ends_at: new Date().toISOString() })
      .eq("id", data.advertisement_id);
    if (advertisementError) return NextResponse.json({ error: advertisementError.message }, { status: 400 });
  }
  return NextResponse.json(data);
}

export async function PUT(request: NextRequest) {
  if (await getAdminRole(request) !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const campaignId = Number(body.campaign_id);
  const actionType = String(body.action_type || "");
  const rewardPoints = Number(body.reward_points || 0);
  const rewardAmount = Number(body.reward_amount || 0);
  const requiredSeconds = body.required_seconds === "" || body.required_seconds == null ? null : Number(body.required_seconds);
  const maxRewards = body.max_rewards === "" || body.max_rewards == null ? null : Number(body.max_rewards);
  if (!Number.isInteger(campaignId) || !actionTypes.includes(actionType) || !Number.isInteger(rewardPoints) || rewardPoints < 0 || !Number.isFinite(rewardAmount) || rewardAmount < 0) return NextResponse.json({ error: "بيانات الإجراء غير صحيحة" }, { status: 400 });
  const client = database();
  if (!client) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const { data, error } = await client.from("ad_reward_actions").upsert({ campaign_id: campaignId, action_type: actionType, reward_points: rewardPoints, reward_amount: rewardAmount, reward_label: String(body.reward_label || "").trim().slice(0, 120) || null, required_seconds: requiredSeconds, max_rewards: maxRewards, enabled: body.enabled !== false }, { onConflict: "campaign_id,action_type" }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  if (await getAdminRole(request) !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const id = Number(body.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "الحملة غير صحيحة" }, { status: 400 });
  const client = database();
  if (!client) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const { error } = await client.from("ad_reward_campaigns").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
