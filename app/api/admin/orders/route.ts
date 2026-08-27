import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminRole } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  if (!getAdminRole(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const database = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await database.from("orders").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data || []).map((order) => ({ ...order, id: `#${order.id}`, order_items: Array.isArray(order.items) ? order.items : [], items: Array.isArray(order.items) ? order.items.map((item: { name: string; quantity: number }) => `${item.name} × ${item.quantity}`).join("، ") : String(order.items) })));
}

export async function PATCH(request: NextRequest) {
  if (!getAdminRole(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, status } = await request.json();
  const allowed = ["قيد التنفيذ", "تم", "لم يرد", "غير متاح", "طلب مرفوض"];
  if (!Number.isInteger(id) || !allowed.includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const database = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await database.from("orders").update({ status }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
