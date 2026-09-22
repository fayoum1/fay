"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Eye,
  ExternalLink,
  Heart,
  MessageCircle,
  Phone,
  Share2,
} from "lucide-react";

type Advertisement = {
  id: number;
  advertiser_name: string;
  phone?: string | null;
  title: string;
  description?: string | null;
  media_type: string;
  image_url?: string | null;
  video_url?: string | null;
  target_url?: string | null;
  whatsapp?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  views?: number;
  clicks?: number;
  likes?: number;
  referrals?: number;
  advertiser_profile?: {
    display_name: string;
    phone: string;
    role: string;
    profile_image_url?: string | null;
    cover_image_url?: string | null;
  } | null;
  watch_required_seconds?: number | null;
  reward_campaign?: {
    reward_mode: "points" | "discount" | "gift" | "cash";
    reward_badge: string;
    max_recipients: number | null;
    per_user_limit: number;
    payout_mode: "fixed" | "pool";
    actions: Array<{
      action_type: "referral" | "view" | "like" | "share";
      required_seconds?: number | null;
      max_rewards?: number | null;
    }>;
  } | null;
  other_ads?: Advertisement[];
};

const rewardActionLabels = {
  referral: "إحالة زائر جديد عبر رابطك",
  view: "مشاهدة الفيديو للمدة المطلوبة",
  like: "الإعجاب بالإعلان",
  share: "مشاركة الإعلان",
};

function formatCount(value?: number) {
  const count = Number(value || 0);
  if (count < 1000) return String(count);
  const divisor = count >= 1_000_000 ? 1_000_000 : 1000;
  const suffix = divisor === 1_000_000 ? "M" : "K";
  const compact = count / divisor;
  return `${compact >= 10 ? Math.floor(compact) : Number(compact.toFixed(1))}${suffix}`;
}

function getAdvertisementRemainingMs(startValue?: string | null, endValue?: string | null, now = Date.now()) {
  if (!endValue) return null;
  const endTime = new Date(endValue);
  if (Number.isNaN(endTime.getTime())) return null;
  if (startValue) {
    const startTime = new Date(startValue);
    if (!Number.isNaN(startTime.getTime()) && now < startTime.getTime()) {
      return Math.max(0, startTime.getTime() - now);
    }
  }
  return Math.max(0, endTime.getTime() - now);
}

function formatAdvertisementCountdown(startValue?: string | null, endValue?: string | null, now = Date.now()) {
  const remainingMs = getAdvertisementRemainingMs(startValue, endValue, now);
  if (remainingMs === null) return "غير محدد";
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (part: number) => String(part).padStart(2, "0");
  if (days > 0) return `${days} يوم ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function formatAdvertisementExpiry(value?: string | null) {
  if (!value) return "غير محدد";
  const expiry = new Date(value);
  if (Number.isNaN(expiry.getTime())) return "غير محدد";
  return expiry.toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" });
}

type MarketUser = {
  account_type?: "ordinary" | "market";
  referral_code?: string | null;
};

export default function AdvertisementProfile({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ref?: string }>;
}) {
  const [advertisement, setAdvertisement] = useState<Advertisement | null>(
    null,
  );
  const [error, setError] = useState("");
  const [liked, setLiked] = useState(false);
  const [watchRewardSent, setWatchRewardSent] = useState(false);
  const [user, setUser] = useState<MarketUser | null>(null);
  const [referralCode, setReferralCode] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [interactionMessage, setInteractionMessage] = useState("");
  const [showRewardGate, setShowRewardGate] = useState(false);
  const [watchLoginPrompted, setWatchLoginPrompted] = useState(false);
  const [countdownNow, setCountdownNow] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const updateNow = () => setCountdownNow(Date.now());
    updateNow();
    const tick = window.setInterval(updateNow, 1000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !advertisement?.video_url) return;

    const playWithSound = () => {
      video.muted = false;
      void video.play().catch(() => undefined);
    };

    video.muted = false;
    void video.play().catch(() => {
      video.muted = true;
      void video.play().catch(() => undefined);
      window.addEventListener("pointerdown", playWithSound, { once: true });
    });

    return () => window.removeEventListener("pointerdown", playWithSound);
  }, [advertisement?.video_url]);

  const visitorKey = () => {
    const key = window.localStorage.getItem("advertisement_visitor_key");
    if (key) return key;
    const created = `${crypto.randomUUID()}-${Date.now()}`;
    window.localStorage.setItem("advertisement_visitor_key", created);
    return created;
  };

  const engage = (id: number, eventType: "view" | "click" | "like" | "share") =>
    fetch(`/api/advertisements/${id}/engagement`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: eventType,
        visitor_key: visitorKey(),
      }),
    }).then(async (response) => {
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "تعذر تسجيل التفاعل");
      return result;
    });

  const submitWatchReward = (seconds: number) => {
    if (
      watchRewardSent ||
      !advertisement?.watch_required_seconds ||
      seconds < advertisement.watch_required_seconds
    )
      return;
    if (user?.account_type !== "ordinary") {
      if (!watchLoginPrompted) {
        setWatchLoginPrompted(true);
        setShowRewardGate(true);
      }
      return;
    }
    setWatchRewardSent(true);
    void fetch(`/api/advertisements/${advertisement.id}/watch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ watched_seconds: Math.floor(seconds) }),
    }).catch(() => undefined);
  };

  useEffect(() => {
    Promise.all([params, searchParams]).then(([{ id }, { ref }]) => {
      fetch("/api/sellers/account")
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => {
          setUser(data?.user || null);
          setReferralCode(data?.user?.referral_code || "");
        })
        .catch(() => undefined);
      if (ref)
        void fetch(`/api/advertisements/${id}/referral`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            referral_code: ref,
            visitor_key: visitorKey(),
          }),
        }).catch(() => undefined);
      return fetch(`/api/advertisements/${id}`)
        .then(async (response) => {
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.error || "الإعلان غير متاح");
          setAdvertisement(data);
          void engage(Number(id), "view").then((result) => {
            if (result?.liked) setLiked(true);
            setAdvertisement((current) =>
              current ? { ...current, views: Number(result?.views || current.views || 0) } : current,
            );
          }).catch(() => undefined);
        })
        .catch((reason: Error) => setError(reason.message));
    });
  }, [params, searchParams]);

  const requireRewardsAccount = () => {
    if (user?.account_type === "ordinary") return true;
    setShowRewardGate(true);
    return false;
  };

  const shareAdvertisement = async () => {
    if (!requireRewardsAccount()) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("ref");
    if (referralCode) url.searchParams.set("ref", referralCode);
    try {
      if (navigator.share)
        await navigator.share({
          title: advertisement?.title,
          text: advertisement?.description || "شاهد هذا الإعلان",
          url: url.toString(),
        });
      else {
        await navigator.clipboard.writeText(url.toString());
        setShareMessage("تم نسخ رابط المشاركة");
      }
      const result = await engage(advertisement!.id, "share");
      if (result.reward_status === "pending")
        setShareMessage("تمت المشاركة وتسجيل المكافأة بانتظار اعتماد الإدارة.");
      else if (advertisement?.reward_campaign?.actions.some((action) => action.action_type === "referral"))
        setShareMessage("تمت مشاركة رابطك الخاص. شاركه مع أكثر من شخص؛ كل زائر جديد يفتح الإعلان من رابطك يُسجل كإحالة وفق حدود الحملة.");
      else if (!result.counted)
        setShareMessage("تمت المشاركة، وقد سُجلت مكافأتها مسبقًا.");
    } catch {
      setShareMessage("يمكنك نسخ رابط الإعلان من المتصفح");
    }
  };

  const trackClick = () => {
    void engage(advertisement!.id, "click").then((result) => {
      setAdvertisement((current) => current ? { ...current, clicks: Number(result.clicks || 0) } : current);
    }).catch(() => undefined);
  };

  if (error)
    return (
      <main
        className="grid min-h-screen place-items-center bg-[#f7f6f2] p-5 text-center"
        dir="rtl"
      >
        <div>
          <p className="font-bold text-[#a9584d]">{error}</p>
          <Link
            href="/"
            className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#173f3a]"
          >
            <ArrowRight size={16} /> العودة للرئيسية
          </Link>
        </div>
      </main>
    );
  if (!advertisement)
    return (
      <main
        className="grid min-h-screen place-items-center bg-[#f7f6f2] text-sm text-[#72807a]"
        dir="rtl"
      >
        جار تحميل الإعلان...
      </main>
    );

  const whatsapp = (advertisement.whatsapp || advertisement.phone)?.replace(
    /\D/g,
    "",
  );
  const remainingSaleLabel = countdownNow === null
    ? "جارٍ التحديث..."
    : formatAdvertisementCountdown(advertisement.starts_at, advertisement.ends_at, countdownNow);
  const drawExpiryLabel = formatAdvertisementExpiry(advertisement.ends_at);
  const advertisementStartLabel = formatAdvertisementExpiry(advertisement.starts_at);
  return (
    <main
      className="min-h-screen bg-[#f7f6f2] py-0 text-[#202a27] sm:px-6 sm:py-10"
      dir="rtl"
    >
      {showRewardGate && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[#173f3a66] p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reward-gate-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-[#dedfd8] bg-[#fffdf9] p-6 shadow-2xl">
            <h2
              id="reward-gate-title"
              className="font-display text-2xl font-bold text-[#173f3a]"
            >
              أنشئ حساب مكافآت أولًا
            </h2>
            <p className="mt-3 text-sm leading-7 text-[#596963]">
              للاستفادة من تفاعلك والحصول على النقاط أو المكافآت، أنشئ حساب
              مكافآت بالاسم ورقم الهاتف وكلمة السر.
            </p>
            <div className="mt-5 grid gap-2">
              <Link
                href="/sell?account=ordinary&mode=register"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[#173f3a] px-4 text-sm font-bold text-white"
                onClick={() => setShowRewardGate(false)}
              >
                إنشاء حساب مكافآت
              </Link>
              <Link
                href="/sell?account=ordinary&mode=login"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-[#dedfd8] bg-white px-4 text-sm font-bold text-[#173f3a]"
                onClick={() => setShowRewardGate(false)}
              >
                لدي حساب بالفعل
              </Link>
              <button
                type="button"
                onClick={() => setShowRewardGate(false)}
                className="h-10 text-sm font-bold text-[#72807a]"
              >
                ليس الآن
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="mx-auto w-full max-w-3xl px-0 pb-5 sm:px-2">
        <header className="sticky top-0 z-30 border-b border-[#e9ece7] bg-[#fffdf9]/90 px-3 py-2 backdrop-blur-md sm:px-4">
          <div className="mx-auto flex max-w-[760px] items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden">
              {advertisement.advertiser_profile?.profile_image_url ? (
                <img
                  src={advertisement.advertiser_profile.profile_image_url}
                  alt=""
                  className="size-9 rounded-full object-cover ring-2 ring-[#eef1ee]"
                />
              ) : (
                <div className="grid size-9 place-items-center rounded-full bg-[#173f3a] text-xs font-black text-[#f4c95d] ring-2 ring-[#eef1ee]">
                  {advertisement.advertiser_name.charAt(0)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-[#173f3a]">
                  {advertisement.advertiser_profile?.display_name ||
                    advertisement.advertiser_name}
                </p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="text-[9px] font-bold text-[#c48738]">إعلان ممول</span>
                  {advertisement.reward_campaign?.reward_badge && (
                    <span className="rounded-full bg-[#e9f4ee] px-1.5 py-0.5 text-[8px] font-black text-[#39704f]">
                      {advertisement.reward_campaign.reward_badge}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Link
              href="/"
              aria-label="العودة إلى الرئيسية"
              title="الرئيسية"
              className="order-last grid size-9 shrink-0 place-items-center rounded-full border border-[#dedfd8] bg-white text-[#173f3a] shadow-sm"
            >
              <ArrowRight size={17} className="rotate-180" />
            </Link>
          </div>
        </header>
        <article className="overflow-hidden border-y border-[#dedfd8] bg-[#fffdf9] shadow-[0_6px_18px_rgba(23,63,58,0.08)] sm:mx-auto sm:max-w-[760px] sm:rounded-[24px] sm:border sm:shadow-[0_12px_30px_rgba(23,63,58,0.08)]">
          {advertisement.advertiser_profile?.cover_image_url && (
            <div className="h-32 overflow-hidden bg-[#edf2ee] sm:h-44">
              <img
                src={advertisement.advertiser_profile.cover_image_url}
                alt="غلاف المعلن"
                className="h-full w-full object-cover object-center"
                loading="eager"
              />
            </div>
          )}
          {advertisement.media_type === "video" && advertisement.video_url ? (
            <div className="bg-[#f2f3f0] p-0 sm:p-3">
              <div className="flex w-full justify-center overflow-hidden bg-white sm:rounded-[22px]">
                <video
                  ref={videoRef}
                  src={advertisement.video_url}
                  controls
                  autoPlay
                  loop
                  playsInline
                  preload="auto"
                  onTimeUpdate={(event) =>
                    submitWatchReward(event.currentTarget.currentTime)
                  }
                  className="block h-auto max-h-[70dvh] w-full max-w-full bg-[#18201e] object-contain"
                />
              </div>
            </div>
          ) : (
            advertisement.image_url && (
              <div className="bg-[#f2f3f0] p-0 sm:p-3">
                <div className="relative mx-auto aspect-[4/5] w-full max-w-[640px] overflow-hidden bg-white sm:rounded-[22px]">
                  <img
                    src={advertisement.image_url}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 size-full scale-110 object-cover opacity-35 blur-xl"
                  />
                  <img
                    src={advertisement.image_url}
                    alt={advertisement.title}
                    className="relative z-10 size-full object-contain"
                  />
                </div>
              </div>
            )
          )}
          <div className="border-b border-[#e7e7df] bg-[#f8faf7] px-3 py-3 sm:px-7 sm:py-4">
            <div className="grid grid-cols-2 gap-2 sm:flex sm:w-full sm:items-center sm:justify-evenly sm:gap-2 sm:divide-x sm:divide-x-reverse sm:divide-[#e1e5df]">
              <div aria-label="المشاهدات" title="المشاهدات" className="inline-flex min-w-0 items-center justify-center gap-1.5 rounded-2xl border border-[#e1e5df] bg-white px-3 py-2.5 text-[#173f3a] shadow-[0_4px_10px_rgba(23,63,58,0.03)]">
                <Eye size={16} className="sm:size-[18px]" />
                <span className="text-[11px] font-black tabular-nums sm:text-xs">{formatCount(advertisement.views)}</span>
              </div>
              {whatsapp && (
                <a
                  aria-label="واتساب"
                  title="واتساب"
                  onClick={(event) => {
                    if (!requireRewardsAccount()) event.preventDefault();
                    else trackClick();
                  }}
                  href={`https://wa.me/${whatsapp}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-w-0 items-center justify-center gap-1.5 rounded-2xl border border-[#d8ebdf] bg-[#f1faf4] px-3 py-2.5 text-[#16804a] shadow-[0_4px_10px_rgba(23,63,58,0.03)]"
                >
                  <MessageCircle size={16} className="sm:size-[18px]" />
                  <span className="text-[11px] font-black tabular-nums sm:text-xs">{formatCount(advertisement.clicks)}</span>
                </a>
              )}
              {whatsapp && (
                <a
                  aria-label="اتصال"
                  title="اتصال"
                  onClick={(event) => {
                    if (!requireRewardsAccount()) event.preventDefault();
                    else trackClick();
                  }}
                  href={`tel:${whatsapp}`}
                  className="inline-flex min-w-0 items-center justify-center gap-1.5 rounded-2xl border border-[#e1e5df] bg-white px-3 py-2.5 text-[#173f3a] shadow-[0_4px_10px_rgba(23,63,58,0.03)]"
                >
                  <Phone size={16} className="sm:size-[18px]" />
                  <span className="text-[11px] font-black tabular-nums sm:text-xs">{formatCount(advertisement.clicks)}</span>
                </a>
              )}
              {advertisement.target_url && (
                <a
                  aria-label="فتح الرابط الخارجي"
                  title="الرابط الخارجي"
                  onClick={(event) => {
                    if (!requireRewardsAccount()) event.preventDefault();
                    else trackClick();
                  }}
                  href={advertisement.target_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-w-0 items-center justify-center gap-1.5 rounded-2xl border border-[#e1e5df] bg-white px-3 py-2.5 text-[#173f3a] shadow-[0_4px_10px_rgba(23,63,58,0.03)]"
                >
                  <ExternalLink size={16} className="sm:size-[18px]" />
                  <span className="text-[11px] font-black tabular-nums sm:text-xs">{formatCount(advertisement.clicks)}</span>
                </a>
              )}
              <button
                type="button"
                aria-label="مشاركة الإعلان"
                title="مشاركة"
                onClick={() => void shareAdvertisement()}
                className="inline-flex min-w-0 items-center justify-center gap-1.5 rounded-2xl border border-[#e1e5df] bg-white px-3 py-2.5 text-[#173f3a] shadow-[0_4px_10px_rgba(23,63,58,0.03)]"
              >
                <Share2 size={16} className="sm:size-[18px]" />
                <span className="text-[11px] font-black tabular-nums sm:text-xs">{formatCount(advertisement.referrals)}</span>
              </button>
              <button
                type="button"
                aria-label={liked ? "تم الإعجاب" : "إعجاب"}
                title={liked ? "تم الإعجاب" : "إعجاب"}
                onClick={() => {
                  if (!requireRewardsAccount()) return;
                  setInteractionMessage("");
                  void engage(advertisement.id, "like")
                    .then((result) => {
                      setLiked(Boolean(result.liked));
                      setAdvertisement((current) =>
                        current ? { ...current, likes: Number(result.likes || 0) } : current,
                      );
                      if (result.reward_status === "pending")
                        setInteractionMessage("تم تسجيل تفاعلك، وستظهر قيمة المكافأة بعد اعتماد الإدارة.");
                      else if (result.reward_status === "approved")
                        setInteractionMessage("تم اعتماد مكافأة هذا التفاعل مسبقًا.");
                      else if (!result.counted)
                        setInteractionMessage("تم تسجيل إعجابك مسبقًا.");
                      else
                        setInteractionMessage("تم تسجيل الإعجاب. لا توجد مكافأة إعجاب فعالة لهذا الإعلان.");
                    })
                    .catch((reason: Error) => setInteractionMessage(reason.message));
                }}
                className={`inline-flex min-w-0 items-center justify-center gap-1.5 rounded-2xl border px-3 py-2.5 shadow-[0_4px_10px_rgba(23,63,58,0.03)] ${liked ? "border-[#f4d4de] bg-[#fff1f5] text-[#a13f61]" : "border-[#e1e5df] bg-white text-[#173f3a]"}`}
              >
                <Heart size={16} className="sm:size-[18px]" fill={liked ? "currentColor" : "none"} />
                <span className="text-[11px] font-black tabular-nums sm:text-xs">{formatCount(advertisement.likes)}</span>
              </button>
            </div>
            {advertisement.reward_campaign?.reward_badge && (
              <p className="mt-3 text-sm font-black text-[#39704f]">
                {advertisement.reward_campaign.reward_badge}
              </p>
            )}
            {advertisement.watch_required_seconds && (
              <p className="mt-1 text-xs font-bold text-[#72807a]">
                شاهد الفيديو لمدة {advertisement.watch_required_seconds} ثانية للحصول على مكافأة الحملة إن كنت مسجلًا.
              </p>
            )}
            {shareMessage && (
              <p className="mt-3 text-xs font-bold text-[#39704f]">
                {shareMessage}
              </p>
            )}
            {interactionMessage && (
              <p className="mt-3 text-xs font-bold text-[#39704f]">
                {interactionMessage}
              </p>
            )}
            <h1 className="mt-4 font-display text-[1.55rem] font-black leading-8 text-[#173f3a] sm:mt-5 sm:text-[2rem] sm:leading-[1.25]">
              {advertisement.title}
            </h1>
            <p className="mt-2 text-xs text-[#596963] sm:text-sm">
              بواسطة: {advertisement.advertiser_profile?.role || "معلن"}
            </p>
          </div>
          <div className="px-3 pb-4 pt-3 sm:px-7 sm:pb-7 sm:pt-4">
            <p className="whitespace-pre-line text-sm leading-7 text-[#596963] sm:text-base sm:leading-8">
              {advertisement.description}
            </p>
            {!!advertisement.reward_campaign?.actions.length && (
              <section className="mt-5 border-y border-[#e7d7b8] bg-[#fff9ed] px-4 py-4">
                <h2 className="font-display text-lg font-bold text-[#173f3a]">
                  مكافآت هذا الإعلان
                </h2>
                <div className="mt-2 grid gap-2">
                  {advertisement.reward_campaign.actions.map((action) => (
                      <p key={action.action_type} className="text-sm font-bold text-[#596963]">
                        {action.action_type === "referral"
                          ? "شارك رابطك الخاص مع أكثر من شخص. عندما يفتح زائر جديد الإعلان من رابطك تُسجل لك إحالة وتدخل في مكافآت الحملة وفق حدودها."
                          : `حقق ${rewardActionLabels[action.action_type]} للدخول في مكافآت الحملة${action.action_type === "view" && action.required_seconds ? ` بعد ${action.required_seconds} ثانية` : ""}.`}
                      </p>
                  ))}
                </div>
                <p className="mt-2 text-xs leading-6 text-[#8a611f]">
                  قيمة المكافأة غير معلنة. يحسب النظام النتيجة النهائية بعد انتهاء الحملة، ولا يظهر لك المبلغ أو النقاط إلا بعد اعتماد الإدارة.
                </p>
              </section>
            )}
            <div className="mt-5 rounded-2xl border border-[#d9c8a4] bg-gradient-to-br from-[#fffdf8] via-[#fffaf0] to-[#f5efe3] p-3 shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
              <div className="flex items-center justify-between gap-3 rounded-xl bg-[#f5efe3] px-2.5 py-2 ring-1 ring-[#d9c8a4]">
                <span className="text-[11px] font-black text-[#0f172a]">الوقت المتبقي للسحب</span>
                <span className="tabular-nums text-[11px] font-black text-[#0f172a]">{remainingSaleLabel}</span>
              </div>
              <div className="mt-2 text-[10px] font-extrabold text-[#111827]">تاريخ بدء الإعلان: {advertisementStartLabel}</div>
              <div className="mt-1 text-[10px] font-extrabold text-[#111827]">تاريخ انتهاء الإعلان: {drawExpiryLabel}</div>
            </div>
          </div>
        </article>
        {!!advertisement.other_ads?.length && (
          <section className="mt-5">
            <h2 className="mb-3 text-center font-display text-xl font-bold text-[#173f3a]">
              إعلانات أخرى للمعلن
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {advertisement.other_ads.map((item) => (
                <Link
                  key={item.id}
                  href={`/ads/${item.id}`}
                  className="rounded-lg border border-[#dedfd8] bg-[#fffdf9] p-4"
                >
                  <p className="font-bold text-[#173f3a]">{item.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#72807a]">
                    {item.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
