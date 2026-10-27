import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getMarketUser } from "@/lib/market-auth";

type WatchChallenge = {
  advertisementId: number;
  campaignId: number;
  userId: number;
  startedAt: number;
};

function database() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
}

function watchCookieName(advertisementId: number) {
  return `ad_watch_${advertisementId}`;
}

function signChallenge(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function readChallenge(
  request: NextRequest,
  advertisementId: number,
  secret: string,
): WatchChallenge | null {
  const value = request.cookies.get(watchCookieName(advertisementId))?.value;
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;

  const expected = Buffer.from(signChallenge(payload, secret));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return null;
  }

  try {
    const challenge = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as WatchChallenge;
    if (
      challenge.advertisementId !== advertisementId ||
      !Number.isInteger(challenge.campaignId) ||
      !Number.isInteger(challenge.userId) ||
      !Number.isFinite(challenge.startedAt)
    ) {
      return null;
    }
    return challenge;
  } catch {
    return null;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getMarketUser(request);
  if (user?.account_type !== "ordinary") {
    return NextResponse.json(
      { counted: false, reason: "rewards_account_required" },
      { status: 401 },
    );
  }

  const client = database();
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!client || !secret) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const advertisementId = Number((await params).id);
  const body = await request.json().catch(() => ({}));
  if (
    !Number.isInteger(advertisementId) ||
    !["start", "complete"].includes(body.phase)
  ) {
    return NextResponse.json({ error: "بيانات المشاهدة غير صحيحة" }, { status: 400 });
  }

  const now = new Date();
  const { data: advertisement, error: advertisementError } = await client
    .from("advertisements")
    .select("id,media_type")
    .eq("id", advertisementId)
    .eq("status", "مقبول")
    .in("payment_status", ["غير مطلوب", "تم الدفع"])
    .maybeSingle();
  if (advertisementError) {
    return NextResponse.json({ error: advertisementError.message }, { status: 500 });
  }
  if (!advertisement || advertisement.media_type !== "video") {
    return NextResponse.json({ counted: false, reason: "video_only" });
  }

  const { data: campaign, error: campaignError } = await client
    .from("ad_reward_campaigns")
    .select("id,budget,max_recipients,per_user_limit")
    .eq("advertisement_id", advertisementId)
    .eq("status", "active")
    .or(`starts_at.is.null,starts_at.lte.${now.toISOString()}`)
    .or(`ends_at.is.null,ends_at.gte.${now.toISOString()}`)
    .maybeSingle();
  if (campaignError) {
    return NextResponse.json({ error: campaignError.message }, { status: 500 });
  }
  if (!campaign) {
    return NextResponse.json({ counted: false, reason: "no_active_campaign" });
  }

  const { data: action, error: actionError } = await client
    .from("ad_reward_actions")
    .select("id,reward_points,reward_amount,required_seconds,max_rewards")
    .eq("campaign_id", campaign.id)
    .eq("action_type", "view")
    .eq("enabled", true)
    .maybeSingle();
  if (actionError) {
    return NextResponse.json({ error: actionError.message }, { status: 500 });
  }
  if (!action) {
    return NextResponse.json({ counted: false, reason: "no_view_reward" });
  }

  const requiredSeconds = Number(action.required_seconds || 30);
  if (!Number.isFinite(requiredSeconds) || requiredSeconds < 1 || requiredSeconds > 86400) {
    return NextResponse.json({ error: "إعداد مدة المشاهدة غير صالح" }, { status: 500 });
  }

  const cookieName = watchCookieName(advertisementId);
  const existingChallenge = readChallenge(request, advertisementId, secret);
  if (body.phase === "start") {
    const challenge =
      existingChallenge?.campaignId === campaign.id &&
      existingChallenge?.userId === user.id
        ? existingChallenge
        : {
            advertisementId,
            campaignId: campaign.id,
            userId: user.id,
            startedAt: Date.now(),
          };
    const payload = Buffer.from(JSON.stringify(challenge)).toString("base64url");
    const token = `${payload}.${signChallenge(payload, secret)}`;
    const response = NextResponse.json({
      started: true,
      required_seconds: requiredSeconds,
    });
    response.cookies.set(cookieName, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: requiredSeconds + 300,
      path: `/api/advertisements/${advertisementId}/watch`,
    });
    return response;
  }

  if (
    !existingChallenge ||
    existingChallenge.campaignId !== campaign.id ||
    existingChallenge.userId !== user.id
  ) {
    return NextResponse.json(
      { counted: false, reason: "watch_not_started" },
      { status: 409 },
    );
  }

  const elapsedSeconds = Math.floor((Date.now() - existingChallenge.startedAt) / 1000);
  if (elapsedSeconds < requiredSeconds) {
    return NextResponse.json(
      {
        counted: false,
        reason: "watch_more",
        retry_after_seconds: requiredSeconds - elapsedSeconds,
      },
      { status: 425 },
    );
  }

  const actionKey = `view:${campaign.id}:${user.id}:${advertisementId}`;
  const { data: existingReward, error: rewardReadError } = await client
    .from("ad_reward_ledger")
    .select("id,status")
    .eq("action_key", actionKey)
    .maybeSingle();
  if (rewardReadError) {
    return NextResponse.json({ error: rewardReadError.message }, { status: 500 });
  }
  if (existingReward) {
    const response = NextResponse.json({
      counted: false,
      repeated: true,
      status: existingReward.status,
    });
    response.cookies.set(cookieName, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
      path: `/api/advertisements/${advertisementId}/watch`,
    });
    return response;
  }

  const { count, error: countError } = await client
    .from("ad_reward_ledger")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaign.id)
    .in("status", ["pending", "approved"]);
  const { count: userRewardCount, error: userCountError } = await client
    .from("ad_reward_ledger")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaign.id)
    .eq("user_id", user.id)
    .in("status", ["pending", "approved"]);
  if (countError || userCountError) {
    return NextResponse.json(
      { error: countError?.message || userCountError?.message },
      { status: 500 },
    );
  }
  if (Number(userRewardCount || 0) >= Number(campaign.per_user_limit || 1)) {
    return NextResponse.json({ counted: false, reason: "user_limit" });
  }
  if (action.max_rewards !== null && Number(count || 0) >= Number(action.max_rewards)) {
    return NextResponse.json({ counted: false, reason: "action_limit" });
  }
  if (
    campaign.max_recipients !== null &&
    Number(count || 0) >= Number(campaign.max_recipients)
  ) {
    return NextResponse.json({ counted: false, reason: "campaign_limit" });
  }

  const { data: rewards, error: rewardsError } = await client
    .from("ad_reward_ledger")
    .select("amount")
    .eq("campaign_id", campaign.id)
    .in("status", ["pending", "approved"]);
  if (rewardsError) {
    return NextResponse.json({ error: rewardsError.message }, { status: 500 });
  }
  const spent = (rewards || []).reduce((sum, reward) => sum + Number(reward.amount || 0), 0);
  const amount = Number(action.reward_amount || 0);
  if (Number(campaign.budget || 0) > 0 && spent + amount > Number(campaign.budget)) {
    return NextResponse.json({ counted: false, reason: "budget_limit" });
  }

  const { error: insertError } = await client.from("ad_reward_ledger").insert({
    user_id: user.id,
    campaign_id: campaign.id,
    action_id: action.id,
    status: "pending",
    points: Number(action.reward_points || 0),
    amount,
    reason: `مشاهدة فيديو لمدة ${requiredSeconds} ثانية`,
    action_key: actionKey,
  });
  if (insertError?.code === "23505") {
    return NextResponse.json({ counted: false, repeated: true });
  }
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  const response = NextResponse.json({
    counted: true,
    status: "pending",
    required_seconds: requiredSeconds,
  });
  response.cookies.set(cookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: `/api/advertisements/${advertisementId}/watch`,
  });
  return response;
}
