import { NextRequest, NextResponse } from "next/server";
import { getMarketUser, marketDatabase, normalizeMarketPhone } from "@/lib/market-auth";

const minimumWithdrawal = 500;

async function getBalance(client: NonNullable<ReturnType<typeof marketDatabase>>, userId: number) {
  const [{ data: rewards, error: rewardsError }, { data: withdrawals, error: withdrawalsError }] = await Promise.all([
    client.from("ad_reward_ledger").select("amount").eq("user_id", userId).eq("status", "approved"),
    client.from("reward_withdrawals").select("amount").eq("user_id", userId).in("status", ["pending", "approved", "paid"]),
  ]);
  if (rewardsError || withdrawalsError) throw new Error(rewardsError?.message || withdrawalsError?.message);
  const earned = (rewards || []).reduce((sum, reward) => sum + Number(reward.amount || 0), 0);
  const withdrawn = (withdrawals || []).reduce((sum, withdrawal) => sum + Number(withdrawal.amount || 0), 0);
  return Math.max(0, Number((earned - withdrawn).toFixed(2)));
}

export async function POST(request: NextRequest) {
  const user = await getMarketUser(request);
  if (user?.account_type !== "ordinary") return NextResponse.json({ error: "يجب تسجيل الدخول بحساب مكافآت" }, { status: 401 });
  const client = marketDatabase();
  if (!client) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const walletNumber = normalizeMarketPhone(String(body.wallet_number || ""));
  if (!/^01[0125]\d{8}$/.test(walletNumber)) return NextResponse.json({ error: "أدخل رقم محفظة مصري صحيح" }, { status: 400 });

  const { error: walletError } = await client.from("market_users").update({ wallet_number: walletNumber }).eq("id", user.id);
  if (walletError) return NextResponse.json({ error: walletError.message }, { status: 400 });
  if (body.action === "save_wallet") return NextResponse.json({ wallet_number: walletNumber });
  if (body.action !== "withdraw") return NextResponse.json({ error: "الطلب غير صحيح" }, { status: 400 });

  try {
    const availableBalance = await getBalance(client, user.id);
    if (availableBalance < minimumWithdrawal) {
      return NextResponse.json({ error: `الحد الأدنى للسحب ${minimumWithdrawal} جنيه`, available_balance: availableBalance }, { status: 400 });
    }
    const { data, error } = await client.from("reward_withdrawals").insert({ user_id: user.id, amount: availableBalance, wallet_number: walletNumber }).select("id,amount,status,created_at").single();
    if (error?.code === "23505") return NextResponse.json({ error: "لديك طلب سحب قيد المراجعة بالفعل" }, { status: 409 });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ withdrawal: data, available_balance: 0 }, { status: 201 });
  } catch (reason) {
    return NextResponse.json({ error: reason instanceof Error ? reason.message : "تعذر حساب الرصيد" }, { status: 500 });
  }
}