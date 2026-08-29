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
  const fields = "id, customer_name, phone, governorate, district, items, total, status, created_at, status_changed_at, staff_name";
  const [{ data: newBookingDetails, error: bookingsError }, { data: completedOrderDetails, error: completedError }] =
    await Promise.all([
      database
        .from("orders")
        .select(fields)
        .gte("created_at", fromTime.toISOString())
        .lt("created_at", toTime.toISOString())
        .order("created_at", { ascending: true }),
      database
        .from("orders")
        .select(fields)
        .eq("status", "تم")
        .gte("status_changed_at", fromTime.toISOString())
        .lt("status_changed_at", toTime.toISOString())
        .order("status_changed_at", { ascending: true }),
    ]);

  if (bookingsError || completedError) {
    return NextResponse.json(
      { error: bookingsError?.message || completedError?.message },
      { status: 500 },
    );
  }

  const formatOrder = (order: {
    id: number;
    customer_name: string | null;
    phone: string;
    governorate: string;
    district: string | null;
    items: unknown;
    total: number;
    status: string;
    created_at: string;
    status_changed_at: string;
    staff_name: string | null;
  }) => ({
    id: order.id,
    customerName: order.customer_name || "غير مسجل",
    phone: order.phone,
    governorate: order.governorate,
    district: order.district,
    items: Array.isArray(order.items)
      ? order.items.map((item) => {
          const entry = item as { name?: unknown; quantity?: unknown };
          return `${String(entry.name || "صنف")} x ${Number(entry.quantity) || 1}`;
        })
      : [],
    total: Number(order.total) || 0,
    status: order.status,
    createdAt: order.created_at,
    statusChangedAt: order.status_changed_at,
    staffName: order.staff_name,
  });

  return NextResponse.json({
    newBookings: newBookingDetails?.length || 0,
    completedOrders: completedOrderDetails?.length || 0,
    newBookingDetails: (newBookingDetails || []).map(formatOrder),
    completedOrderDetails: (completedOrderDetails || []).map(formatOrder),
  });
}