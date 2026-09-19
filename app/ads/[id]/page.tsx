"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
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
  views?: number;
  clicks?: number;
  likes?: number;
  advertiser_profile?: {
    display_name: string;
    phone: string;
    role: string;
    profile_image_url?: string | null;
  } | null;
  watch_required_seconds?: number | null;
  reward_campaign?: {
    reward_mode: "points" | "discount" | "gift" | "cash";
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
  return (
    <main
      className="min-h-screen bg-[#f7f6f2] px-4 py-6 text-[#202a27] sm:px-6 sm:py-10"
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
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="mb-5 inline-flex items-center gap-2 rounded-lg border border-[#dedfd8] bg-white px-3 py-2 text-sm font-bold text-[#173f3a]"
        >
          <ArrowRight size={16} /> الرئيسية
        </Link>
        <article className="overflow-hidden rounded-xl border border-[#dedfd8] bg-[#fffdf9] shadow-[0_12px_32px_#173f3a0d]">
          <div className="border-b border-[#e7e7df] p-5 sm:p-7">
            <p className="text-xs font-bold text-[#c48738]">إعلان ممول</p>
            <div className="mt-3 flex items-center gap-3">
              {advertisement.advertiser_profile?.profile_image_url ? (
                <img
                  src={advertisement.advertiser_profile.profile_image_url}
                  alt=""
                  className="size-12 rounded-xl object-cover"
                />
              ) : (
                <div className="grid size-12 place-items-center rounded-xl bg-[#173f3a] font-black text-[#f4c95d]">
                  {advertisement.advertiser_name.charAt(0)}
                </div>
              )}
              <div>
                <p className="text-xs text-[#72807a]">المعلن</p>
                <p className="font-bold text-[#173f3a]">
                  {advertisement.advertiser_profile?.display_name ||
                    advertisement.advertiser_name}
                </p>
              </div>
            </div>
          </div>
          {advertisement.media_type === "video" && advertisement.video_url ? (
            <div>
              <div className="relative mx-auto aspect-[9/16] w-full max-w-[430px] overflow-hidden bg-black shadow-[0_18px_50px_#173f3a26] sm:my-6 sm:rounded-2xl">
                <video
                  src={advertisement.video_url}
                  muted
                  autoPlay
                  loop
                  playsInline
                  aria-hidden="true"
                  className="absolute inset-0 size-full scale-110 object-cover opacity-45 blur-xl"
                />
                <video
                  src={advertisement.video_url}
                  controls
                  playsInline
                  preload="metadata"
                  onTimeUpdate={(event) =>
                    submitWatchReward(event.currentTarget.currentTime)
                  }
                  className="relative z-10 size-full object-contain"
                />
              </div>
              {advertisement.watch_required_seconds && (
                <p className="px-5 py-3 text-center text-xs font-bold text-[#72807a]">
                  شاهد الفيديو لمدة {advertisement.watch_required_seconds} ثانية
                  للحصول على مكافأة الحملة إن كنت مسجلًا.
                </p>
              )}
            </div>
          ) : (
            advertisement.image_url && (
              <div className="relative mx-auto aspect-[9/16] w-full max-w-[430px] overflow-hidden bg-[#18201e] shadow-[0_18px_50px_#173f3a26] sm:my-6 sm:rounded-2xl">
                <img
                  src={advertisement.image_url}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 size-full scale-110 object-cover opacity-45 blur-xl"
                />
                <img
                  src={advertisement.image_url}
                  alt={advertisement.title}
                  className="relative z-10 size-full object-contain"
                />
              </div>
            )
          )}
          <div className="border-b border-[#e7e7df] px-5 py-4 sm:px-7">
            <div className="flex flex-wrap gap-2">
              {whatsapp && (
                <a
                  aria-label="واتساب"
                  title="واتساب"
                  onClick={(event) => {
                    if (!requireRewardsAccount()) event.preventDefault();
                    else void engage(advertisement.id, "click");
                  }}
                  href={`https://wa.me/${whatsapp}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex size-11 items-center justify-center rounded-lg bg-[#25a866] text-white"
                >
                  <MessageCircle size={19} />
                </a>
              )}
              {whatsapp && (
                <a
                  aria-label="اتصال"
                  title="اتصال"
                  onClick={(event) => {
                    if (!requireRewardsAccount()) event.preventDefault();
                    else void engage(advertisement.id, "click");
                  }}
                  href={`tel:${whatsapp}`}
                  className="inline-flex size-11 items-center justify-center rounded-lg bg-[#173f3a] text-white"
                >
                  <Phone size={19} />
                </a>
              )}
              {advertisement.target_url && (
                <a
                  aria-label="فتح الرابط الخارجي"
                  title="الرابط الخارجي"
                  onClick={(event) => {
                    if (!requireRewardsAccount()) event.preventDefault();
                    else void engage(advertisement.id, "click");
                  }}
                  href={advertisement.target_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex size-11 items-center justify-center rounded-lg border border-[#dedfd8] bg-white text-[#173f3a]"
                >
                  <ExternalLink size={19} />
                </a>
              )}
              <button
                type="button"
                aria-label="مشاركة الإعلان"
                title="مشاركة"
                onClick={() => void shareAdvertisement()}
                className="inline-flex size-11 items-center justify-center rounded-lg border border-[#dedfd8] bg-white text-[#173f3a]"
              >
                <Share2 size={19} />
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
                className={`inline-flex size-11 items-center justify-center rounded-lg ${liked ? "bg-[#f7d6df] text-[#934563]" : "border border-[#dedfd8] bg-white text-[#173f3a]"}`}
              >
                <Heart size={19} fill={liked ? "currentColor" : "none"} />
              </button>
            </div>
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
            <h1 className="mt-5 font-display text-2xl font-bold text-[#173f3a] sm:text-3xl">
              {advertisement.title}
            </h1>
            <p className="mt-2 text-sm text-[#596963]">
              بواسطة: {advertisement.advertiser_profile?.role || "معلن"}
            </p>
          </div>
          <div className="p-5 sm:p-7">
            <p className="whitespace-pre-line text-base leading-8 text-[#596963]">
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
            <div className="mt-5 flex items-center gap-3 text-xs font-bold text-[#89918c]">
              <span>المشاهدات: {advertisement.views || 0}</span>
              <span>النقرات: {advertisement.clicks || 0}</span>
              <span>الإعجابات: {advertisement.likes || 0}</span>
            </div>
          </div>
        </article>
        {!!advertisement.other_ads?.length && (
          <section className="mt-5">
            <h2 className="mb-3 font-display text-xl font-bold text-[#173f3a]">
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
