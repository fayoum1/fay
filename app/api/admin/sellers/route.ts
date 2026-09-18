import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminRole } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  if (await getAdminRole(request) !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const client = createClient(url, key, { auth: { persistSession: false } });
  const [{ data: offers, error: offersError }, { data: stats, error: statsError }] = await Promise.all([
    client.from("seller_offers").select("*").order("created_at", { ascending: false }),
    client.from("seller_page_stats").select("visitor_count,submission_count").eq("id", 1).maybeSingle(),
  ]);
  if (offersError || statsError) return NextResponse.json({ error: offersError?.message || statsError?.message }, { status: 500 });
  const { data: traders, error: tradersError } = await client.from("market_users").select("id,display_name,phone,role,receive_offers,active,created_at").eq("role", "trader").eq("active", true).order("display_name");
  if (tradersError) return NextResponse.json({ error: tradersError.message }, { status: 500 });
  return NextResponse.json({ offers: offers || [], traders: traders || [], stats: stats || { visitor_count: 0, submission_count: 0 } });
}

export async function PATCH(request: NextRequest) {
  if (await getAdminRole(request) !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const id = Number(body?.id);
  const status = body?.status;
  if (!Number.isInteger(id) || !["جديد", "قيد المراجعة", "تم التواصل", "مهتم وجار التواصل", "تم الشراء", "مرفوض"].includes(status)) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const client = createClient(url, key, { auth: { persistSession: false } });
  const { data: offer, error: offerError } = await client.from("seller_offers").select("visibility").eq("id", id).maybeSingle();
  if (offerError || !offer) return NextResponse.json({ error: offerError?.message || "العرض غير موجود" }, { status: 404 });
  const update = { status, ...(typeof body.note === "string" ? { admin_note: body.note.trim().slice(0, 500) } : {}) };
  const { error } = await client.from("seller_offers").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (offer.visibility !== "admin_only") {
    let traderIds = Array.isArray(body.trader_ids) ? body.trader_ids.map(Number).filter(Number.isInteger) : [];
    if (offer.visibility === "all_traders") {
      const { data: allTraders, error: tradersError } = await client.from("market_users").select("id").eq("role", "trader").eq("active", true).eq("receive_offers", true);
      if (tradersError) return NextResponse.json({ error: tradersError.message }, { status: 400 });
      traderIds = (allTraders || []).map((trader) => trader.id);
    }
    if (traderIds.length) {
      const { error: recipientsError } = await client.from("offer_recipients").upsert(traderIds.map((traderId: number) => ({ offer_id: id, trader_id: traderId })), { onConflict: "offer_id,trader_id" });
      if (recipientsError) return NextResponse.json({ error: recipientsError.message }, { status: 400 });
    }
  }
  return NextResponse.json({ success: true });
}