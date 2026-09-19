import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminRole } from "@/lib/admin-auth";
import { settleRewardCampaign } from "@/lib/reward-settlement";

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
  const adsWithLikes = await Promise.all((advertisements || []).map(async (advertisement) => {
    const { count } = await client
      .from("advertisement_engagements")
      .select("id", { count: "exact", head: true })
      .eq("advertisement_id", advertisement.id)
      .eq("event_type", "like");
    return { ...advertisement, likes: count || 0 };
  }));
  return NextResponse.json({ advertisements: adsWithLikes, packages: packages || [] });
}

export async function PATCH(request: NextRequest) {
  if (await getAdminRole(request) !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const client = database();
  if (!client) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  if (body.entity === "package") {
    const packageId = Number(body.id);
    if (!Number.isInteger(packageId)) return NextResponse.json({ error: "الباقة غير صحيحة" }, { status: 400 });
    const update = {
      ...(typeof body.name === "string" ? { name: body.name.trim().slice(0, 80) } : {}),
      ...(Number.isInteger(Number(body.duration_days)) && Number(body.duration_days) > 0 ? { duration_days: Number(body.duration_days) } : {}),
      ...(Number.isFinite(Number(body.price)) && Number(body.price) >= 0 ? { price: Number(body.price) } : {}),
      ...(typeof body.active === "boolean" ? { active: body.active } : {}),
    };
    if (!Object.keys(update).length) return NextResponse.json({ error: "لا توجد تعديلات" }, { status: 400 });
    const { data, error } = await client.from("advertisement_packages").update(update).eq("id", packageId).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  }
  const id = Number(body.id);
  const status = ["قيد المراجعة", "مقبول", "مرفوض", "متوقف", "منتهي"].includes(body.status) ? body.status : null;
  if (!Number.isInteger(id) || !status) return NextResponse.json({ error: "بيانات الإعلان غير صحيحة" }, { status: 400 });
  const { data: advertisement, error: readError } = await client.from("advertisements").select("price,payment_status,duration_days,starts_at,ends_at").eq("id", id).maybeSingle();
  if (readError || !advertisement) return NextResponse.json({ error: readError?.message || "الإعلان غير موجود" }, { status: 404 });
  if (status === "مقبول" && Number(advertisement.price) > 0 && advertisement.payment_status !== "تم الدفع") {
    return NextResponse.json({ error: "لا يمكن نشر إعلان مدفوع قبل تأكيد الدفع" }, { status: 400 });
  }
  const startsAt = body.starts_at ? new Date(body.starts_at) : new Date();
  const endsAt = body.ends_at ? new Date(body.ends_at) : new Date(startsAt.getTime() + Number(advertisement.duration_days || 7) * 24 * 60 * 60 * 1000);
  const update = {
    status,
    ...( ["غير مطلوب", "قيد الانتظار", "تم الدفع", "مرفوض"].includes(body.payment_status) ? { payment_status: body.payment_status } : {}),
    ...(typeof body.admin_note === "string" ? { admin_note: body.admin_note.trim().slice(0, 500) } : {}),
    ...(typeof body.featured === "boolean" ? { featured: body.featured } : {}),
    ...(status === "مقبول" ? { starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString() } : {}),
  };
  if (body.featured === true) {
    await client.from("advertisements").update({ featured: false }).neq("id", id);
  }
  const { error } = await client.from("advertisements").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (status === "مقبول") {
    const { error: campaignError } = await client.from("ad_reward_campaigns").update({ status: "active", starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString() }).eq("advertisement_id", id).eq("status", "draft");
    if (campaignError) return NextResponse.json({ error: campaignError.message }, { status: 400 });
  } else if (status === "منتهي") {
    const { data: campaigns, error: campaignsError } = await client.from("ad_reward_campaigns").select("id").eq("advertisement_id", id).eq("status", "active");
    if (campaignsError) return NextResponse.json({ error: campaignsError.message }, { status: 400 });
    try {
      for (const campaign of campaigns || []) await settleRewardCampaign(client, campaign.id);
    } catch (reason) {
      return NextResponse.json({ error: reason instanceof Error ? reason.message : "تعذر تقسيم ميزانية الحملة" }, { status: 400 });
    }
    const { error: campaignError } = await client.from("ad_reward_campaigns").update({ status: "completed" }).eq("advertisement_id", id).eq("status", "active");
    if (campaignError) return NextResponse.json({ error: campaignError.message }, { status: 400 });
  } else if (["مرفوض", "متوقف"].includes(status)) {
    const { error: campaignError } = await client.from("ad_reward_campaigns").update({ status: "paused" }).eq("advertisement_id", id).eq("status", "active");
    if (campaignError) return NextResponse.json({ error: campaignError.message }, { status: 400 });
  }
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
  const { data, error } = await client.from("advertisement_packages").insert({ name, duration_days: durationDays, price, active: true }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  if (await getAdminRole(request) !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const client = database();
  if (!client) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const table = body.entity === "package" ? "advertisement_packages" : "advertisements";
  const id = Number(body.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "العنصر غير صحيح" }, { status: 400 });
  const { error } = await client.from(table).delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
