import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminRole } from "@/lib/admin-auth";

function database() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
}

export async function GET(request: NextRequest) {
  if (await getAdminRole(request) !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const client = database();
  if (!client) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const [{ data: advertisements, error }, { data: packages, error: packageError }] = await Promise.all([
    client.from("advertisements").select("*").order("created_at", { ascending: false }),
    client.from("advertisement_packages").select("*").order("price"),
  ]);
  if (error || packageError) return NextResponse.json({ error: error?.message || packageError?.message }, { status: 500 });
  return NextResponse.json({ advertisements: advertisements || [], packages: packages || [] });
}

export async function PATCH(request: NextRequest) {
  if (await getAdminRole(request) !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const id = Number(body.id);
  const status = ["قيد المراجعة", "مقبول", "مرفوض", "متوقف", "منتهي"].includes(body.status) ? body.status : null;
  if (!Number.isInteger(id) || !status) return NextResponse.json({ error: "بيانات الإعلان غير صحيحة" }, { status: 400 });
  const client = database();
  if (!client) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const update = { status, ...(typeof body.admin_note === "string" ? { admin_note: body.admin_note.trim().slice(0, 500) } : {}), ...(typeof body.featured === "boolean" ? { featured: body.featured } : {}) };
  const { error } = await client.from("advertisements").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}

export async function POST(request: NextRequest) {
  if (await getAdminRole(request) !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim().slice(0, 80);
  const durationDays = Number(body.duration_days);
  const price = Number(body.price);
  if (!name || !Number.isInteger(durationDays) || durationDays < 1 || !Number.isFinite(price) || price < 0) return NextResponse.json({ error: "بيانات الباقة غير صحيحة" }, { status: 400 });
  const client = database();
  if (!client) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const { data, error } = await client.from("advertisement_packages").insert({ name, duration_days: durationDays, price }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
