import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminRole } from "@/lib/admin-auth";

function database() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
}

export async function GET(request: NextRequest) {
  if (await getAdminRole(request) !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const client = database();
  if (!client) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const { data, error } = await client.from("ad_reward_ledger").select("id,user_id,campaign_id,action_id,status,points,amount,reason,created_at,market_users(display_name,phone),ad_reward_campaigns(name)").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rewards: data || [] });
}

export async function PATCH(request: NextRequest) {
  if (await getAdminRole(request) !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const id = Number(body.id);
  const status = ["pending", "approved", "rejected"].includes(body.status) ? body.status : null;
  if (!Number.isInteger(id) || !status) return NextResponse.json({ error: "بيانات المكافأة غير صحيحة" }, { status: 400 });
  const client = database();
  if (!client) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  if (status === "approved") {
    const { data: reward, error: readError } = await client
      .from("ad_reward_ledger")
      .select("ad_reward_campaigns(status,reward_mode,budget),ad_reward_actions(reward_amount)")
      .eq("id", id)
      .maybeSingle();
    if (readError) return NextResponse.json({ error: readError.message }, { status: 400 });
    const campaign = Array.isArray(reward?.ad_reward_campaigns) ? reward.ad_reward_campaigns[0] : reward?.ad_reward_campaigns;
    const action = Array.isArray(reward?.ad_reward_actions) ? reward.ad_reward_actions[0] : reward?.ad_reward_actions;
    if (campaign?.status === "active" && campaign.reward_mode === "cash" && Number(campaign.budget) > 0 && Number(action?.reward_amount) === 0) {
      return NextResponse.json({ error: "تُعتمد مكافأة التقسيم بعد انتهاء الحملة وتسوية الأنصبة" }, { status: 400 });
    }
  }
  const update = status === "approved" ? { status, approved_at: new Date().toISOString() } : status === "rejected" ? { status, rejected_at: new Date().toISOString() } : { status, approved_at: null, rejected_at: null };
  const { error } = await client.from("ad_reward_ledger").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
