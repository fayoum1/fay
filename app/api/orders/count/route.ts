import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSessionIdentity } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  if (!from || !to) {
    return NextResponse.json({ error: "Date range is required" }, { status: 400 });
  }

  const identity = await getSessionIdentity(request);
  const regions = identity?.role === "staff" ? identity.orderRegions || [] : ["*"];
  const regionMode = identity?.role === "staff"
    ? identity.orderRegionMode || "include"
    : "include";
  const database = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await database.rpc("get_order_counts", {
    p_from: from,
    p_to: to,
    p_regions: regions,
    p_region_mode: regionMode,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const counts = Array.isArray(data) ? data[0] : null;
  return NextResponse.json({
    count: Number(counts?.booking_count) || 0,
    confirmedCount: Number(counts?.confirmed_count) || 0,
  }, { headers: { "Cache-Control": "private, no-store" } });
}
