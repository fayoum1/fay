import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const reportSecret = process.env.REPORT_SECRET;
  if (!reportSecret || request.headers.get("x-report-secret") !== reportSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  const fromTime = from ? new Date(from) : null;
  const toTime = to ? new Date(to) : null;
  const maximumRange = 48 * 60 * 60 * 1000;

  if (
    !fromTime ||
    !toTime ||
    Number.isNaN(fromTime.getTime()) ||
    Number.isNaN(toTime.getTime()) ||
    toTime <= fromTime ||
    toTime.getTime() - fromTime.getTime() > maximumRange
  ) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const database = createClient(url, key, { auth: { persistSession: false } });
  const [{ count: newBookings, error: bookingsError }, { count: completedOrders, error: completedError }] =
    await Promise.all([
      database
        .from("orders")
        .select("id", { count: "exact", head: true })
        .gte("created_at", fromTime.toISOString())
        .lt("created_at", toTime.toISOString()),
      database
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "تم")
        .gte("status_changed_at", fromTime.toISOString())
        .lt("status_changed_at", toTime.toISOString()),
    ]);

  if (bookingsError || completedError) {
    return NextResponse.json(
      { error: bookingsError?.message || completedError?.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    newBookings: newBookings || 0,
    completedOrders: completedOrders || 0,
  });
}