import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { authenticateMarketUser, getMarketUser, hashMarketPassword, marketDatabase, MARKET_COOKIE, normalizeMarketPhone } from "@/lib/market-auth";

export async function GET(request: NextRequest) {
  const user = await getMarketUser(request);
  if (!user) return NextResponse.json({ authenticated: false }, { status: 401 });
  const client = marketDatabase();
  if (!client) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const { data, error } = await client.from("seller_offers").select("id,item_name,quantity,price,image_url,status,admin_note,visibility,created_at").eq("user_id", user.id).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { data: rewards } = await client.from("ad_reward_ledger").select("id,campaign_id,status,points,amount,reason,created_at").eq("user_id", user.id).order("created_at", { ascending: false });
  const rewardRows = rewards || [];
  const rewardSummary = rewardRows.reduce((summary, reward) => {
    if (reward.status === "approved") { summary.points += Number(reward.points || 0); summary.amount += Number(reward.amount || 0); }
    if (reward.status === "pending") summary.pending += 1;
    return summary;
  }, { points: 0, amount: 0, pending: 0 });
  return NextResponse.json({ user: { display_name: user.display_name, phone: user.phone, role: user.role, receive_offers: user.receive_offers, referral_code: user.referral_code }, offers: data || [], rewards: rewardRows, reward_summary: rewardSummary });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const phone = normalizeMarketPhone(String(body.phone || ""));
  const password = String(body.password || "");
  if (!/^01[0125]\d{8}$/.test(phone) || password.length < 4) return NextResponse.json({ error: "رقم الهاتف أو كلمة السر غير صحيحة" }, { status: 400 });
  const client = marketDatabase();
  if (!client) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  if (body.action === "register") {
    const name = String(body.display_name || "").trim().slice(0, 100);
    const role = ["farm_owner", "trader", "supplier"].includes(body.role) ? body.role : "supplier";
    if (!name) return NextResponse.json({ error: "اكتب الاسم أو اسم النشاط" }, { status: 400 });
    const referralCode = randomBytes(8).toString("hex");
    const { data, error } = await client.from("market_users").insert({ display_name: name, phone, password_hash: hashMarketPassword(password), role, referral_code: referralCode, receive_offers: role === "trader" && body.receive_offers !== false }).select("id,display_name,phone,password_hash,role,receive_offers,referral_code").single();
    if (error) return NextResponse.json({ error: error.code === "23505" ? "هذا الرقم مسجل بالفعل" : error.message }, { status: 400 });
    const identity = await authenticateMarketUser(phone, password);
    if (!identity) return NextResponse.json({ error: "تعذر إنشاء جلسة الحساب" }, { status: 500 });
    const response = NextResponse.json({ authenticated: true, user: { display_name: data.display_name, phone: data.phone, role: data.role, receive_offers: data.receive_offers, referral_code: data.referral_code } }, { status: 201 });
    response.cookies.set(MARKET_COOKIE, identity.token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 30, path: "/" });
    return response;
  }
  const identity = await authenticateMarketUser(phone, password);
  if (!identity) return NextResponse.json({ error: "رقم الهاتف أو كلمة السر غير صحيحة" }, { status: 401 });
  const response = NextResponse.json({ authenticated: true, user: { display_name: identity.display_name, phone: identity.phone, role: identity.role, receive_offers: identity.receive_offers, referral_code: identity.referral_code } });
  response.cookies.set(MARKET_COOKIE, identity.token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 30, path: "/" });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(MARKET_COOKIE, "", { httpOnly: true, expires: new Date(0), path: "/" });
  return response;
}