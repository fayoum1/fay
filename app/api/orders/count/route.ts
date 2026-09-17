import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ count: 0, error: "Supabase is not configured" }, { status: 503 });
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  if (!from || !to) return NextResponse.json({ error: "Date range is required" }, { status: 400 });
  const database = createClient(url, key, { auth: { persistSession: false } });
  const { count, error } = await database.from("orders").select("id", { count: "exact", head: true }).gte("created_at", from).lt("created_at", to);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { data: confirmedOrders, error: confirmedError } = await database
    .from("orders")
    .select("status, items");
  if (confirmedError) return NextResponse.json({ error: confirmedError.message }, { status: 500 });
  const confirmedCount = (confirmedOrders || []).filter((order) => {
    if (!Array.isArray(order.items) || !order.items.length) return order.status === "حجز مؤكد" || order.status === "قادم";
    return order.items.some((item) =>
      (item as { item_status?: string }).item_status === "حجز مؤكد" ||
      (item as { item_status?: string }).item_status === "قادم" ||
      (!(item as { item_status?: string }).item_status && (order.status === "حجز مؤكد" || order.status === "قادم")),
    );
  }).length;
  return NextResponse.json({ count: count || 0, confirmedCount });
}
