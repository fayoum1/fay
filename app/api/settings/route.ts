import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminRole, hashPassword } from "@/lib/admin-auth";

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
}

export async function GET() {
  const database = client();
  if (!database) return NextResponse.json(null, { status: 204 });
  const { data, error } = await database.from("site_settings").select("id, name, tagline, branch, phone, secondary_phone, logo_url, staff_name, marketing_url, milestone_count, milestone_reward").eq("id", 1).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { data: rateHistory } = await database.from("reward_rate_history").select("*").order("effective_from", { ascending: true });
  return NextResponse.json({ ...data, reward_rate_history: rateHistory || [] });
}

export async function PATCH(request: NextRequest) {
  if (await getAdminRole(request) !== "admin") return NextResponse.json({ error: "هذه الصلاحية للأدمن فقط" }, { status: 401 });
  const database = client();
  if (!database) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const form = await request.formData();
  const milestoneCount = Number(form.get("milestone_count"));
  const milestoneReward = Number(form.get("milestone_reward"));
  const marketingUrl = String(form.get("marketing_url") || "").trim();
  if (marketingUrl && !(/^\//.test(marketingUrl) || /^https?:\/\//i.test(marketingUrl))) return NextResponse.json({ error: "رابط التسويق غير صالح" }, { status: 400 });
  const values = { name: String(form.get("name") || "الفيوم للأعلاف والدواجن"), tagline: String(form.get("tagline") || "نظام الطلبات"), branch: String(form.get("branch") || "الفرع الرئيسي"), phone: String(form.get("phone") || ""), secondary_phone: String(form.get("secondary_phone") || ""), staff_name: String(form.get("staff_name") || "").trim(), marketing_url: marketingUrl, milestone_count: Number.isFinite(milestoneCount) && milestoneCount > 0 ? milestoneCount : 1, milestone_reward: Number.isFinite(milestoneReward) && milestoneReward >= 0 ? milestoneReward : 1 };
  const adminPassword = String(form.get("admin_password") || "").trim();
  const staffPassword = String(form.get("staff_password") || "").trim();
  if ((adminPassword && adminPassword.length < 4) || (staffPassword && staffPassword.length < 4)) return NextResponse.json({ error: "كلمة السر يجب أن تكون 4 أحرف أو أرقام على الأقل" }, { status: 400 });
  const image = form.get("logo");
  let logo_url = String(form.get("logo_url") || "") || undefined;
  if (image instanceof File) {
    if (!image.type.startsWith("image/") || image.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Invalid logo" }, { status: 400 });
    const path = `logo-${Date.now()}-${image.name.replace(/[^a-zA-Z0-9._-]/g, "")}`;
    const upload = await database.storage.from("item-images").upload(path, image, { contentType: image.type, upsert: true });
    if (upload.error) return NextResponse.json({ error: upload.error.message }, { status: 400 });
    logo_url = database.storage.from("item-images").getPublicUrl(path).data.publicUrl;
  }
  const { data: previous } = await database.from("site_settings").select("milestone_count, milestone_reward").eq("id", 1).maybeSingle();
  const { count: historyCount } = await database.from("reward_rate_history").select("id", { count: "exact", head: true });
  if (!historyCount) {
    await database.from("reward_rate_history").insert({ milestone_count: previous?.milestone_count ?? values.milestone_count, milestone_reward: previous?.milestone_reward ?? values.milestone_reward, effective_from: "2000-01-01T00:00:00Z" });
  }
  const passwords = { ...(adminPassword ? { admin_password_hash: hashPassword(adminPassword) } : {}), ...(staffPassword ? { staff_password_hash: hashPassword(staffPassword) } : {}) };
  const { data, error } = await database.from("site_settings").upsert({ id: 1, ...values, ...passwords, logo_url }, { onConflict: "id" }).select("id, name, tagline, branch, phone, secondary_phone, logo_url, staff_name, marketing_url, milestone_count, milestone_reward").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (previous && (previous.milestone_count !== values.milestone_count || previous.milestone_reward !== values.milestone_reward)) {
    await database.from("reward_rate_history").insert({ milestone_count: values.milestone_count, milestone_reward: values.milestone_reward, effective_from: new Date().toISOString() });
  }
  const { data: rateHistory } = await database.from("reward_rate_history").select("*").order("effective_from", { ascending: true });
  return NextResponse.json({ ...data, reward_rate_history: rateHistory || [] });
}
