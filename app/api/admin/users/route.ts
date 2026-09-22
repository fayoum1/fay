import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminRole } from "@/lib/admin-auth";
import { hashMarketPassword } from "@/lib/market-auth";

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

  const { data, error } = await database
    .from("market_users")
    .select("id, display_name, phone, role, account_type, receive_offers, active, created_at, password_hash")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: data || [] });
}

export async function PATCH(request: NextRequest) {
  if (await getAdminRole(request) !== "admin") return unauthorized();
  const database = client();
  if (!database) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const id = Number(body.id);
  const active = typeof body.active === "boolean" ? body.active : null;
  const rawPassword = typeof body.password === "string" ? body.password.trim() : "";

  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "بيانات المستخدم غير صحيحة" }, { status: 400 });
  }

  if (rawPassword && rawPassword.length < 4) {
    return NextResponse.json({ error: "كلمة المرور يجب أن تكون 4 أحرف أو أكثر" }, { status: 400 });
  }

  const update: Record<string, string | boolean> = { updated_at: new Date().toISOString() };
  if (active !== null) update.active = active;
  if (rawPassword) update.password_hash = hashMarketPassword(rawPassword);

  const { data, error } = await database
    .from("market_users")
    .update(update)
    .eq("id", id)
    .select("id, display_name, phone, role, account_type, receive_offers, active, created_at, password_hash")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({
    ...data,
    ...(rawPassword ? { password: rawPassword } : {}),
  });
}
