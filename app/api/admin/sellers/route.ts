import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminRole } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  if (await getAdminRole(request) !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const client = createClient(url, key, { auth: { persistSession: false } });
  const [{ data: offers, error: offersError }, { data: stats, error: statsError }] = await Promise.all([
    client.from("seller_offers").select("*").order("created_at", { ascending: false }),
    client.from("seller_page_stats").select("visitor_count,submission_count").eq("id", 1).maybeSingle(),
  ]);
  if (offersError || statsError) return NextResponse.json({ error: offersError?.message || statsError?.message }, { status: 500 });
  return NextResponse.json({ offers: offers || [], stats: stats || { visitor_count: 0, submission_count: 0 } });
}

export async function PATCH(request: NextRequest) {
  if (await getAdminRole(request) !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const id = Number(body?.id);
  const status = body?.status;
  if (!Number.isInteger(id) || !["جديد", "تم التواصل", "تم الشراء", "مرفوض"].includes(status)) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const client = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await client.from("seller_offers").update({ status }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}