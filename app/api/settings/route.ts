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
  const { data, error } = await database.from("site_settings").select("id, name, tagline, branch, phone, secondary_phone, logo_url, staff_name, marketing_url, facebook_url, instagram_url, whatsapp_url, visitor_message, milestone_count, milestone_reward, show_target_to_staff, ad_display_duration_seconds, ad_rotation_mode, ad_auto_play, ad_show_advertiser_name, ad_show_expiry, ad_show_reward_badge, ad_popup_enabled, ad_popup_duration_seconds, ad_popup_delay_seconds, ad_popup_frequency").eq("id", 1).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { data: rateHistory } = await database.from("reward_rate_history").select("*").order("effective_from", { ascending: true });
  return NextResponse.json({ ...data, reward_rate_history: rateHistory || [] });
}

export async function PATCH(request: NextRequest) {
  if (await getAdminRole(request) !== "admin") return NextResponse.json({ error: "هذه الصلاحية للأدمن فقط" }, { status: 401 });
  const database = client();
  if (!database) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const form = await request.formData();
  const { data: existingSettings, error: existingSettingsError } = await database.from("site_settings").select("*").eq("id", 1).maybeSingle();
  if (existingSettingsError) return NextResponse.json({ error: existingSettingsError.message }, { status: 500 });
  const textValue = (key: string, fallback: string) => form.has(key) ? String(form.get(key) || "") : fallback;
  const booleanValue = (key: string, fallback: boolean) => form.has(key) ? String(form.get(key)) === "true" : fallback;
  const milestoneCount = Number(form.get("milestone_count"));
  const milestoneReward = Number(form.get("milestone_reward"));
  const showTargetToStaff = booleanValue("show_target_to_staff", existingSettings?.show_target_to_staff ?? true);
  const adDisplayDurationSeconds = Number(form.get("ad_display_duration_seconds"));
  const adRotationMode = textValue("ad_rotation_mode", existingSettings?.ad_rotation_mode || "scroll");
  const adAutoPlay = booleanValue("ad_auto_play", existingSettings?.ad_auto_play ?? true);
  const adShowAdvertiserName = booleanValue("ad_show_advertiser_name", existingSettings?.ad_show_advertiser_name ?? true);
  const adShowExpiry = booleanValue("ad_show_expiry", existingSettings?.ad_show_expiry ?? true);
  const adShowRewardBadge = booleanValue("ad_show_reward_badge", existingSettings?.ad_show_reward_badge ?? true);
  const adPopupEnabled = booleanValue("ad_popup_enabled", existingSettings?.ad_popup_enabled ?? true);
  const adPopupDurationSeconds = Number(form.get("ad_popup_duration_seconds"));
  const adPopupDelaySeconds = Number(form.get("ad_popup_delay_seconds"));
  const adPopupFrequency = textValue("ad_popup_frequency", existingSettings?.ad_popup_frequency || "session");
  const marketingUrl = textValue("marketing_url", existingSettings?.marketing_url || "").trim();
  const facebookUrl = textValue("facebook_url", existingSettings?.facebook_url || "").trim();
  const instagramUrl = textValue("instagram_url", existingSettings?.instagram_url || "").trim();
  const whatsappUrl = textValue("whatsapp_url", existingSettings?.whatsapp_url || "").trim();
  const visitorMessage = textValue("visitor_message", existingSettings?.visitor_message || "").trim().slice(0, 200);
  if (marketingUrl && !(/^\//.test(marketingUrl) || /^https?:\/\//i.test(marketingUrl))) return NextResponse.json({ error: "رابط التسويق غير صالح" }, { status: 400 });
  if ([facebookUrl, instagramUrl, whatsappUrl].some((value) => value && !/^https?:\/\//i.test(value))) return NextResponse.json({ error: "روابط التواصل يجب أن تبدأ بـ https://" }, { status: 400 });
  const values = { name: textValue("name", existingSettings?.name || "الفيوم للأعلاف والدواجن"), tagline: textValue("tagline", existingSettings?.tagline || "نظام الطلبات"), branch: textValue("branch", existingSettings?.branch || "الفرع الرئيسي"), phone: textValue("phone", existingSettings?.phone || ""), secondary_phone: textValue("secondary_phone", existingSettings?.secondary_phone || ""), staff_name: textValue("staff_name", existingSettings?.staff_name || "").trim(), marketing_url: marketingUrl, facebook_url: facebookUrl, instagram_url: instagramUrl, whatsapp_url: whatsappUrl, visitor_message: visitorMessage, milestone_count: Number.isFinite(milestoneCount) && milestoneCount > 0 ? milestoneCount : Number(existingSettings?.milestone_count) || 1, milestone_reward: Number.isFinite(milestoneReward) && milestoneReward >= 0 ? milestoneReward : Number(existingSettings?.milestone_reward) || 1, show_target_to_staff: showTargetToStaff, ad_display_duration_seconds: Number.isFinite(adDisplayDurationSeconds) && adDisplayDurationSeconds >= 5 ? Math.min(adDisplayDurationSeconds, 60) : Number(existingSettings?.ad_display_duration_seconds) || 10, ad_rotation_mode: ["scroll", "carousel"].includes(adRotationMode) ? adRotationMode : existingSettings?.ad_rotation_mode === "carousel" ? "carousel" : "scroll", ad_auto_play: adAutoPlay, ad_show_advertiser_name: adShowAdvertiserName, ad_show_expiry: adShowExpiry, ad_show_reward_badge: adShowRewardBadge, ad_popup_enabled: adPopupEnabled, ad_popup_duration_seconds: Number.isFinite(adPopupDurationSeconds) && adPopupDurationSeconds >= 5 ? Math.min(adPopupDurationSeconds, 60) : Number(existingSettings?.ad_popup_duration_seconds) || 10, ad_popup_delay_seconds: Number.isFinite(adPopupDelaySeconds) && adPopupDelaySeconds >= 0 ? Math.min(adPopupDelaySeconds, 30) : Number(existingSettings?.ad_popup_delay_seconds) || 0, ad_popup_frequency: ["session", "visit"].includes(adPopupFrequency) ? adPopupFrequency : "session" };
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
  const { data, error } = await database.from("site_settings").upsert({ id: 1, ...values, ...passwords, logo_url }, { onConflict: "id" }).select("id, name, tagline, branch, phone, secondary_phone, logo_url, staff_name, marketing_url, facebook_url, instagram_url, whatsapp_url, visitor_message, milestone_count, milestone_reward, show_target_to_staff, ad_display_duration_seconds, ad_rotation_mode, ad_auto_play, ad_show_advertiser_name, ad_show_expiry, ad_show_reward_badge, ad_popup_enabled, ad_popup_duration_seconds, ad_popup_delay_seconds, ad_popup_frequency").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (previous && (previous.milestone_count !== values.milestone_count || previous.milestone_reward !== values.milestone_reward)) {
    await database.from("reward_rate_history").insert({ milestone_count: values.milestone_count, milestone_reward: values.milestone_reward, effective_from: new Date().toISOString() });
  }
  const { data: rateHistory } = await database.from("reward_rate_history").select("*").order("effective_from", { ascending: true });
  return NextResponse.json({ ...data, reward_rate_history: rateHistory || [] });
}
