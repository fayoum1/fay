"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, ExternalLink, Heart, MessageCircle, Phone, Share2 } from "lucide-react";

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
  other_ads?: Advertisement[];
};

export default function AdvertisementProfile({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ref?: string }> }) {
  const [advertisement, setAdvertisement] = useState<Advertisement | null>(null);
  const [error, setError] = useState("");
  const [liked, setLiked] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [shareMessage, setShareMessage] = useState("");

  const visitorKey = () => {
    const key = window.localStorage.getItem("advertisement_visitor_key");
    if (key) return key;
    const created = `${crypto.randomUUID()}-${Date.now()}`;
    window.localStorage.setItem("advertisement_visitor_key", created);
    return created;
  };

  const engage = (id: number, eventType: "view" | "click" | "like") => fetch(`/api/advertisements/${id}/engagement`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event_type: eventType, visitor_key: visitorKey() }) }).then((response) => response.ok ? response.json() : null);

  useEffect(() => {
    Promise.all([params, searchParams]).then(([{ id }, { ref }]) => {
      fetch("/api/sellers/account")
        .then((response) => response.ok ? response.json() : null)
        .then((data) => setReferralCode(data?.user?.referral_code || ""))
        .catch(() => undefined);
      if (ref) void fetch(`/api/advertisements/${id}/referral`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ referral_code: ref, visitor_key: visitorKey() }) }).catch(() => undefined);
      return fetch(`/api/advertisements/${id}`).then(async (response) => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "الإعلان غير متاح");
      setAdvertisement(data);
      void engage(Number(id), "view").then((result) => { if (result?.liked) setLiked(true); });
      }).catch((reason: Error) => setError(reason.message));
    });
  }, [params, searchParams]);

  const shareAdvertisement = async () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("ref");
    if (referralCode) url.searchParams.set("ref", referralCode);
    try {
      if (navigator.share) await navigator.share({ title: advertisement?.title, text: advertisement?.description || "شاهد هذا الإعلان", url: url.toString() });
      else { await navigator.clipboard.writeText(url.toString()); setShareMessage("تم نسخ رابط المشاركة"); }
    } catch {
      setShareMessage("يمكنك نسخ رابط الإعلان من المتصفح");
    }
  };

  if (error) return <main className="grid min-h-screen place-items-center bg-[#f7f6f2] p-5 text-center" dir="rtl"><div><p className="font-bold text-[#a9584d]">{error}</p><Link href="/" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#173f3a]"><ArrowRight size={16} /> العودة للرئيسية</Link></div></main>;
  if (!advertisement) return <main className="grid min-h-screen place-items-center bg-[#f7f6f2] text-sm text-[#72807a]" dir="rtl">جار تحميل الإعلان...</main>;

  const whatsapp = (advertisement.whatsapp || advertisement.phone)?.replace(/\D/g, "");
  return (
    <main className="min-h-screen bg-[#f7f6f2] px-4 py-6 text-[#202a27] sm:px-6 sm:py-10" dir="rtl">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="mb-5 inline-flex items-center gap-2 rounded-lg border border-[#dedfd8] bg-white px-3 py-2 text-sm font-bold text-[#173f3a]"><ArrowRight size={16} /> الرئيسية</Link>
        <article className="overflow-hidden rounded-xl border border-[#dedfd8] bg-[#fffdf9] shadow-[0_12px_32px_#173f3a0d]">
          <div className="border-b border-[#e7e7df] p-5 sm:p-7"><p className="text-xs font-bold text-[#c48738]">إعلان ممول</p><h1 className="mt-2 font-display text-2xl font-bold text-[#173f3a] sm:text-3xl">{advertisement.title}</h1><p className="mt-2 text-sm text-[#72807a]">بواسطة: <strong className="text-[#596963]">{advertisement.advertiser_name}</strong></p></div>
          {advertisement.media_type === "video" && advertisement.video_url ? <video src={advertisement.video_url} controls playsInline className="aspect-video w-full bg-black object-contain" /> : advertisement.image_url && <img src={advertisement.image_url} alt={advertisement.title} className="aspect-video w-full bg-[#eef0ea] object-contain" />}
          <div className="p-5 sm:p-7"><p className="whitespace-pre-line text-base leading-8 text-[#596963]">{advertisement.description}</p><div className="mt-5 flex items-center gap-3 text-xs font-bold text-[#89918c]"><span>المشاهدات: {advertisement.views || 0}</span><span>النقرات: {advertisement.clicks || 0}</span><span>الإعجابات: {advertisement.likes || 0}</span></div><div className="mt-6 flex flex-wrap gap-2">{whatsapp && <a onClick={() => void engage(advertisement.id, "click")} href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#25a866] px-4 text-sm font-bold text-white"><MessageCircle size={17} /> واتساب</a>}{whatsapp && <a onClick={() => void engage(advertisement.id, "click")} href={`tel:${whatsapp}`} className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#173f3a] px-4 text-sm font-bold text-white"><Phone size={17} /> اتصال</a>}{advertisement.target_url && <a onClick={() => void engage(advertisement.id, "click")} href={advertisement.target_url} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-lg border border-[#dedfd8] bg-white px-4 text-sm font-bold text-[#173f3a]"><ExternalLink size={17} /> الرابط الخارجي</a>}<button type="button" onClick={() => void shareAdvertisement()} className="inline-flex h-11 items-center gap-2 rounded-lg border border-[#dedfd8] bg-white px-4 text-sm font-bold text-[#173f3a]"><Share2 size={17} /> مشاركة</button><button type="button" onClick={() => void engage(advertisement.id, "like").then((result) => { if (result?.counted) { setLiked(true); setAdvertisement((current) => current ? { ...current, likes: (current.likes || 0) + 1 } : current); } })} className={`inline-flex h-11 items-center gap-2 rounded-lg px-4 text-sm font-bold ${liked ? "bg-[#f7d6df] text-[#934563]" : "border border-[#dedfd8] bg-white text-[#173f3a]"}`}><Heart size={17} fill={liked ? "currentColor" : "none"} /> {liked ? "تم الإعجاب" : "إعجاب"}</button></div>{shareMessage && <p className="mt-3 text-xs font-bold text-[#39704f]">{shareMessage}</p>}</div>
        </article>
        {!!advertisement.other_ads?.length && <section className="mt-5"><h2 className="mb-3 font-display text-xl font-bold text-[#173f3a]">إعلانات أخرى للمعلن</h2><div className="grid gap-3 sm:grid-cols-2">{advertisement.other_ads.map((item) => <Link key={item.id} href={`/ads/${item.id}`} className="rounded-lg border border-[#dedfd8] bg-[#fffdf9] p-4"><p className="font-bold text-[#173f3a]">{item.title}</p><p className="mt-1 line-clamp-2 text-sm leading-6 text-[#72807a]">{item.description}</p></Link>)}</div></section>}
      </div>
    </main>
  );
}