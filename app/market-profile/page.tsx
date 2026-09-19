"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Suspense } from "react";
import { ArrowRight, ExternalLink, Store } from "lucide-react";

type ProfileData = {
  user: {
    display_name: string;
    role: string;
    profile_image_url?: string | null;
    referral_code: string;
  };
  advertisements: {
    id: number;
    title: string;
    description?: string | null;
    media_type: string;
    image_url?: string | null;
    video_url?: string | null;
  }[];
};

const roles: Record<string, string> = {
  farm_owner: "صاحب مزرعة",
  trader: "تاجر",
  supplier: "مورد",
};

function MarketProfileContent() {
  const searchParams = useSearchParams();
  const referralCode = searchParams.get("referral_code");
  const [data, setData] = useState<ProfileData | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!referralCode) return;
    fetch(`/api/market-profile?referral_code=${encodeURIComponent(referralCode)}`)
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || "تعذر تحميل الملف");
        setData(result);
      })
      .catch((reason: Error) => setError(reason.message));
  }, [referralCode]);
  const displayedError = referralCode ? error : "ملف المعلن غير صحيح";
  if (displayedError)
    return (
      <main
        className="grid min-h-screen place-items-center bg-[#f7f6f2] p-5 text-center text-[#a9584d]"
        dir="rtl"
      >
        {displayedError}
      </main>
    );
  if (!data)
    return (
      <main
        className="grid min-h-screen place-items-center bg-[#f7f6f2] text-sm text-[#72807a]"
        dir="rtl"
      >
        جار تحميل الملف...
      </main>
    );
  return (
    <main
      className="min-h-screen bg-[#f7f6f2] px-4 py-6 text-[#202a27] sm:px-6 sm:py-10"
      dir="rtl"
    >
      <div className="mx-auto max-w-4xl">
        <Link
          href="/sell"
          className="mb-5 inline-flex items-center gap-2 rounded-lg border border-[#dedfd8] bg-white px-3 py-2 text-sm font-bold text-[#173f3a]"
        >
          <ArrowRight size={16} /> صفحة السوق
        </Link>
        <section className="overflow-hidden rounded-2xl border border-[#d8dfd6] bg-[#fffdf9]">
          <div className="flex flex-wrap items-center gap-4 bg-[#f7faf6] p-6">
            <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#173f3a] text-3xl font-black text-[#f4c95d]">
              {data.user.profile_image_url ? (
                <img
                  src={data.user.profile_image_url}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                data.user.display_name.charAt(0)
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-[#c48738]">ملف معلن</p>
              <h1 className="font-display text-2xl font-black text-[#173f3a]">
                {data.user.display_name}
              </h1>
              <p className="mt-1 text-sm font-bold text-[#596963]">
                {roles[data.user.role] || data.user.role}
              </p>
            </div>
          </div>
          <div className="p-5">
            <h2 className="font-display text-xl font-bold text-[#173f3a]">
              إعلانات المعلن
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {data.advertisements.map((ad) => (
                <Link
                  key={ad.id}
                  href={`/ads/${ad.id}`}
                  className="overflow-hidden rounded-xl border border-[#e7e7df] bg-white"
                >
                  {ad.media_type === "video" && ad.video_url ? (
                    <video
                      src={ad.video_url}
                      muted
                      playsInline
                      className="h-40 w-full object-cover"
                    />
                  ) : (
                    ad.image_url && (
                      <img
                        src={ad.image_url}
                        alt=""
                        className="h-40 w-full object-cover"
                      />
                    )
                  )}
                  <div className="p-3">
                    <p className="font-bold text-[#173f3a]">{ad.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#72807a]">
                      {ad.description}
                    </p>
                    <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#c48738]">
                      فتح الإعلان <ExternalLink size={13} />
                    </span>
                  </div>
                </Link>
              ))}
              {!data.advertisements.length && (
                <p className="py-8 text-center text-sm text-[#89918c]">
                  لا توجد إعلانات مقبولة حاليًا.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function MarketProfilePage() {
  return (
    <Suspense
      fallback={
        <main
          className="grid min-h-screen place-items-center bg-[#f7f6f2] text-sm text-[#72807a]"
          dir="rtl"
        >
          جار تحميل الملف...
        </main>
      }
    >
      <MarketProfileContent />
    </Suspense>
  );
}
