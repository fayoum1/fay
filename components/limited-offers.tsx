"use client";

import { useEffect, useState } from "react";

export type LimitedOffer = {
  id: number;
  title: string;
  description: string;
  image_url: string;
  item_id: number | null;
  item_name: string;
  quantity_per_user: number | null;
  code_prefix: string;
  max_recipients: number | null;
  remaining: number | null;
  allowed_districts: string[];
  show_in_scroll: boolean;
  show_in_popup: boolean;
};

type OfferSignup = {
  id: number;
  offer_id: number;
  code: string;
  name: string;
  phone: string;
  district: string;
  village: string | null;
  attachment_name: string | null;
  attachment_url: string | null;
  status: string;
  created_at: string;
};

type AdminOffer = LimitedOffer & {
  status: "draft" | "active" | "paused" | "ended";
  public_visibility: boolean;
  visibility_reason: string | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  signups: OfferSignup[];
};

type SignupCard = {
  code: string;
  name: string;
  phone: string;
  district: string;
  village: string;
  offerTitle: string;
  itemName: string;
  quantityPerUser: number | null;
  registeredAt: string;
  expiresAt: string | null;
};

const signupCardNotice = "هذه البطاقة شخصية ومخصصة لصاحبها فقط، ولا يجوز تحويلها أو استخدامها من شخص آخر. يحق للإدارة إلغاء الحجز عند ثبوت التلاعب أو إساءة الاستخدام.";

function printSignupCard(card: SignupCard) {
  const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] || character);
  const address = [card.district, card.village].filter(Boolean).join("، ");
  const registeredAt = new Date(card.registeredAt).toLocaleString("ar-EG");
  const expiresAt = card.expiresAt ? new Date(card.expiresAt).toLocaleDateString("ar-EG") : "غير محدد";
  const itemAllowance = card.quantityPerUser === null ? "الكمية لم تحدد بعد" : String(card.quantityPerUser);
  const printWindow = window.open("", "_blank");
  if (!printWindow) return false;

  printWindow.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>بطاقة الحجز ${escapeHtml(card.code)}</title><style>
    @page{size:A5 landscape;margin:12mm}*{box-sizing:border-box}body{margin:0;padding:24px;background:#f2f5f1;color:#173f3a;font-family:Tahoma,Arial,sans-serif}.card{max-width:720px;margin:24px auto;padding:30px;border:2px solid #173f3a;border-top:10px solid #c48738;background:#fffdf9}.brand{margin:0;color:#a66c20;font-size:14px}.title{margin:8px 0 22px;font-size:24px}.code{padding:12px 16px;background:#edf4ed;text-align:center;font: bold 32px monospace;direction:ltr}.details{display:grid;grid-template-columns:1fr 1fr;gap:14px 24px;margin-top:22px}.label{display:block;margin-bottom:4px;color:#72807a;font-size:12px}.value{font-size:16px;font-weight:bold}.notice{margin-top:18px;padding:12px;border:1px solid #e5c98c;background:#fff8e8;color:#76500f;font-size:12px;font-weight:bold;line-height:1.8}.footer{margin-top:16px;padding-top:12px;border-top:1px solid #d9ded7;color:#72807a;font-size:11px}@media print{body{padding:0;background:#fff}.card{margin:0;max-width:none;break-inside:avoid}}
  </style></head><body><main class="card"><p class="brand">بطاقة حجز مستفيد</p><h1 class="title">${escapeHtml(card.offerTitle)}</h1><div class="code">${escapeHtml(card.code)}</div><section class="details"><div><span class="label">الاسم</span><span class="value">${escapeHtml(card.name)}</span></div><div><span class="label">رقم الهاتف</span><span class="value" dir="ltr">${escapeHtml(card.phone)}</span></div><div><span class="label">العنوان</span><span class="value">${escapeHtml(address)}</span></div><div><span class="label">الصنف المخصص</span><span class="value">${escapeHtml(card.itemName)} · ${escapeHtml(itemAllowance)}</span></div><div><span class="label">تاريخ الحجز</span><span class="value">${escapeHtml(registeredAt)}</span></div><div><span class="label">صالحة حتى</span><span class="value">${escapeHtml(expiresAt)}</span></div></section><p class="notice">${escapeHtml(signupCardNotice)}</p><p class="footer">رقم البطاقة الفريد: ${escapeHtml(card.code)}</p></main></body></html>`);
  printWindow.document.close();
  window.setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 300);
  return true;
}

const districts = ["الفيوم", "إبشواي", "إطسا", "سنورس", "طامية", "يوسف الصديق"];
const signupStatusLabels: Record<string, string> = {
  registered: "مسجل",
  contacted: "تم التواصل",
  fulfilled: "تم الاستلام",
  cancelled: "ملغي",
};
export function LimitedOfferExperience({ offers, popupOffer, selectedOffer, onPopupClose, onOffersChange, onOfferSelect }: {
  offers: LimitedOffer[];
  popupOffer: LimitedOffer | null;
  selectedOffer: LimitedOffer | null;
  onPopupClose: () => void;
  onOffersChange: (offers: LimitedOffer[]) => void;
  onOfferSelect: (offer: LimitedOffer | null) => void;
}) {
  const [message, setMessage] = useState("");
  const [successCard, setSuccessCard] = useState<SignupCard | null>(null);
  const [busy, setBusy] = useState(false);

  const openOffer = (offer: LimitedOffer) => {
    onOfferSelect(offer);
    setMessage("");
    setSuccessCard(null);
    onPopupClose();
  };

  const submitSignup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedOffer) return;
    setBusy(true);
    setMessage("");
    const formData = new FormData(event.currentTarget);
    formData.set("offer_id", String(selectedOffer.id));
    const signup = {
      name: String(formData.get("name") || ""),
      phone: String(formData.get("phone") || ""),
      district: String(formData.get("district") || ""),
      village: String(formData.get("village") || ""),
    };
    const response = await fetch("/api/limited-offers", { method: "POST", body: formData });
    const result = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setMessage(result.error || "تعذر إكمال التسجيل");
      return;
    }
    onOffersChange(offers.map((offer) => offer.id === selectedOffer.id ? { ...offer, remaining: result.remaining } : offer));
    setSuccessCard({ ...signup, ...result });
    setMessage(result.remaining === null ? "تم التسجيل بنجاح." : `تم التسجيل بنجاح. المتبقي من العرض: ${result.remaining}`);
  };

  useEffect(() => {
    const refresh = () => {
      fetch("/api/limited-offers", { cache: "no-store" })
        .then((response) => response.ok ? response.json() : null)
        .then((data) => {
          if (Array.isArray(data?.offers)) onOffersChange(data.offers);
        })
        .catch(() => undefined);
    };
    refresh();
    const interval = window.setInterval(refresh, 30000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [onOffersChange]);

  return (
    <>
      {popupOffer && !selectedOffer && (
        <div className="fixed inset-0 z-[61] grid place-items-center bg-[#173f3acc] p-3 sm:p-5" role="dialog" aria-modal="true" aria-label="عرض محدود">
          <div className="relative max-h-[94dvh] w-full max-w-xl overflow-y-auto rounded-lg bg-[#fffdf9] shadow-2xl">
            <button type="button" onClick={onPopupClose} aria-label="إغلاق العرض" className="absolute left-3 top-3 z-10 grid size-9 place-items-center rounded-full bg-white/90 text-xl font-bold text-[#173f3a]">×</button>
            <button type="button" onClick={() => openOffer(popupOffer)} className="block w-full text-right">
              <img src={popupOffer.image_url} alt="" className="max-h-[55dvh] w-full bg-[#18201e] object-contain" />
              <div className="p-4 sm:p-5">
                <h2 className="font-display text-xl font-bold text-[#173f3a]">{popupOffer.title}</h2>
                <p className="mt-2 text-sm leading-6 text-[#596963]">{popupOffer.description}</p>
                <p className="mt-2 text-xs font-bold text-[#39704f]">الصنف: {popupOffer.item_name} · {popupOffer.quantity_per_user === null ? "الكمية لم تحدد بعد" : `الكمية لكل مستفيد: ${popupOffer.quantity_per_user}`}</p>
                <span className="mt-3 inline-flex rounded-md bg-[#39704f] px-3 py-2 text-xs font-black text-white">
                  {popupOffer.remaining === null ? "التسجيل متاح" : `متبقي ${popupOffer.remaining} من ${popupOffer.max_recipients}`}
                </span>
                <span className="mr-2 text-xs font-bold text-[#a66c20]">اضغط للتسجيل</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {selectedOffer && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-[#173f3acc] p-3 sm:p-5" role="dialog" aria-modal="true" aria-label="التسجيل في العرض">
          <section className="relative max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-lg bg-[#fffdf9] p-5 shadow-2xl sm:p-6">
            <button type="button" onClick={() => onOfferSelect(null)} aria-label="إغلاق نموذج التسجيل" className="absolute left-4 top-3 grid size-9 place-items-center rounded-full text-2xl text-[#72807a]">×</button>
            <img src={selectedOffer.image_url} alt="" className="mb-4 max-h-48 w-full rounded-md bg-[#eef0ea] object-contain" />
            <p className="text-xs font-bold text-[#a66c20]">تسجيل عرض محدود</p>
            <h2 className="mt-1 font-display text-2xl font-bold text-[#173f3a]">{selectedOffer.title}</h2>
            <p className="mt-2 text-sm font-bold text-[#39704f]">الصنف المخصص: {selectedOffer.item_name} · {selectedOffer.quantity_per_user === null ? "الكمية لم تحدد بعد" : `الكمية لكل مستفيد: ${selectedOffer.quantity_per_user}`}</p>
            {successCard ? (
              <div className="mt-5 rounded-lg border border-[#cde9d5] bg-[#edf9f0] p-5 text-center">
                <p className="text-sm font-bold text-[#39704f]">تم الحجز بنجاح. هذه بطاقة الحجز الخاصة بك</p>
                <strong className="mt-3 block font-mono text-4xl text-[#173f3a]">{successCard.code}</strong>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-right text-xs">
                  <div><dt className="text-[#72807a]">الاسم</dt><dd className="mt-1 font-bold">{successCard.name}</dd></div>
                  <div><dt className="text-[#72807a]">رقم الهاتف</dt><dd className="mt-1 font-bold" dir="ltr">{successCard.phone}</dd></div>
                  <div><dt className="text-[#72807a]">العنوان</dt><dd className="mt-1 font-bold">{[successCard.district, successCard.village].filter(Boolean).join("، ")}</dd></div>
                  <div><dt className="text-[#72807a]">الصنف والكمية المخصصة</dt><dd className="mt-1 font-bold">{successCard.itemName} · {successCard.quantityPerUser === null ? "الكمية لم تحدد بعد" : successCard.quantityPerUser}</dd></div>
                  <div><dt className="text-[#72807a]">تاريخ الحجز</dt><dd className="mt-1 font-bold">{new Date(successCard.registeredAt).toLocaleDateString("ar-EG")}</dd></div>
                  <div><dt className="text-[#72807a]">صلاحية البطاقة حتى</dt><dd className="mt-1 font-bold">{successCard.expiresAt ? new Date(successCard.expiresAt).toLocaleDateString("ar-EG") : "غير محدد"}</dd></div>
                </dl>
                <p className="mt-4 rounded-md border border-[#e5c98c] bg-[#fff8e8] p-3 text-right text-xs font-semibold leading-6 text-[#76500f]">{signupCardNotice}</p>
                <p className="mt-3 text-xs text-[#596963]">{message}</p>
                <button type="button" onClick={() => { if (!printSignupCard(successCard)) setMessage("اسمح بالنوافذ المنبثقة لتحميل البطاقة PDF."); }} className="mt-4 h-11 w-full rounded-md bg-[#173f3a] px-5 text-sm font-bold text-white">تحميل بطاقة الحجز PDF</button>
                <button type="button" onClick={() => onOfferSelect(null)} className="mt-4 h-10 rounded-md bg-[#173f3a] px-5 text-sm font-bold text-white">إغلاق</button>
              </div>
            ) : (
              <form onSubmit={submitSignup} className="mt-4 grid gap-3">
                <label className="grid gap-1 text-sm font-bold text-[#173f3a]">الاسم
                  <input name="name" required maxLength={100} autoComplete="name" className="h-11 rounded-md border border-[#d9ded7] bg-white px-3 font-normal outline-none focus:border-[#39704f]" />
                </label>
                <label className="grid gap-1 text-sm font-bold text-[#173f3a]">رقم الهاتف
                  <input name="phone" required inputMode="numeric" autoComplete="tel" maxLength={15} placeholder="01xxxxxxxxx" className="h-11 rounded-md border border-[#d9ded7] bg-white px-3 text-left font-normal outline-none focus:border-[#39704f]" dir="ltr" />
                </label>
                <label className="grid gap-1 text-sm font-bold text-[#173f3a]">المركز
                  <select name="district" required defaultValue="" className="h-11 rounded-md border border-[#d9ded7] bg-white px-3 font-normal outline-none focus:border-[#39704f]">
                    <option value="" disabled>اختر المركز</option>
                    {selectedOffer.allowed_districts.map((district) => <option key={district} value={district}>{district}</option>)}
                  </select>
                </label>
                <label className="grid gap-1 text-sm font-bold text-[#173f3a]">اسم القرية <span className="text-xs font-normal text-[#89918c]">اختياري</span>
                  <input name="village" maxLength={100} className="h-11 rounded-md border border-[#d9ded7] bg-white px-3 font-normal outline-none focus:border-[#39704f]" />
                </label>
                {message && <p role="alert" className="text-sm font-semibold text-[#a9584d]">{message}</p>}
                <button disabled={busy || selectedOffer.remaining === 0} className="h-12 rounded-md bg-[#173f3a] font-bold text-white disabled:opacity-50">
                  {busy ? "جار التسجيل..." : selectedOffer.remaining === 0 ? "اكتمل العدد" : "تسجيل وحجز مكاني"}
                </button>
              </form>
            )}
          </section>
        </div>
      )}
    </>
  );
}

export function LimitedOfferManager() {
  const [offers, setOffers] = useState<AdminOffer[]>([]);
  const [items, setItems] = useState<Array<{ id: number; name: string }>>([]);
  const [signups, setSignups] = useState<OfferSignup[]>([]);
  const [editingOfferId, setEditingOfferId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [itemId, setItemId] = useState("");
  const [quantityPerUser, setQuantityPerUser] = useState("");
  const [prefix, setPrefix] = useState("A");
  const [maxRecipients, setMaxRecipients] = useState("");
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [showInScroll, setShowInScroll] = useState(true);
  const [showInPopup, setShowInPopup] = useState(false);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const response = await fetch("/api/admin/limited-offers", { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return setMessage(result.error || "تعذر تحميل العروض");
    setOffers(result.offers || []);
    setItems(result.items || []);
    setSignups(result.signups || []);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const clearDraft = () => {
    setEditingOfferId(null);
    setTitle("");
    setDescription("");
    setItemId("");
    setQuantityPerUser("");
    setPrefix("A");
    setMaxRecipients("");
    setSelectedDistricts([]);
    setShowInScroll(true);
    setShowInPopup(false);
    setStartsAt("");
    setEndsAt("");
    setImage(null);
  };

  const formatLocalDateTime = (value: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };

  const editOffer = (offer: AdminOffer) => {
    setEditingOfferId(offer.id);
    setTitle(offer.title);
    setDescription(offer.description || "");
    setItemId(offer.item_id === null ? "" : String(offer.item_id));
    setQuantityPerUser(offer.quantity_per_user === null ? "" : String(offer.quantity_per_user));
    setPrefix(offer.code_prefix);
    setMaxRecipients(offer.max_recipients === null ? "" : String(offer.max_recipients));
    setSelectedDistricts(offer.allowed_districts || []);
    setShowInScroll(offer.show_in_scroll);
    setShowInPopup(offer.show_in_popup);
    setStartsAt(formatLocalDateTime(offer.starts_at));
    setEndsAt(formatLocalDateTime(offer.ends_at));
    setImage(null);
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveOffer = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData();
    if (editingOfferId !== null) form.set("id", String(editingOfferId));
    form.set("title", title);
    form.set("description", description);
    form.set("item_id", itemId);
    form.set("quantity_per_user", quantityPerUser);
    form.set("code_prefix", prefix);
    form.set("max_recipients", maxRecipients);
    form.set("allowed_districts", JSON.stringify(selectedDistricts));
    form.set("show_in_scroll", String(showInScroll));
    form.set("show_in_popup", String(showInPopup));
    form.set("starts_at", startsAt);
    form.set("ends_at", endsAt);
    if (image) form.set("image", image);
    const wasEditing = editingOfferId !== null;
    const response = await fetch("/api/admin/limited-offers", { method: wasEditing ? "PATCH" : "POST", body: form });
    const result = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) return setMessage(result.error || (wasEditing ? "تعذر تعديل العرض" : "تعذر إنشاء العرض"));
    clearDraft();
    setMessage(wasEditing ? "تم حفظ تعديلات العرض" : "تم إنشاء العرض كمسودة. غيّر حالته إلى نشط لبدء التسجيل.");
    await load();
  };

  const deleteOffer = async (offer: AdminOffer) => {
    if (!window.confirm(`حذف العرض «${offer.title}» وكل تسجيلاته ومرفقاتها؟ لا يمكن التراجع عن ذلك.`)) return;
    const response = await fetch("/api/admin/limited-offers", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: offer.id }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return setMessage(result.error || "تعذر حذف العرض");
    if (editingOfferId === offer.id) clearDraft();
    setMessage("تم حذف العرض وتسجيلاته");
    await load();
  };

  const updateStatus = async (offerId: number, status: string) => {
    const response = await fetch("/api/admin/limited-offers", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: offerId, status }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return setMessage(result.error || "تعذر تحديث حالة العرض");
    await load();
  };

  const updateSignupStatus = async (signupId: number, status: string) => {
    const response = await fetch("/api/admin/limited-offers", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entity: "signup", id: signupId, status }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return setMessage(result.error || "تعذر تحديث التسجيل");
    await load();
  };

  return (
    <section className="grid gap-5">
      <div className="rounded-lg border border-[#dfe4dc] bg-white p-4 sm:p-5">
        <div className="mb-4"><p className="text-xs font-bold text-[#a66c20]">حملة تسجيل</p><h2 className="font-display text-xl font-bold text-[#173f3a]">{editingOfferId === null ? "إنشاء عرض محدود" : "تعديل العرض المحدود"}</h2></div>
        <form onSubmit={saveOffer} className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-bold text-[#173f3a]">عنوان العرض<input required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} className="h-11 rounded-md border border-[#d9ded7] px-3 font-normal" /></label>
          <label className="grid gap-1 text-sm font-bold text-[#173f3a]">بادئة الكود<input required maxLength={8} pattern="[A-Za-z0-9_-]{1,8}" value={prefix} onChange={(event) => setPrefix(event.target.value)} className="h-11 rounded-md border border-[#d9ded7] px-3 font-normal" /></label>
          <label className="grid gap-1 text-sm font-bold text-[#173f3a]">الصنف المخصص للمستفيد<select required value={itemId} onChange={(event) => setItemId(event.target.value)} className="h-11 rounded-md border border-[#d9ded7] bg-white px-3 font-normal"><option value="">اختر الصنف</option>{items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="grid gap-1 text-sm font-bold text-[#173f3a]">الكمية لكل مستفيد (اختياري)<input type="number" min="1" step="1" value={quantityPerUser} onChange={(event) => setQuantityPerUser(event.target.value)} placeholder="الكمية لم تحدد بعد" className="h-11 rounded-md border border-[#d9ded7] px-3 font-normal" /></label>
          <label className="grid gap-1 text-sm font-bold text-[#173f3a] sm:col-span-2">تفاصيل العرض<textarea maxLength={600} value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-20 rounded-md border border-[#d9ded7] p-3 font-normal" /></label>
          <label className="grid gap-1 text-sm font-bold text-[#173f3a]">الحد الأقصى للمستفيدين<input type="number" min="1" value={maxRecipients} onChange={(event) => setMaxRecipients(event.target.value)} placeholder="اتركه فارغًا لعدد غير محدود" className="h-11 rounded-md border border-[#d9ded7] px-3 font-normal" /></label>
          <label className="grid gap-1 text-sm font-bold text-[#173f3a]">صورة الإعلان<input required={editingOfferId === null} type="file" accept="image/*" onChange={(event) => setImage(event.target.files?.[0] || null)} className="min-h-11 rounded-md border border-[#d9ded7] p-2 text-xs font-normal" />{editingOfferId !== null && <span className="text-[11px] font-normal text-[#89918c]">اتركه فارغًا للاحتفاظ بالصورة الحالية</span>}</label>
          <fieldset className="rounded-md border border-[#d9ded7] p-3 sm:col-span-2"><legend className="px-1 text-sm font-bold text-[#173f3a]">المراكز المتاحة</legend><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{districts.map((district) => <label key={district} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selectedDistricts.includes(district)} onChange={(event) => setSelectedDistricts((current) => event.target.checked ? [...current, district] : current.filter((item) => item !== district))} />{district}</label>)}</div></fieldset>
          <label className="grid gap-1 text-xs font-bold text-[#596963]">يبدأ في<input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className="h-11 rounded-md border border-[#d9ded7] px-2 font-normal" /></label>
          <label className="grid gap-1 text-xs font-bold text-[#596963]">ينتهي في<input type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} className="h-11 rounded-md border border-[#d9ded7] px-2 font-normal" /></label>
          <div className="flex flex-wrap gap-4 sm:col-span-2"><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={showInScroll} onChange={(event) => setShowInScroll(event.target.checked)} />شريط الإعلانات</label><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={showInPopup} onChange={(event) => setShowInPopup(event.target.checked)} />نافذة منبثقة</label></div>
          <div className="grid gap-2 sm:col-span-2 sm:grid-cols-2">
            <button disabled={busy} className="h-11 rounded-md bg-[#173f3a] font-bold text-white disabled:opacity-50">{busy ? "جار الحفظ..." : editingOfferId === null ? "إنشاء كمسودة" : "حفظ التعديلات"}</button>
            {editingOfferId !== null && <button type="button" onClick={clearDraft} className="h-11 rounded-md border border-[#d9ded7] bg-white font-bold text-[#596963]">إلغاء التعديل</button>}
          </div>
        </form>
        {message && <p className="mt-3 text-sm font-semibold text-[#39704f]">{message}</p>}
      </div>

      <div className="grid gap-3">
        {offers.map((offer) => {
          const offerSignups = signups.filter((signup) => signup.offer_id === offer.id);
          const remaining = offer.max_recipients === null ? null : Math.max(0, offer.max_recipients - offerSignups.length);
          return (
            <article key={offer.id} className="overflow-hidden rounded-lg border border-[#dfe4dc] bg-white">
              <div className="grid sm:grid-cols-[180px_1fr]">
                <img src={offer.image_url} alt="" className="h-40 w-full bg-[#eef0ea] object-cover sm:h-full" />
                <div className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-display text-lg font-bold text-[#173f3a]">{offer.title}</h3><p className="mt-1 text-xs font-bold text-[#39704f]">الصنف: {offer.item_name || "غير محدد"} · {offer.quantity_per_user === null ? "الكمية لم تحدد بعد" : `لكل مستفيد ${offer.quantity_per_user}`}</p><p className="mt-1 text-xs text-[#72807a]">الكود: {offer.code_prefix}1 · {offerSignups.length} تسجيل · {remaining === null ? "دون حد" : `بقي ${remaining}`}</p><p className="mt-1 text-xs text-[#72807a]">المراكز: {offer.allowed_districts.join("، ")}</p><p className={`mt-2 text-xs font-bold ${offer.public_visibility ? "text-[#39704f]" : "text-[#a9584d]"}`}>{offer.public_visibility ? "ظاهر للزوار الآن" : `غير ظاهر: ${offer.visibility_reason}`}</p></div><div className="flex flex-wrap items-center gap-2"><select aria-label={`حالة العرض ${offer.title}`} value={offer.status} onChange={(event) => void updateStatus(offer.id, event.target.value)} className="h-10 rounded-md border border-[#d9ded7] bg-white px-3 text-sm"><option value="draft">مسودة</option><option value="active">نشط</option><option value="paused">متوقف</option><option value="ended">منتهي</option></select><button type="button" onClick={() => editOffer(offer)} className="h-10 rounded-md border border-[#c9d1ca] px-3 text-xs font-bold text-[#173f3a]">تعديل</button><button type="button" onClick={() => void deleteOffer(offer)} className="h-10 rounded-md border border-[#dfbbb5] px-3 text-xs font-bold text-[#a9584d]">حذف</button></div></div>
                  <div className="mt-4 grid gap-2">
                    {offerSignups.map((signup) => (
                      <div key={signup.id} className="grid gap-2 rounded-md border border-[#e6e9e4] bg-[#fafbf9] p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                        <div className="min-w-0 text-sm"><strong className="ml-2 font-mono text-[#173f3a]">{signup.code}</strong><strong>{signup.name}</strong><p className="mt-1 text-xs text-[#72807a]">{signup.phone} · {signup.district}{signup.village ? ` · ${signup.village}` : ""} · {new Date(signup.created_at).toLocaleString("ar-EG")}</p>{signup.attachment_url && <a href={signup.attachment_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-bold text-[#39704f] underline">عرض المرفق: {signup.attachment_name}</a>}</div>
                        <select value={signup.status} onChange={(event) => void updateSignupStatus(signup.id, event.target.value)} className="h-9 rounded-md border border-[#d9ded7] bg-white px-2 text-xs">{Object.entries(signupStatusLabels).map(([status, label]) => <option key={status} value={status}>{label}</option>)}</select>
                      </div>
                    ))}
                    {!offerSignups.length && <p className="text-xs text-[#89918c]">لا يوجد مسجلون حتى الآن.</p>}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
        {!offers.length && <p className="rounded-md border border-dashed border-[#ccd3cc] py-10 text-center text-sm text-[#7c8782]">لا توجد عروض بعد.</p>}
      </div>
    </section>
  );
}
