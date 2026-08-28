import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function normalizePhone(value: string) {
  return value.replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });

  const body = await request.json().catch(() => null);
  const phone = normalizePhone(typeof body?.phone === "string" ? body.phone : "").replace(/\D/g, "");
  if (!/^(010|011|012|015)\d{8}$/.test(phone)) {
    return NextResponse.json({ error: "رقم الهاتف يجب أن يكون 11 رقمًا ويبدأ بـ 010 أو 011 أو 012 أو 015" }, { status: 400 });
  }
  if (!Array.isArray(body?.items) || !body.items.length) {
    return NextResponse.json({ error: "أضف صنفًا واحدًا على الأقل للسلة" }, { status: 400 });
  }

  const database = createClient(url, key, { auth: { persistSession: false } });
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await database
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("phone", phone)
    .gte("created_at", since);
  if (countError) return NextResponse.json({ error: countError.message }, { status: 500 });
  if ((count || 0) >= 3) return NextResponse.json({ error: "لا يمكن تسجيل أكثر من 3 طلبات لهذا الرقم خلال ساعة واحدة" }, { status: 429 });

  const { data, error } = await database.from("orders").insert({
    phone,
    governorate: body.governorate,
    district: body.district || null,
    items: body.items,
    total: Number(body.total) || 0,
    status: "قيد التنفيذ",
  }).select("id, created_at").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}