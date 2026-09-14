"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, ImagePlus, Store, Users } from "lucide-react";

type SaleItem = { id: number; name: string; category: string };
type SaleStats = { visitor_count: number; submission_count: number };

export default function SellPage() {
  const [items, setItems] = useState<SaleItem[]>([]);
  const [stats, setStats] = useState<SaleStats>({ visitor_count: 0, submission_count: 0 });
  const [form, setForm] = useState({ seller_name: "", phone: "", address: "", item_name: "", quantity: "", age_or_weight: "", price: "" });
  const [customItemName, setCustomItemName] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/sellers/public")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) {
          setItems(Array.isArray(data.items) ? data.items : []);
          setStats(data.stats || { visitor_count: 0, submission_count: 0 });
        }
      })
      .catch(() => setError("تعذر تحميل الأصناف"));
    fetch("/api/sellers/visitors", { method: "POST" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data && typeof data.count === "number") setStats((current) => ({ ...current, visitor_count: data.count }));
      })
      .catch(() => undefined);
  }, []);

  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    const body = new FormData();
    Object.entries(form).forEach(([key, value]) => body.append(key, key === "item_name" && value === "أخرى" ? customItemName : value));
    if (image) body.append("image", image);
    const response = await fetch("/api/sellers/public", { method: "POST", body });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(result.error || "تعذر إرسال العرض");
      setSaving(false);
      return;
    }
    setMessage("تم إرسال تفاصيل العرض بنجاح، وسيتواصل معك فريق المشتريات.");
    setStats((current) => ({ ...current, submission_count: current.submission_count + 1 }));
    setForm({ seller_name: "", phone: "", address: "", item_name: "", quantity: "", age_or_weight: "", price: "" });
    setCustomItemName("");
    setImage(null);
    const fileInput = document.getElementById("seller-image") as HTMLInputElement | null;
    if (fileInput) fileInput.value = "";
    setSaving(false);
  };

  return (
    <main className="min-h-screen bg-[#f7f6f2] px-4 py-6 text-[#202a27] sm:px-6 sm:py-10" dir="rtl">
      <div className="mx-auto max-w-3xl">
        <header className="mb-5 flex items-center justify-between gap-3">
          <a href="/" className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#dedfd8] bg-white px-3 text-sm font-bold text-[#173f3a]">
            <ArrowRight size={16} /> الرئيسية
          </a>
          <div className="text-left text-xs text-[#72807a]">
            <div className="flex items-center justify-end gap-3">
              <span className="inline-flex items-center gap-1"><Users size={14} /> {stats.visitor_count} زائر</span>
              <span className="inline-flex items-center gap-1"><Store size={14} /> {stats.submission_count} عرض</span>
            </div>
          </div>
        </header>
        <section className="rounded-3xl border border-[#e0e1d9] bg-[#fffdf9] p-5 shadow-[0_16px_40px_#173f3a0c] sm:p-8">
          <div className="mb-6 flex items-start gap-3">
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#e4eee5] text-[#173f3a]"><Store size={24} /></div>
            <div>
              <p className="text-sm font-bold text-[#c48738]">سوق التوريد</p>
              <h1 className="font-display text-3xl font-extrabold text-[#173f3a]">اعرض منتجاتك للبيع</h1>
              <p className="mt-1 text-sm leading-6 text-[#72807a]">لأصحاب المزارع والشركات والموردين. اترك التفاصيل وسيتواصل معك فريق المشتريات.</p>
            </div>
          </div>
          <form onSubmit={submit} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-bold text-[#596963]">اسم البائع أو الشركة<input required value={form.seller_name} onChange={(event) => update("seller_name", event.target.value)} className="h-11 rounded-xl border border-[#dedfd8] bg-white px-3 font-normal outline-none focus:border-[#173f3a]" /></label>
              <label className="grid gap-1.5 text-sm font-bold text-[#596963]">رقم الهاتف<input required type="tel" value={form.phone} onChange={(event) => update("phone", event.target.value)} className="h-11 rounded-xl border border-[#dedfd8] bg-white px-3 font-normal outline-none focus:border-[#173f3a]" /></label>
            </div>
            <label className="grid gap-1.5 text-sm font-bold text-[#596963]">العنوان<input required value={form.address} onChange={(event) => update("address", event.target.value)} className="h-11 rounded-xl border border-[#dedfd8] bg-white px-3 font-normal outline-none focus:border-[#173f3a]" /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <label className="grid gap-1.5 text-sm font-bold text-[#596963]">الصنف<select required value={form.item_name} onChange={(event) => update("item_name", event.target.value)} className="select-with-arrow h-11 rounded-xl border border-[#dedfd8] bg-white px-3 font-normal outline-none focus:border-[#173f3a]"><option value="">اختر الصنف</option>{items.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}<option value="أخرى">أخرى</option></select></label>
                {form.item_name === "أخرى" && <input required value={customItemName} onChange={(event) => setCustomItemName(event.target.value)} placeholder="اكتب اسم الصنف غير الموجود" className="h-11 rounded-xl border border-[#c9d8ca] bg-[#f7faf6] px-3 text-sm outline-none focus:border-[#173f3a]" />}
              </div>
              <label className="grid gap-1.5 text-sm font-bold text-[#596963]">العدد<input required type="number" min="1" value={form.quantity} onChange={(event) => update("quantity", event.target.value)} className="h-11 rounded-xl border border-[#dedfd8] bg-white px-3 font-normal outline-none focus:border-[#173f3a]" /></label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-bold text-[#596963]">العمر أو الوزن<input value={form.age_or_weight} onChange={(event) => update("age_or_weight", event.target.value)} placeholder="مثال: 3 شهور أو 2 كجم" className="h-11 rounded-xl border border-[#dedfd8] bg-white px-3 font-normal outline-none focus:border-[#173f3a]" /></label>
              <label className="grid gap-1.5 text-sm font-bold text-[#596963]">السعر<input required type="number" min="0" step="0.01" value={form.price} onChange={(event) => update("price", event.target.value)} className="h-11 rounded-xl border border-[#dedfd8] bg-white px-3 font-normal outline-none focus:border-[#173f3a]" /></label>
            </div>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#cfd8cf] bg-[#f7faf6] p-3 text-sm font-bold text-[#56816c]">
              <ImagePlus size={20} /> <span className="min-w-0 flex-1 truncate">{image ? image.name : "إضافة صورة المنتج (اختياري)"}</span>
              <input id="seller-image" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setImage(event.target.files?.[0] || null)} className="sr-only" />
            </label>
            {error && <p className="rounded-xl bg-[#fff0ed] px-3 py-2 text-sm font-bold text-[#a9584d]">{error}</p>}
            {message && <p className="flex items-center gap-2 rounded-xl bg-[#e9f7ed] px-3 py-2 text-sm font-bold text-[#39704f]"><CheckCircle2 size={18} />{message}</p>}
            <button disabled={saving} className="mt-2 h-12 rounded-xl bg-[#173f3a] text-sm font-bold text-white transition hover:bg-[#25534d] disabled:cursor-wait disabled:opacity-60">{saving ? "جار الإرسال..." : "إضافة العرض"}</button>
          </form>
        </section>
      </div>
    </main>
  );
}
