import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminRole, hashPassword } from "@/lib/admin-auth";

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
}

function unauthorized() {
  return NextResponse.json({ error: "هذه الصلاحية للأدمن فقط" }, { status: 401 });
}

export async function GET(request: NextRequest) {
  if (await getAdminRole(request) !== "admin") return unauthorized();
  const database = client();
  if (!database) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const { data, error } = await database.from("employees").select("id, name, active, created_at").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest) {
  if (await getAdminRole(request) !== "admin") return unauthorized();
  const database = client();
  if (!database) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const password = typeof body.password === "string" ? body.password.trim() : "";
  if (!name || password.length < 4) return NextResponse.json({ error: "اكتب اسم الموظف وكلمة سر من 4 أحرف أو أرقام على الأقل" }, { status: 400 });
  const { data, error } = await database.from("employees").insert({ name, password_hash: hashPassword(password) }).select("id, name, active, created_at").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  if (await getAdminRole(request) !== "admin") return unauthorized();
  const database = client();
  if (!database) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const id = Number(body.id);
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const password = typeof body.password === "string" ? body.password.trim() : "";
  if (!Number.isInteger(id) || !name) return NextResponse.json({ error: "بيانات الموظف غير صحيحة" }, { status: 400 });
  const update = { name, ...(password ? (password.length >= 4 ? { password_hash: hashPassword(password) } : {}) : {}) };
  if (password && password.length < 4) return NextResponse.json({ error: "كلمة السر يجب أن تكون 4 أحرف أو أرقام على الأقل" }, { status: 400 });
  const { data, error } = await database.from("employees").update(update).eq("id", id).select("id, name, active, created_at").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  if (await getAdminRole(request) !== "admin") return unauthorized();
  const database = client();
  if (!database) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const id = Number(body.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "بيانات الموظف غير صحيحة" }, { status: 400 });
  const { error } = await database.from("employees").update({ active: false }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}