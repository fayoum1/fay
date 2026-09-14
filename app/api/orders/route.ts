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
  const customerName = typeof body?.customer_name === "string" ? body.customer_name.trim().slice(0, 100) : "";
  const phone = normalizePhone(typeof body?.phone === "string" ? body.phone : "").replace(/\D/g, "");
  if (!customerName) {
    return NextResponse.json({ error: "اكتب اسم العميل" }, { status: 400 });
  }
  if (!/^(010|011|012|015)\d{8}$/.test(phone)) {
    return NextResponse.json({ error: "رقم الهاتف يجب أن يكون 11 رقمًا ويبدأ بـ 010 أو 011 أو 012 أو 015" }, { status: 400 });
  }
  if (!Array.isArray(body?.items) || !body.items.length) {
    return NextResponse.json({ error: "أضف صنفًا واحدًا على الأقل للسلة" }, { status: 400 });
  }
  const totalQuantity = body.items.reduce(
    (sum: number, item: { quantity?: unknown }) =>
      sum + (typeof item?.quantity === "number" && Number.isFinite(item.quantity) ? Math.max(0, Math.floor(item.quantity)) : 0),
    0,
  );
  if (body.governorate !== "الفيوم" && totalQuantity < 100) {
    return NextResponse.json(
      { error: "لا يوجد توصيل أو حجز للكميات الصغيرة خارج محافظة الفيوم. يرجى زيادة الكمية أو التواصل مع فريق الدعم 0842064130" },
      { status: 400 },
    );
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

  const { data, error } = await database.rpc("create_order_without_duplicate_items", {
    p_customer_name: customerName,
    p_phone: phone,
    p_governorate: body.governorate,
    p_district: body.district || null,
    p_items: body.items,
    p_total: Number(body.total) || 0,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (data?.duplicate) {
    return NextResponse.json(
      {
        error: "تم استلام حجز سابق لنفس الصنف",
        duplicateItems: data.items || [],
        retryAt: data.retry_at,
      },
      { status: 409 },
    );
  }
  return NextResponse.json({ id: data?.id, created_at: data?.created_at }, { status: 201 });
}