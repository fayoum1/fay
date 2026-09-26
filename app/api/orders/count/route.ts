import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSessionIdentity } from "@/lib/admin-auth";
import { orderMatchesRegions, parseOrderRegion } from "@/lib/order-region";

export async function GET(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ count: 0, error: "Supabase is not configured" }, { status: 503 });
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  if (!from || !to) return NextResponse.json({ error: "Date range is required" }, { status: 400 });
  const database = createClient(url, key, { auth: { persistSession: false } });
  const identity = await getSessionIdentity(request);
  const staffRegions = identity?.role === "staff" ? identity.orderRegions || [] : ["*"];
  if (identity?.role === "staff" && identity.orderRegionMode === "exclude") {
    const { data: allOrders, error } = await database.from("orders").select("created_at, governorate, district, status, items");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const visibleOrders = (allOrders || []).filter((order) =>
      orderMatchesRegions(staffRegions, order.governorate, order.district, "exclude"),
    );
    const count = visibleOrders.filter((order) => order.created_at >= from && order.created_at < to).length;
    const confirmedCount = visibleOrders.filter((order) => {
      if (!Array.isArray(order.items) || !order.items.length) return order.status === "حجز مؤكد" || order.status === "قادم";
      return order.items.some((item) =>
        (item as { item_status?: string }).item_status === "حجز مؤكد" ||
        (item as { item_status?: string }).item_status === "قادم" ||
        (!(item as { item_status?: string }).item_status && (order.status === "حجز مؤكد" || order.status === "قادم")),
      );
    }).length;
    return NextResponse.json({ count, confirmedCount });
  }
  const allRegions = identity?.role !== "staff" || staffRegions.includes("*");
  const countResults = allRegions
    ? [await database.from("orders").select("id", { count: "exact", head: true }).gte("created_at", from).lt("created_at", to)]
    : await Promise.all(staffRegions.map((region) => {
      const location = parseOrderRegion(region);
      const query = database.from("orders").select("id", { count: "exact", head: true }).gte("created_at", from).lt("created_at", to);
      if (!location) return query.eq("id", -1);
      return location.district
        ? query.eq("governorate", location.governorate).eq("district", location.district)
        : query.eq("governorate", location.governorate).is("district", null);
    }));
  const countError = countResults.find((result) => result.error)?.error;
  if (countError) return NextResponse.json({ error: countError.message }, { status: 500 });
  const count = countResults.reduce((sum, result) => sum + (result.count || 0), 0);
  const confirmedResults = allRegions
    ? [await database.from("orders").select("status, items")]
    : await Promise.all(staffRegions.map((region) => {
      const location = parseOrderRegion(region);
      const query = database.from("orders").select("status, items");
      if (!location) return query.eq("id", -1);
      return location.district
        ? query.eq("governorate", location.governorate).eq("district", location.district)
        : query.eq("governorate", location.governorate).is("district", null);
    }));
  const confirmedError = confirmedResults.find((result) => result.error)?.error;
  if (confirmedError) return NextResponse.json({ error: confirmedError.message }, { status: 500 });
  const confirmedOrders = confirmedResults.flatMap((result) => result.data || []);
  const confirmedCount = confirmedOrders.filter((order) => {
    if (!Array.isArray(order.items) || !order.items.length) return order.status === "حجز مؤكد" || order.status === "قادم";
    return order.items.some((item) =>
      (item as { item_status?: string }).item_status === "حجز مؤكد" ||
      (item as { item_status?: string }).item_status === "قادم" ||
      (!(item as { item_status?: string }).item_status && (order.status === "حجز مؤكد" || order.status === "قادم")),
    );
  }).length;
  return NextResponse.json({ count: count || 0, confirmedCount });
}
