import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSessionIdentity } from "@/lib/admin-auth";
import { orderMatchesRegions } from "@/lib/order-region";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getSessionIdentity(request);
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orderId = Number((await params).id);
  if (!Number.isInteger(orderId) || orderId < 1) {
    return NextResponse.json({ error: "رقم الطلب غير صحيح" }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const database = createClient(url, key, { auth: { persistSession: false } });
  if (identity.role === "staff") {
    const { data: order, error: orderError } = await database
      .from("orders")
      .select("governorate,district")
      .eq("id", orderId)
      .maybeSingle();
    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }
    if (
      !order ||
      !orderMatchesRegions(
        identity.orderRegions,
        order.governorate,
        order.district,
        identity.orderRegionMode || "include",
      )
    ) {
      return NextResponse.json({ error: "الطلب خارج نطاق منطقتك" }, { status: 404 });
    }
  }

  const { data, error } = await database
    .from("order_change_log")
    .select("id,order_id,change_type,actor_role,actor_name,actor_contact,old_values,new_values,changed_at")
    .eq("order_id", orderId)
    .order("changed_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(100);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ history: data || [] }, {
    headers: { "Cache-Control": "no-store" },
  });
}
