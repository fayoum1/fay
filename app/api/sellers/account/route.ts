import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { authenticateMarketUser, getMarketUser, hashMarketPassword, marketDatabase, MARKET_COOKIE, normalizeMarketPhone } from "@/lib/market-auth";
import { settleExpiredRewardCampaigns } from "@/lib/reward-settlement";

export async function GET(request: NextRequest) {
  const user = await getMarketUser(request);
  if (!user) return NextResponse.json({ authenticated: false }, { status: 401 });
  const client = marketDatabase();
  if (!client) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  try {
    await settleExpiredRewardCampaigns(client);
  } catch (reason) {
    return NextResponse.json({ error: reason instanceof Error ? reason.message : "تعذر تسوية الحملات المنتهية" }, { status: 500 });
  }
  const { data, error } = await client.from("seller_offers").select("id,item_name,quantity,price,image_url,status,admin_note,visibility,created_at").eq("user_id", user.id).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const [{ data: rewards }, { data: withdrawals }] = await Promise.all([
    client.from("ad_reward_ledger").select("id,campaign_id,status,points,amount,reason,created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
    client.from("reward_withdrawals").select("id,amount,wallet_number,status,admin_note,created_at,paid_at").eq("user_id", user.id).order("created_at", { ascending: false }),
  ]);
  const rewardRows = rewards || [];
  const rewardSummary = rewardRows.reduce((summary, reward) => {
    if (reward.status === "approved") { summary.points += Number(reward.points || 0); summary.amount += Number(reward.amount || 0); }
    if (reward.status === "pending") {
      summary.pending += 1;
    }
    return summary;
  }, { points: 0, amount: 0, pending: 0, pending_points: 0, pending_amount: 0 });
  const reservedAmount = (withdrawals || []).filter((withdrawal) => ["pending", "approved", "paid"].includes(withdrawal.status)).reduce((sum, withdrawal) => sum + Number(withdrawal.amount || 0), 0);
  const availableBalance = Math.max(0, Number((rewardSummary.amount - reservedAmount).toFixed(2)));
  const publicRewards = rewardRows.map((reward) => reward.status === "approved" ? reward : { ...reward, points: null, amount: null });
  return NextResponse.json({ user: { display_name: user.display_name, phone: user.phone, role: user.role, account_type: user.account_type, receive_offers: user.receive_offers, referral_code: user.referral_code, profile_image_url: user.profile_image_url, wallet_number: user.wallet_number }, offers: data || [], rewards: publicRewards, reward_summary: { ...rewardSummary, available_balance: availableBalance, minimum_withdrawal: 500 }, withdrawals: withdrawals || [] });
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
    const accountType = body.account_type === "ordinary" ? "ordinary" : "market";
    const role = accountType === "ordinary" ? "customer" : (["farm_owner", "trader", "supplier"].includes(body.role) ? body.role : "supplier");
    if (!name) return NextResponse.json({ error: "اكتب الاسم أو اسم النشاط" }, { status: 400 });
    const referralCode = randomBytes(8).toString("hex");
    const { data, error } = await client.from("market_users").insert({ display_name: name, phone, password_hash: hashMarketPassword(password), role, account_type: accountType, referral_code: referralCode, receive_offers: accountType === "market" && role === "trader" && body.receive_offers !== false }).select("id,display_name,phone,password_hash,role,account_type,receive_offers,referral_code,profile_image_url,wallet_number").single();
    if (error) return NextResponse.json({ error: error.code === "23505" ? "هذا الرقم مسجل بالفعل" : error.message }, { status: 400 });
    const identity = await authenticateMarketUser(phone, password);
    if (!identity) return NextResponse.json({ error: "تعذر إنشاء جلسة الحساب" }, { status: 500 });
    const response = NextResponse.json({ authenticated: true, user: { display_name: data.display_name, phone: data.phone, role: data.role, account_type: data.account_type, receive_offers: data.receive_offers, referral_code: data.referral_code, profile_image_url: data.profile_image_url, wallet_number: data.wallet_number } }, { status: 201 });
    response.cookies.set(MARKET_COOKIE, identity.token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 30, path: "/" });
    return response;
  }
  const identity = await authenticateMarketUser(phone, password);
  if (!identity) return NextResponse.json({ error: "رقم الهاتف أو كلمة السر غير صحيحة" }, { status: 401 });
  const response = NextResponse.json({ authenticated: true, user: { display_name: identity.display_name, phone: identity.phone, role: identity.role, account_type: identity.account_type, receive_offers: identity.receive_offers, referral_code: identity.referral_code, profile_image_url: identity.profile_image_url, wallet_number: identity.wallet_number } });
  response.cookies.set(MARKET_COOKIE, identity.token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 30, path: "/" });
  return response;
}

export async function PATCH(request: NextRequest) {
  const user = await getMarketUser(request);
  if (!user) return NextResponse.json({ error: "يجب تسجيل الدخول أولًا" }, { status: 401 });
  const client = marketDatabase();
  if (!client) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const form = await request.formData();
  const image = form.get("profile_image");
  if (!(image instanceof File) || !image.size) return NextResponse.json({ error: "اختر صورة صحيحة" }, { status: 400 });
  if (!image.type.startsWith("image/") || image.size > 3 * 1024 * 1024) return NextResponse.json({ error: "الصورة يجب أن تكون أقل من 3 ميجابايت" }, { status: 400 });
  const path = `profiles/${user.id}-${Date.now()}-${image.name.replace(/[^a-zA-Z0-9._-]/g, "")}`;
  const upload = await client.storage.from("item-images").upload(path, image, { contentType: image.type, upsert: false });
  if (upload.error) return NextResponse.json({ error: upload.error.message }, { status: 400 });
  const profileImageUrl = client.storage.from("item-images").getPublicUrl(path).data.publicUrl;
  const { error } = await client.from("market_users").update({ profile_image_url: profileImageUrl }).eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ profile_image_url: profileImageUrl });
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(MARKET_COOKIE, "", { httpOnly: true, expires: new Date(0), path: "/" });
  return response;
}