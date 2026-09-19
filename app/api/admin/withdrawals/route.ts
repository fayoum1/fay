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
  const { data, error } = await client.from("reward_withdrawals").select("id,user_id,amount,wallet_number,status,admin_note,created_at,reviewed_at,paid_at,market_users(display_name,phone)").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ withdrawals: data || [] });
}

export async function PATCH(request: NextRequest) {
  if (await getAdminRole(request) !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const client = database();
  if (!client) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const id = Number(body.id);
  const status = ["approved", "paid", "rejected"].includes(body.status) ? body.status : null;
  if (!Number.isInteger(id) || !status) return NextResponse.json({ error: "بيانات طلب السحب غير صحيحة" }, { status: 400 });
  const now = new Date().toISOString();
  const update = {
    status,
    admin_note: String(body.admin_note || "").trim().slice(0, 300) || null,
    reviewed_at: now,
    ...(status === "paid" ? { paid_at: now } : { paid_at: null }),
  };
  const { error } = await client.from("reward_withdrawals").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}