import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminRole } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  if (!(await getAdminRole(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const database = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await database.from("orders").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data || []).map((order) => ({ ...order, id: `#${order.id}`, order_items: Array.isArray(order.items) ? order.items : [], items: Array.isArray(order.items) ? order.items.map((item: { name: string; age_or_weight?: string | null; quantity: number }) => `${item.name}${item.age_or_weight ? ` (${item.age_or_weight})` : ""} × ${item.quantity}`).join("، ") : String(order.items) })));
}

export async function PATCH(request: NextRequest) {
  const role = await getAdminRole(request);
  if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, status, staff_name, previous_status, items } = await request.json();
  const allowed = ["حجز مؤكد", "قادم", "قيد التنفيذ", "تم", "لم يرد", "غير متاح", "طلب مرفوض"];
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const database = createClient(url, key, { auth: { persistSession: false } });
  if (Array.isArray(items)) {
    const { data: order, error: orderError } = await database.from("orders").select("status").eq("id", id).single();
    if (orderError) return NextResponse.json({ error: orderError.message }, { status: 400 });
    if (order.status === "تم") return NextResponse.json({ error: "لا يمكن تعديل طلب تم تنفيذه" }, { status: 400 });
    const quantities = new Map<number, number>();
    for (const entry of items) {
      const itemId = Number(entry?.id);
      const quantity = Number(entry?.quantity);
      if (Number.isInteger(itemId) && Number.isInteger(quantity) && quantity > 0) quantities.set(itemId, quantity);
    }
    if (!quantities.size) return NextResponse.json({ error: "يجب أن يحتوي الطلب على صنف واحد على الأقل" }, { status: 400 });
    const { data: menuItems, error: itemsError } = await database.from("items").select("id,name,category,price,price_mode,discount_percent,age_or_weight").in("id", [...quantities.keys()]).eq("active", true);
    if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 400 });
    if ((menuItems || []).length !== quantities.size) return NextResponse.json({ error: "بعض الأصناف غير متاحة" }, { status: 400 });
    const updatedItems = (menuItems || []).map((item) => {
      const price = Number(item.price) || 0;
      const finalPrice = item.price_mode === "discount" ? price * (1 - (Number(item.discount_percent) || 0) / 100) : ["market", "exchange", "free"].includes(item.price_mode) ? 0 : price;
      return { id: item.id, name: item.name, category: item.category, age_or_weight: item.age_or_weight || null, quantity: quantities.get(Number(item.id)), price, final_price: finalPrice };
    });
    const total = updatedItems.reduce((sum, item) => sum + item.final_price * (item.quantity || 0), 0);
    const { error } = await database.from("orders").update({ items: updatedItems, total }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, items: updatedItems, total });
  }
  if (!allowed.includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  const update: Record<string, unknown> = { status, status_changed_at: new Date().toISOString() };
  if (role === "staff" && status === "تم" && typeof staff_name === "string" && staff_name.trim()) {
    update.staff_name = staff_name.trim();
    update.admin_reverted = false;
  }
  if (role === "admin" && previous_status === "تم" && status !== "تم") update.admin_reverted = true;
  let { error } = await database.from("orders").update(update).eq("id", id);
  if (error && /staff_name|admin_reverted/.test(error.message)) {
    delete update.staff_name;
    delete update.admin_reverted;
    ({ error } = await database.from("orders").update(update).eq("id", id));
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}



export async function DELETE(request: NextRequest) {
  if (await getAdminRole(request) !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await request.json().catch(() => ({ id: null }));
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const database = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await database.from("orders").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
