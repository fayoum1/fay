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
  if (eventType === "like") {
    const user = await getMarketUser(request);
    if (user) {
      const now = new Date().toISOString();
      const { data: campaign } = await client.from("ad_reward_campaigns").select("id,budget,max_recipients,per_user_limit").eq("advertisement_id", advertisementId).eq("status", "active").or(`starts_at.is.null,starts_at.lte.${now}`).or(`ends_at.is.null,ends_at.gte.${now}`).maybeSingle();
      if (campaign) {
        const { data: action } = await client.from("ad_reward_actions").select("id,reward_points,reward_amount,max_rewards").eq("campaign_id", campaign.id).eq("action_type", "like").eq("enabled", true).maybeSingle();
        if (action) {
          const { count } = await client.from("ad_reward_ledger").select("id", { count: "exact", head: true }).eq("campaign_id", campaign.id).eq("user_id", user.id).in("status", ["pending", "approved"]);
          const { count: userRewardCount } = await client.from("ad_reward_ledger").select("id", { count: "exact", head: true }).eq("campaign_id", campaign.id).eq("user_id", user.id).in("status", ["pending", "approved"]);
          if (Number(userRewardCount || 0) < Number(campaign.per_user_limit || 1) && (!action.max_rewards || Number(count || 0) < Number(action.max_rewards))) {
            const { data: existingRewards } = await client.from("ad_reward_ledger").select("amount").eq("campaign_id", campaign.id).in("status", ["pending", "approved"]);
            const spent = (existingRewards || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
            const amount = Number(action.reward_amount || 0);
            if (!campaign.budget || spent + amount <= Number(campaign.budget)) {
              await client.from("ad_reward_ledger").insert({ user_id: user.id, campaign_id: campaign.id, action_id: action.id, status: "pending", points: Number(action.reward_points || 0), amount, reason: "إعجاب داخل صفحة الإعلان", action_key: `like:${campaign.id}:${user.id}:${advertisementId}` });
            }
          }
        }
      }
    }
  }
  const { data } = await client.from("advertisements").select("views,clicks").eq("id", advertisementId).maybeSingle();
  return NextResponse.json({ counted: true, liked: eventType === "like", views: data?.views || 0, clicks: data?.clicks || 0 });
}