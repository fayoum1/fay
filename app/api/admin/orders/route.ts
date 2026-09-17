import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSessionIdentity } from "@/lib/admin-auth";

type OrderItem = {
  id: number;
  name: string;
  quantity: number;
  age_or_weight?: string | null;
  [key: string]: unknown;
};

function normalizeOrderItems(value: unknown): OrderItem[] {
  if (Array.isArray(value)) return value as OrderItem[];
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed as OrderItem[] : [];
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  if (!(await getSessionIdentity(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const database = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await database.from("orders").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data || []).map((order) => {
    const orderItems = normalizeOrderItems(order.items);
    return {
      ...order,
      id: `#${order.id}`,
      order_items: orderItems,
      items: orderItems.map((item) => `${item.name}${item.age_or_weight ? ` (${item.age_or_weight})` : ""} × ${item.quantity}`).join("، "),
    };
  }));
}

export async function PATCH(request: NextRequest) {
  const identity = await getSessionIdentity(request);
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { role } = identity;
  const { id, status, previous_status, items, item_id, item_status } = await request.json();
  const allowed = ["حجز مؤكد", "قادم", "قيد التنفيذ", "تم", "لم يرد", "غير متاح", "طلب مرفوض"];
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const database = createClient(url, key, { auth: { persistSession: false } });
  if (Number.isInteger(item_id)) {
    if (!allowed.includes(item_status)) return NextResponse.json({ error: "Invalid item status" }, { status: 400 });
    const { data: order, error: orderError } = await database.from("orders").select("items,status").eq("id", id).single();
    if (orderError) return NextResponse.json({ error: orderError.message }, { status: 400 });
    const currentItems = normalizeOrderItems(order.items);
    const updatedItems = currentItems.map((item: { id?: number; item_status?: string }) =>
      Number(item.id) === item_id ? { ...item, item_status } : item,
    );
    if (!updatedItems.some((item: { id?: number }) => Number(item.id) === item_id)) {
      return NextResponse.json({ error: "الصنف غير موجود في هذا الطلب" }, { status: 404 });
    }
    const itemStatuses = updatedItems.map((item) => item.item_status).filter((value): value is string => typeof value === "string");
    const allItemsHaveSameStatus = itemStatuses.length === updatedItems.length && new Set(itemStatuses).size === 1;
    const update: Record<string, unknown> = {
      items: updatedItems,
      status_changed_at: new Date().toISOString(),
      status_changed_by: identity.staffName || "الأدمن",
    };
    if (allItemsHaveSameStatus && allowed.includes(itemStatuses[0])) {
      update.status = itemStatuses[0];
      if (role === "staff" && itemStatuses[0] === "تم" && identity.staffName) {
        update.staff_name = identity.staffName;
        update.admin_reverted = false;
      }
    }
    let { error } = await database.from("orders").update(update).eq("id", id);
    if (error && /staff_name|admin_reverted|status_changed_by/.test(error.message)) {
      delete update.staff_name;
      delete update.admin_reverted;
      delete update.status_changed_by;
      ({ error } = await database.from("orders").update(update).eq("id", id));
    }
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, items: updatedItems, status: update.status });
  }
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
  const update: Record<string, unknown> = {
    status,
    status_changed_at: new Date().toISOString(),
    status_changed_by: identity.staffName || "الأدمن",
  };
  if (role === "staff" && status === "تم" && identity.staffName) {
    update.staff_name = identity.staffName;
    update.admin_reverted = false;
  }
  if (role === "admin" && previous_status === "تم" && status !== "تم") update.admin_reverted = true;
  let { error } = await database.from("orders").update(update).eq("id", id);
  if (error && /staff_name|admin_reverted|status_changed_by/.test(error.message)) {
    delete update.staff_name;
    delete update.admin_reverted;
    delete update.status_changed_by;
    ({ error } = await database.from("orders").update(update).eq("id", id));
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}



export async function DELETE(request: NextRequest) {
  const identity = await getSessionIdentity(request);
  if (identity?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
