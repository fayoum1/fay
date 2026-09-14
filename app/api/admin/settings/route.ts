import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminRole, hashPassword } from "@/lib/admin-auth";

export async function PATCH(request: NextRequest) {
  if (await getAdminRole(request) !== "admin") return NextResponse.json({ error: "هذه الصلاحية للأدمن فقط" }, { status: 401 });
  const { password } = await request.json().catch(() => ({}));
  if (typeof password !== "string" || password.trim().length < 4) return NextResponse.json({ error: "كلمة السر يجب أن تكون 4 أحرف أو أرقام على الأقل" }, { status: 400 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const database = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await database.from("site_settings").update({ admin_password_hash: hashPassword(password.trim()) }).eq("id", 1);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}