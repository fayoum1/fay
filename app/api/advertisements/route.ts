import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getMarketUser } from "@/lib/market-auth";
import { getRewardCampaignStats } from "@/lib/reward-campaign-stats";

function database() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
}

export async function GET(request: NextRequest) {
  const client = database();
  if (!client) return NextResponse.json({ advertisements: [], packages: [] });
  const user = await getMarketUser(request);
  const now = new Date().toISOString();
  const [{ data: advertisements, error }, { data: packages }] = await Promise.all([
    client.from("advertisements").select("id,advertiser_name,phone,title,description,media_type,image_url,video_url,target_url,whatsapp,featured,display_order,starts_at,ends_at,views,clicks").eq("status", "مقبول").in("payment_status", ["غير مطلوب", "تم الدفع"]).or(`starts_at.is.null,starts_at.lte.${now}`).or(`ends_at.is.null,ends_at.gte.${now}`).order("featured", { ascending: false }).order("display_order").order("created_at", { ascending: false }),
    client.from("advertisement_packages").select("id,name,duration_days,price").eq("active", true).order("price"),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const advertisementIds = (advertisements || []).map((advertisement) => advertisement.id);
  const { data: campaigns } = advertisementIds.length
    ? await client
        .from("ad_reward_campaigns")
          .select("id,advertisement_id,name,reward_mode,budget,status,ad_reward_actions(reward_points,reward_amount,reward_label,enabled)")
        .in("advertisement_id", advertisementIds)
        .eq("status", "active")
        .or(`starts_at.is.null,starts_at.lte.${now}`)
        .or(`ends_at.is.null,ends_at.gte.${now}`)
        .order("created_at", { ascending: false })
    : { data: [] };
  const rewardBadges = new Map<number, string>();
  for (const campaign of campaigns || []) {
    if (rewardBadges.has(campaign.advertisement_id)) continue;
    const action = (campaign.ad_reward_actions || []).find((item) => item.enabled);
    if (!action) continue;
    const amount = Number(action.reward_amount || 0);
    const points = Number(action.reward_points || 0);
    const badge = campaign.reward_mode === "cash"
      ? amount > 0 ? `مكافأة نقدية = ${amount} جنيه` : Number(campaign.budget || 0) > 0 ? `مكافأة نقدية = ${Number(campaign.budget)} جنيه` : "مكافأة نقدية"
      : campaign.reward_mode === "discount"
        ? action.reward_label || "خصم"
        : campaign.reward_mode === "gift"
          ? action.reward_label || "هدية"
          : points > 0 ? `${points} نقطة` : "مكافأة";
    rewardBadges.set(campaign.advertisement_id, badge);
  }
  const ownedAdvertisementIds = (advertisements || [])
    .filter((advertisement) => user?.account_type === "market" && advertisement.phone === user.phone)
    .map((advertisement) => advertisement.id);
  const { data: ownedCampaigns, error: ownedCampaignsError } = ownedAdvertisementIds.length
    ? await client
        .from("ad_reward_campaigns")
        .select("id,advertisement_id,name,reward_mode,budget,status")
        .in("advertisement_id", ownedAdvertisementIds)
        .order("created_at", { ascending: false })
    : { data: [], error: null };
  if (ownedCampaignsError) return NextResponse.json({ error: ownedCampaignsError.message }, { status: 500 });
  let campaignStats = new Map();
  try {
    campaignStats = await getRewardCampaignStats(client, ownedCampaigns.map((campaign) => campaign.id));
  } catch (reason) {
    return NextResponse.json({ error: reason instanceof Error ? reason.message : "تعذر حساب إحصاءات الحملات" }, { status: 500 });
  }
  const publicAdvertisements = await Promise.all((advertisements || []).map(async (advertisement) => {
    const isOwner = user?.account_type === "market" && advertisement.phone === user.phone;
    let likes = 0;
    let referrals = 0;
    if (isOwner) {
      const campaignIds = (campaigns || [])
        .filter((campaign) => campaign.advertisement_id === advertisement.id)
        .map((campaign) => campaign.advertisement_id);
      const [{ count: likesCount }, { count: referralCount }] = await Promise.all([
        client.from("advertisement_engagements").select("id", { count: "exact", head: true }).eq("advertisement_id", advertisement.id).eq("event_type", "like"),
        campaignIds.length
          ? client.from("ad_referrals").select("id,ad_reward_campaigns!inner(advertisement_id)", { count: "exact", head: true }).eq("ad_reward_campaigns.advertisement_id", advertisement.id)
          : Promise.resolve({ count: 0 }),
      ]);
      likes = Number(likesCount || 0);
      referrals = Number(referralCount || 0);
    }
    const { phone: _phone, views, clicks, ...publicAdvertisement } = advertisement;
    return {
      ...publicAdvertisement,
      reward_badge: rewardBadges.get(advertisement.id) || null,
      is_owner: isOwner,
      ...(isOwner ? {
        stats: { views: Number(views || 0), clicks: Number(clicks || 0), likes, referrals },
        reward_campaigns: ownedCampaigns
          .filter((campaign) => campaign.advertisement_id === advertisement.id)
          .map((campaign) => ({
            id: campaign.id,
            name: campaign.name,
            reward_mode: campaign.reward_mode,
            budget: Number(campaign.budget || 0),
            status: campaign.status,
            stats: campaignStats.get(campaign.id),
          })),
      } : {}),
    };
  }));
  return NextResponse.json({ advertisements: publicAdvertisements, packages: packages || [] });
}

export async function POST(request: NextRequest) {
  const user = await getMarketUser(request);
  if (!user) return NextResponse.json({ error: "سجل الدخول أولًا لإرسال إعلان" }, { status: 401 });
  const client = database();
  if (!client) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const form = await request.formData();
  const title = String(form.get("title") || "").trim().slice(0, 120);
  const description = String(form.get("description") || "").trim().slice(0, 500);
  const mediaType = ["text", "image", "video", "text_image"].includes(String(form.get("media_type"))) ? String(form.get("media_type")) : "text";
  const targetUrl = String(form.get("target_url") || "").trim().slice(0, 500);
  const whatsapp = String(form.get("whatsapp") || user.phone).trim().slice(0, 30);
  const packageId = Number(form.get("package_id"));
  const rewardEnabled = String(form.get("reward_enabled")) === "true";
  const rewardMode = ["points", "discount", "gift", "cash"].includes(String(form.get("reward_mode"))) ? String(form.get("reward_mode")) : "points";
  const payoutMode = form.get("payout_mode") === "pool" ? "pool" : "fixed";
  const actionType = ["referral", "view", "like", "share"].includes(String(form.get("action_type"))) ? String(form.get("action_type")) : "referral";
  const rewardPoints = Number(form.get("reward_points"));
  const rewardAmount = Number(form.get("reward_amount"));
  const rewardBudget = Number(form.get("reward_budget"));
  const maxRecipients = String(form.get("max_recipients") || "").trim();
  const requiredSeconds = Number(form.get("required_seconds"));
  if (!title || !description) return NextResponse.json({ error: "اكتب عنوان الإعلان ووصفه" }, { status: 400 });
  if (rewardEnabled && (!Number.isInteger(rewardPoints) || rewardPoints < 0 || !Number.isFinite(rewardAmount) || rewardAmount < 0 || !Number.isFinite(rewardBudget) || rewardBudget < 0 || (rewardMode === "cash" && payoutMode === "pool" && rewardBudget <= 0) || (rewardMode === "cash" && payoutMode === "fixed" && rewardAmount <= 0) || (rewardMode === "discount" && (!Number.isInteger(rewardAmount) || rewardAmount < 1 || rewardAmount > 100)) || (maxRecipients && (!Number.isInteger(Number(maxRecipients)) || Number(maxRecipients) < 1)))) return NextResponse.json({ error: "بيانات المكافأة غير صحيحة" }, { status: 400 });
  const { data: packageData } = await client.from("advertisement_packages").select("id,duration_days,price").eq("id", packageId).eq("active", true).maybeSingle();
  if (!packageData) return NextResponse.json({ error: "اختر باقة إعلانية صحيحة" }, { status: 400 });
  let imageUrl: string | null = null;
  let videoUrl: string | null = null;
  const media = form.get("media");
  if (media instanceof File && media.size) {
    const isVideo = mediaType === "video";
    const validType = isVideo ? media.type.startsWith("video/") : media.type.startsWith("image/");
    const maxSize = isVideo ? 20 * 1024 * 1024 : 5 * 1024 * 1024;
    if (!validType || media.size > maxSize) return NextResponse.json({ error: isVideo ? "الفيديو يجب أن يكون أقل من 20 ميجابايت" : "الصورة يجب أن تكون أقل من 5 ميجابايت" }, { status: 400 });
    const path = `ads/${Date.now()}-${media.name.replace(/[^a-zA-Z0-9._-]/g, "")}`;
    const upload = await client.storage.from("item-images").upload(path, media, { contentType: media.type, upsert: false });
    if (upload.error) return NextResponse.json({ error: upload.error.message }, { status: 400 });
    const publicUrl = client.storage.from("item-images").getPublicUrl(path).data.publicUrl;
    if (isVideo) videoUrl = publicUrl;
    else imageUrl = publicUrl;
  }
  if (["image", "text_image"].includes(mediaType) && !imageUrl) return NextResponse.json({ error: "أرفق صورة للإعلان" }, { status: 400 });
  if (mediaType === "video" && !videoUrl) return NextResponse.json({ error: "أرفق فيديو قصير للإعلان" }, { status: 400 });
  const { data, error } = await client.from("advertisements").insert({ advertiser_name: user.display_name, phone: user.phone, title, description, media_type: mediaType, image_url: imageUrl, video_url: videoUrl, target_url: targetUrl || null, whatsapp, package_id: packageData.id, duration_days: packageData.duration_days, price: packageData.price, payment_status: packageData.price > 0 ? "قيد الانتظار" : "غير مطلوب" }).select("id,status,admin_note").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (rewardEnabled) {
    const { data: campaign, error: campaignError } = await client.from("ad_reward_campaigns").insert({ advertisement_id: data.id, name: `${title} - حملة مكافآت`, reward_mode: rewardMode, budget: rewardBudget, max_recipients: maxRecipients ? Number(maxRecipients) : null, status: "draft" }).select("id").single();
    if (campaignError) return NextResponse.json({ error: campaignError.message }, { status: 400 });
    const effectiveRewardAmount = rewardMode === "cash" && payoutMode === "fixed" ? rewardAmount : 0;
    const rewardLabel = rewardMode === "discount" ? `خصم ${rewardAmount}%` : null;
    const { error: actionError } = await client.from("ad_reward_actions").insert({ campaign_id: campaign.id, action_type: actionType, reward_points: rewardPoints, reward_amount: effectiveRewardAmount, reward_label: rewardLabel, required_seconds: actionType === "view" ? Math.max(1, requiredSeconds || 30) : null, enabled: true });
    if (actionError) return NextResponse.json({ error: actionError.message }, { status: 400 });
  }
  return NextResponse.json(data, { status: 201 });
}