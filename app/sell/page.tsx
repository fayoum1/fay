"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, ImagePlus, LogIn, LogOut, Megaphone, Store, Users } from "lucide-react";

type SaleItem = { id: number; name: string; category: string };
type SaleStats = { visitor_count: number; submission_count: number };
type MarketUser = { display_name: string; phone: string; role: string; receive_offers: boolean; referral_code?: string | null };
type Offer = { id: number; item_name: string; quantity: number; price: number; image_url?: string | null; status: string; admin_note?: string | null; visibility: string; created_at: string };
type Ad = { id: number; advertiser_name: string; title: string; description?: string | null; media_type: string; image_url?: string | null; video_url?: string | null; target_url?: string | null; whatsapp?: string | null };
type AdPackage = { id: number; name: string; duration_days: number; price: number };

const roleLabels: Record<string, string> = { farm_owner: "صاحب مزرعة", trader: "تاجر", supplier: "مورد" };

function getMediaDimensions(file: File) {
  return new Promise<{ width: number; height: number } | null>((resolve) => {
    const url = URL.createObjectURL(file);
    const element = file.type.startsWith("video/") ? document.createElement("video") : document.createElement("img");
    element.onload = () => { URL.revokeObjectURL(url); resolve({ width: (element as HTMLImageElement).naturalWidth, height: (element as HTMLImageElement).naturalHeight }); };
    if (element instanceof HTMLVideoElement) element.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve({ width: element.videoWidth, height: element.videoHeight }); };
    element.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    element.src = url;
  });
}

function PublicAdGallery({ advertisements }: { advertisements: Ad[] }) {
  return (
    <section className="mt-6 rounded-2xl border border-[#e0e1d9] bg-[#f7faf6] p-4">
      <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-xl font-bold text-[#173f3a]">الإعلانات المقبولة</h2><span className="text-xs text-[#89918c]">إعلانات ممولة</span></div>
      <div className="grid gap-3 sm:grid-cols-2">{advertisements.map((advertisement) => <Link href={`/ads/${advertisement.id}`} key={advertisement.id} className="overflow-hidden rounded-xl border border-[#e7e7df] bg-white">{advertisement.media_type === "video" && advertisement.video_url ? <video src={advertisement.video_url} muted playsInline className="h-36 w-full object-cover" /> : advertisement.image_url && <img src={advertisement.image_url} alt="" className="h-36 w-full object-cover" />}<div className="p-3"><p className="font-bold text-[#173f3a]">{advertisement.title}</p><p className="mt-1 text-sm leading-6 text-[#72807a]">{advertisement.description}</p><span className="mt-2 inline-block text-xs font-bold text-[#c48738]">عرض ملف المعلن</span></div></Link>)}{!advertisements.length && <p className="py-8 text-center text-sm text-[#89918c]">لا توجد إعلانات مقبولة حاليًا.</p>}</div>
    </section>
  );
}

export default function SellPage() {
  const [tab, setTab] = useState<"offer" | "ads">("offer");
  const [items, setItems] = useState<SaleItem[]>([]);
  const [stats, setStats] = useState<SaleStats>({ visitor_count: 0, submission_count: 0 });
  const [user, setUser] = useState<MarketUser | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [rewardSummary, setRewardSummary] = useState({ points: 0, amount: 0, pending: 0 });
  const [advertisements, setAdvertisements] = useState<Ad[]>([]);
  const [packages, setPackages] = useState<AdPackage[]>([]);
  const [authMode, setAuthMode] = useState<"register" | "login">("register");
  const [auth, setAuth] = useState({ display_name: "", phone: "", password: "", role: "supplier", receive_offers: false });
  const [form, setForm] = useState({ seller_name: "", phone: "", address: "", item_name: "", quantity: "", age_or_weight: "", price: "", visibility: "admin_only" });
  const [customItemName, setCustomItemName] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [adForm, setAdForm] = useState({ title: "", description: "", media_type: "text", target_url: "", whatsapp: "", package_id: "" });
  const [adImage, setAdImage] = useState<File | null>(null);
  const [adPreviewUrl, setAdPreviewUrl] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/sellers/public").then((response) => response.ok ? response.json() : null),
      fetch("/api/advertisements").then((response) => response.ok ? response.json() : null),
      fetch("/api/sellers/account").then((response) => response.ok ? response.json() : null),
    ]).then(([sellerData, adData, accountData]) => {
      if (sellerData) { setItems(sellerData.items || []); setStats(sellerData.stats || { visitor_count: 0, submission_count: 0 }); }
      if (adData) { setAdvertisements(adData.advertisements || []); setPackages(adData.packages || []); setAdForm((current) => ({ ...current, package_id: String(adData.packages?.[0]?.id || "") })); }
      if (accountData?.user) { setUser(accountData.user); setOffers(accountData.offers || []); setRewardSummary(accountData.reward_summary || { points: 0, amount: 0, pending: 0 }); }
    }).catch(() => setError("تعذر تحميل بيانات الصفحة"));
    fetch("/api/sellers/visitors", { method: "POST" }).then((response) => response.ok ? response.json() : null).then((data) => {
      if (data && typeof data.count === "number") setStats((current) => ({ ...current, visitor_count: data.count }));
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!adImage) { setAdPreviewUrl(""); return; }
    const url = URL.createObjectURL(adImage);
    setAdPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [adImage]);

  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const updateAuth = (key: keyof typeof auth, value: string | boolean) => setAuth((current) => ({ ...current, [key]: value }));

  const submitAuth = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setMessage(""); setError("");
    const response = await fetch("/api/sellers/account", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: authMode, ...auth }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setError(result.error || "تعذر تسجيل الحساب");
    else { setUser(result.user); setMessage(authMode === "register" ? "تم إنشاء حسابك. احتفظ بكلمة السر لمتابعة عروضك." : "تم تسجيل الدخول"); const account = await fetch("/api/sellers/account").then((item) => item.json()); setOffers(account.offers || []); setRewardSummary(account.reward_summary || { points: 0, amount: 0, pending: 0 }); }
    setSaving(false);
  };

  const submitOffer = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setMessage(""); setError("");
    const body = new FormData();
    Object.entries(form).forEach(([key, value]) => body.append(key, key === "item_name" && value === "أخرى" ? customItemName : value));
    if (image) body.append("image", image);
    const response = await fetch("/api/sellers/public", { method: "POST", body });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setError(result.error || "تعذر إرسال العرض");
    else { setMessage("تم إرسال العرض للمراجعة. يمكنك متابعة حالته من نفس الحساب."); const account = await fetch("/api/sellers/account").then((item) => item.json()); setOffers(account.offers || []); setForm({ seller_name: user?.display_name || "", phone: user?.phone || "", address: "", item_name: "", quantity: "", age_or_weight: "", price: "", visibility: "admin_only" }); setCustomItemName(""); setImage(null); }
    setSaving(false);
  };

  const submitAd = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setMessage(""); setError("");
    const body = new FormData(); Object.entries(adForm).forEach(([key, value]) => body.append(key, value));
    if (adImage) {
      const dimensions = await getMediaDimensions(adImage);
      if (!dimensions) { setError("تعذر قراءة أبعاد الملف"); setSaving(false); return; }
      const minimumWidth = adForm.media_type === "video" ? 720 : 1280;
      const minimumHeight = adForm.media_type === "video" ? 405 : 720;
      if (dimensions.width < minimumWidth || dimensions.height < minimumHeight || Math.abs(dimensions.width / dimensions.height - 16 / 9) > 0.03) {
        setError(adForm.media_type === "video" ? "اختر فيديو بنسبة 16:9 وبمقاس لا يقل عن 720×405" : "اختر صورة بنسبة 16:9 وبمقاس لا يقل عن 1280×720"); setSaving(false); return;
      }
      body.append("media_width", String(dimensions.width)); body.append("media_height", String(dimensions.height)); body.append("media", adImage);
    }
    const response = await fetch("/api/advertisements", { method: "POST", body }); const result = await response.json().catch(() => ({}));
    if (!response.ok) setError(result.error || "تعذر إرسال الإعلان"); else { setMessage("تم إرسال الإعلان للمراجعة. سيظهر بعد موافقة الإدارة."); setAdForm((current) => ({ ...current, title: "", description: "", target_url: "", whatsapp: "" })); setAdImage(null); }
    setSaving(false);
  };

  const logout = async () => { await fetch("/api/sellers/account", { method: "DELETE" }); setUser(null); setOffers([]); setMessage("تم تسجيل الخروج"); };
  const inputClass = "h-11 rounded-xl border border-[#dedfd8] bg-white px-3 outline-none focus:border-[#173f3a]";

  return (
    <main className="min-h-screen bg-[#f7f6f2] px-4 py-6 text-[#202a27] sm:px-6 sm:py-10" dir="rtl">
      {adPreviewUrl && <div className="fixed bottom-4 left-4 z-40 w-64 rounded-xl border border-[#d8dfd6] bg-white p-2 shadow-xl"><p className="mb-1 text-xs font-bold text-[#173f3a]">معاينة الإعلان</p>{adForm.media_type === "video" ? <video src={adPreviewUrl} controls className="aspect-video w-full rounded-lg object-contain" /> : <img src={adPreviewUrl} alt="معاينة الإعلان" className="aspect-video w-full rounded-lg object-contain" />}</div>}
      <div className="mx-auto max-w-5xl">
        <header className="mb-5 flex items-center justify-between gap-3">
          <Link href="/" className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#dedfd8] bg-white px-3 text-sm font-bold text-[#173f3a]"><ArrowRight size={16} /> الرئيسية</Link>
          <div className="text-left text-xs text-[#72807a]"><div className="flex items-center justify-end gap-3"><span className="inline-flex items-center gap-1"><Users size={14} /> {stats.visitor_count} زائر</span><span className="inline-flex items-center gap-1"><Store size={14} /> {stats.submission_count} عرض</span></div></div>
        </header>
        <section className="rounded-3xl border border-[#e0e1d9] bg-[#fffdf9] p-5 shadow-[0_16px_40px_#173f3a0c] sm:p-8">
          <div className="mb-6 flex items-start gap-3"><div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#e4eee5] text-[#173f3a]"><Store size={24} /></div><div><p className="text-sm font-bold text-[#c48738]">سوق التوريد والإعلانات</p><h1 className="font-display text-3xl font-extrabold text-[#173f3a]">اعرض منتجك أو أعلن عن نشاطك</h1><p className="mt-1 text-sm leading-6 text-[#72807a]">عروض البيع خاصة وتراجعها الإدارة، أما الإعلان العام فلا يظهر إلا بعد الموافقة.</p></div></div>
          <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-[#eef0ea] p-1"><button onClick={() => { setTab("offer"); setMessage(""); setError(""); }} className={`h-11 rounded-lg text-sm font-bold ${tab === "offer" ? "bg-white text-[#173f3a] shadow-sm" : "text-[#72807a]"}`}><Store className="ml-2 inline" size={16} />عرض بيع خاص</button><button onClick={() => { setTab("ads"); setMessage(""); setError(""); }} className={`h-11 rounded-lg text-sm font-bold ${tab === "ads" ? "bg-white text-[#173f3a] shadow-sm" : "text-[#72807a]"}`}><Megaphone className="ml-2 inline" size={16} />الإعلانات العامة</button></div>
          {!user ? <form onSubmit={submitAuth} className="mx-auto max-w-xl rounded-2xl border border-[#e0e1d9] bg-[#f7faf6] p-5"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-display text-xl font-bold text-[#173f3a]">{authMode === "register" ? "إنشاء حساب متابعة" : "تسجيل الدخول"}</h2><p className="mt-1 text-xs text-[#72807a]">استخدم رقم واتساب وكلمة سر واحتفظ بهما لمتابعة عروضك وإعلاناتك.</p></div><LogIn className="text-[#c48738]" /></div>{authMode === "register" && <><input required value={auth.display_name} onChange={(event) => updateAuth("display_name", event.target.value)} placeholder="الاسم أو اسم النشاط" className={`${inputClass} mb-2 w-full`} /><select value={auth.role} onChange={(event) => updateAuth("role", event.target.value)} className={`${inputClass} mb-2 w-full`}><option value="farm_owner">صاحب مزرعة</option><option value="trader">تاجر</option><option value="supplier">مورد</option></select>{auth.role === "trader" && <label className="mb-2 flex items-center gap-2 text-sm text-[#596963]"><input type="checkbox" checked={auth.receive_offers} onChange={(event) => updateAuth("receive_offers", event.target.checked)} /> أوافق على استقبال عروض من إدارة الموقع</label>}</>}<input required value={auth.phone} onChange={(event) => updateAuth("phone", event.target.value)} placeholder="رقم الواتساب" inputMode="tel" className={`${inputClass} mb-2 w-full`} /><input required minLength={4} type="password" value={auth.password} onChange={(event) => updateAuth("password", event.target.value)} placeholder="كلمة السر" className={`${inputClass} mb-3 w-full`} /><button disabled={saving} className="h-11 w-full rounded-xl bg-[#173f3a] font-bold text-white disabled:opacity-60">{saving ? "جار المعالجة..." : authMode === "register" ? "إنشاء الحساب" : "دخول"}</button><button type="button" onClick={() => setAuthMode(authMode === "register" ? "login" : "register")} className="mt-3 w-full text-sm font-bold text-[#c48738]">{authMode === "register" ? "لدي حساب بالفعل" : "إنشاء حساب جديد"}</button></form> : <>
            <div className="mb-5 grid gap-3 rounded-xl bg-[#e9f7ed] px-4 py-3 text-sm sm:grid-cols-[1fr_auto]"><span><strong>{user.display_name}</strong>، {roleLabels[user.role] || user.role} <span className="text-[#72807a]">({user.phone})</span>{user.referral_code && <small className="mt-1 block text-[#39704f]">كود المشاركة: {user.referral_code}</small>}</span><div className="flex flex-wrap items-center gap-3 text-xs font-bold text-[#56816c]"><span>{rewardSummary.points} نقطة</span><span>{rewardSummary.amount} جنيه معتمد</span><span>{rewardSummary.pending} معلق</span><button onClick={logout} className="inline-flex items-center gap-1 font-bold text-[#a9584d]"><LogOut size={15} /> خروج</button></div></div>
            {tab === "offer" ? <div className="grid gap-5 lg:grid-cols-[1fr_320px]"><form onSubmit={submitOffer} className="grid gap-4"><h2 className="font-display text-xl font-bold text-[#173f3a]">إضافة عرض بيع خاص</h2><div className="grid gap-4 sm:grid-cols-2"><input required value={form.seller_name} onChange={(event) => update("seller_name", event.target.value)} placeholder="اسم البائع أو الشركة" className={inputClass} /><input required value={form.phone} onChange={(event) => update("phone", event.target.value)} placeholder="رقم واتساب للتواصل" className={inputClass} /></div><input required value={form.address} onChange={(event) => update("address", event.target.value)} placeholder="العنوان" className={inputClass} /><div className="grid gap-4 sm:grid-cols-2"><select required value={form.item_name} onChange={(event) => update("item_name", event.target.value)} className={inputClass}><option value="">اختر الصنف</option>{items.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}<option value="أخرى">أخرى</option></select><input required type="number" min="1" value={form.quantity} onChange={(event) => update("quantity", event.target.value)} placeholder="العدد" className={inputClass} /></div>{form.item_name === "أخرى" && <input required value={customItemName} onChange={(event) => setCustomItemName(event.target.value)} placeholder="اسم الصنف" className={inputClass} />}<div className="grid gap-4 sm:grid-cols-2"><input value={form.age_or_weight} onChange={(event) => update("age_or_weight", event.target.value)} placeholder="العمر أو الوزن" className={inputClass} /><input required type="number" min="0" step="0.01" value={form.price} onChange={(event) => update("price", event.target.value)} placeholder="السعر" className={inputClass} /></div><select value={form.visibility} onChange={(event) => update("visibility", event.target.value)} className={inputClass}><option value="admin_only">عرضه على إدارة الموقع فقط</option><option value="selected_traders">إرساله لتجار يحددهم الأدمن</option><option value="all_traders">إتاحته لكل التجار المسجلين</option></select><label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#cfd8cf] bg-[#f7faf6] p-3 text-sm font-bold text-[#56816c]"><ImagePlus size={20} /><span className="min-w-0 flex-1 truncate">{image ? image.name : "إضافة صورة المنتج (اختياري)"}</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setImage(event.target.files?.[0] || null)} className="sr-only" /></label><button disabled={saving} className="h-12 rounded-xl bg-[#173f3a] font-bold text-white disabled:opacity-60">{saving ? "جار الإرسال..." : "إرسال العرض للمراجعة"}</button></form><aside className="rounded-2xl border border-[#e0e1d9] bg-[#fbfbf8] p-4"><h2 className="font-bold text-[#173f3a]">حالة عروضك</h2><div className="mt-3 grid gap-2">{offers.length ? offers.map((offer) => <div key={offer.id} className="rounded-xl border border-[#e7e7df] bg-white p-3"><div className="flex justify-between gap-2 text-sm font-bold"><span>{offer.item_name} × {offer.quantity}</span><span className="text-[#c48738]">{offer.status}</span></div>{offer.admin_note && <p className="mt-2 text-xs leading-5 text-[#a9584d]">ملاحظة الإدارة: {offer.admin_note}</p>}<p className="mt-1 text-[11px] text-[#89918c]">{offer.visibility === "admin_only" ? "خاص بالإدارة" : "موجه للتجار"}</p></div>) : <p className="py-8 text-center text-sm text-[#89918c]">لا توجد عروض بعد.</p>}</div></aside></div> : <div className="grid gap-5 lg:grid-cols-[1fr_300px]"><form onSubmit={submitAd} className="grid gap-4"><h2 className="font-display text-xl font-bold text-[#173f3a]">إرسال إعلان للمراجعة</h2><input required value={adForm.title} onChange={(event) => setAdForm({ ...adForm, title: event.target.value })} placeholder="عنوان الإعلان" className={inputClass} /><textarea required value={adForm.description} onChange={(event) => setAdForm({ ...adForm, description: event.target.value })} placeholder="وصف مختصر" className="min-h-28 rounded-xl border border-[#dedfd8] bg-white p-3 outline-none" /><div className="grid gap-4 sm:grid-cols-2"><select value={adForm.media_type} onChange={(event) => setAdForm({ ...adForm, media_type: event.target.value })} className={inputClass}><option value="text">إعلان نصي</option><option value="image">صورة</option><option value="text_image">نص مع صورة</option><option value="video">فيديو قصير</option></select><select required value={adForm.package_id} onChange={(event) => setAdForm({ ...adForm, package_id: event.target.value })} className={inputClass}>{packages.map((item) => <option key={item.id} value={item.id}>{item.name} - {item.price} جنيه</option>)}</select></div><div className="grid gap-4 sm:grid-cols-2"><input value={adForm.whatsapp} onChange={(event) => setAdForm({ ...adForm, whatsapp: event.target.value })} placeholder="رقم واتساب الإعلان" className={inputClass} /><input value={adForm.target_url} onChange={(event) => setAdForm({ ...adForm, target_url: event.target.value })} placeholder="رابط الإعلان (اختياري)" className={inputClass} /></div><label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#cfd8cf] bg-[#f7faf6] p-3 text-sm font-bold text-[#56816c]"><ImagePlus size={20} /><span className="min-w-0 flex-1 truncate">{adImage ? adImage.name : adForm.media_type === "video" ? "فيديو الإعلان (اختياري)" : "صورة الإعلان (اختياري)"}</span><input type="file" accept={adForm.media_type === "video" ? "video/mp4,video/webm,video/quicktime" : "image/png,image/jpeg,image/webp"} onChange={(event) => setAdImage(event.target.files?.[0] || null)} className="sr-only" /></label><button disabled={saving} className="h-12 rounded-xl bg-[#c48738] font-bold text-white disabled:opacity-60">{saving ? "جار الإرسال..." : "إرسال الإعلان للمراجعة"}</button></form><aside className="rounded-2xl border border-[#e0e1d9] bg-[#fbfbf8] p-4"><h2 className="font-bold text-[#173f3a]">إعلانات مقبولة</h2><div className="mt-3 grid gap-2">{advertisements.map((ad) => <article key={ad.id} className="rounded-xl border border-[#e7e7df] bg-white p-3"><p className="font-bold text-[#173f3a]">{ad.title}</p><p className="mt-1 text-xs leading-5 text-[#72807a]">{ad.description}</p></article>)}{!advertisements.length && <p className="py-8 text-center text-sm text-[#89918c]">لا توجد إعلانات مقبولة حاليًا.</p>}</div></aside></div>}
          </>}
          {tab === "ads" && <PublicAdGallery advertisements={advertisements} />}
          {(message || error) && <p className={`mt-5 rounded-xl px-3 py-2 text-sm font-bold ${error ? "bg-[#fff0ed] text-[#a9584d]" : "bg-[#e9f7ed] text-[#39704f]"}`}>{error || <><CheckCircle2 className="ml-1 inline" size={17} />{message}</>}</p>}
        </section>
      </div>
    </main>
  );
}
