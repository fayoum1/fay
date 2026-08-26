"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Check,
  Clock3,
  Coffee,
  LockKeyhole,
  LogOut,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Smartphone,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Item = {
  id: number;
  name: string;
  category: string;
  price: number;
  emoji: string;
  color: string;
  image_url?: string;
};
type Order = {
  id: string;
  phone: string;
  items: string;
  total: number;
  status: "قيد التنفيذ" | "تم";
  created_at: string;
};
type SiteSettings = {
  id?: number;
  name: string;
  tagline: string;
  branch: string;
  phone: string;
  secondary_phone: string;
  logo_url?: string;
};

const defaultSettings: SiteSettings = {
  name: "رَشفة",
  tagline: "نظام الحجوزات",
  branch: "الفرع الرئيسي",
  phone: "",
  secondary_phone: "",
};

const items: Item[] = [
  {
    id: 1,
    name: "لاتيه ساخن",
    category: "قهوة",
    price: 55,
    emoji: "☕",
    color: "bg-[#f5dfc1]",
  },
  {
    id: 2,
    name: "كابتشينو",
    category: "قهوة",
    price: 60,
    emoji: "🥛",
    color: "bg-[#e9d3b1]",
  },
  {
    id: 3,
    name: "كولد برو",
    category: "بارد",
    price: 65,
    emoji: "🧊",
    color: "bg-[#c8e3e0]",
  },
  {
    id: 4,
    name: "شاي أخضر",
    category: "ساخن",
    price: 35,
    emoji: "🍵",
    color: "bg-[#dce7c9]",
  },
  {
    id: 5,
    name: "كرواسون زبدة",
    category: "مخبوزات",
    price: 45,
    emoji: "🥐",
    color: "bg-[#f3cf8f]",
  },
  {
    id: 6,
    name: "تشيز كيك",
    category: "حلويات",
    price: 75,
    emoji: "🍰",
    color: "bg-[#f0c8c7]",
  },
];

const demoOrders: Order[] = [
  {
    id: "#1042",
    phone: "010 2345 6789",
    items: "لاتيه ساخن × 2، كرواسون زبدة × 1",
    total: 155,
    status: "قيد التنفيذ",
    created_at: "منذ 3 دقائق",
  },
  {
    id: "#1041",
    phone: "011 8765 4321",
    items: "كولد برو × 1، تشيز كيك × 1",
    total: 140,
    status: "تم",
    created_at: "منذ 12 دقيقة",
  },
];

export default function Home() {
  const [view, setView] = useState<"cashier" | "admin">("cashier");
  const [phone, setPhone] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("الكل");
  const [cart, setCart] = useState<Record<number, number>>({});
  const [orders, setOrders] = useState(demoOrders);
  const [notice, setNotice] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [menuItems, setMenuItems] = useState(items);
  const [adminTab, setAdminTab] = useState<"orders" | "menu" | "settings">(
    "orders",
  );
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);

  const filteredItems = menuItems.filter(
    (item) =>
      (category === "الكل" || item.category === category) &&
      item.name.includes(query),
  );
  const cartItems = Object.entries(cart)
    .filter(([, quantity]) => quantity > 0)
    .map(([id, quantity]) => ({
      item: menuItems.find((entry) => entry.id === Number(id))!,
      quantity,
    }))
    .filter(({ item }) => item);
  const total = cartItems.reduce(
    (sum, entry) => sum + entry.item.price * entry.quantity,
    0,
  );
  const categories = [
    "الكل",
    ...new Set(menuItems.map((item) => item.category)),
  ];

  useEffect(() => {
    fetch("/api/admin/session")
      .then((response) => setAdminAuthenticated(response.ok))
      .catch(() => setAdminAuthenticated(false));
    fetch("/api/settings")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) setSettings({ ...defaultSettings, ...data });
      })
      .catch(() => undefined);
  }, []);

  const updateQuantity = (id: number, delta: number) =>
    setCart((current) => ({
      ...current,
      [id]: Math.max(0, (current[id] || 0) + delta),
    }));
  const submitOrder = async () => {
    if (phone.trim().length < 8) return setNotice("اكتب رقم هاتف صحيح أولاً");
    if (!cartItems.length) return setNotice("أضف صنفاً واحداً على الأقل للسلة");
    const orderItems = cartItems
      .map(({ item, quantity }) => `${item.name} × ${quantity}`)
      .join("، ");
    const { error } = supabase
      ? await supabase
          .from("orders")
          .insert({
            phone: phone.trim(),
            items: cartItems.map(({ item, quantity }) => ({
              id: item.id,
              name: item.name,
              quantity,
              price: item.price,
            })),
            total,
            status: "قيد التنفيذ",
          })
      : { error: null };
    if (error) return setNotice("تعذر حفظ الطلب، راجع إعدادات Supabase");
    setOrders((current) => [
      {
        id: `#${1043 + current.length}`,
        phone,
        items: orderItems,
        total,
        status: "قيد التنفيذ",
        created_at: "الآن",
      },
      ...current,
    ]);
    setCart({});
    setPhone("");
    setNotice("تم تسجيل الحجز بنجاح");
  };

  const markDone = async (id: string) => {
    const numericId = Number(id.replace("#", ""));
    if (supabase && Number.isFinite(numericId))
      await supabase
        .from("orders")
        .update({ status: "تم" })
        .eq("id", numericId);
    setOrders((current) =>
      current.map((order) =>
        order.id === id ? { ...order, status: "تم" } : order,
      ),
    );
  };

  const openAdmin = () => {
    setView("admin");
    setAdminTab("orders");
    setAdminError("");
  };

  const loginAdmin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAdminError("");
    const response = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: adminPin }),
    });
    if (!response.ok) return setAdminError("الرقم السري غير صحيح");
    setAdminAuthenticated(true);
    setAdminPin("");
  };

  const logoutAdmin = async () => {
    await fetch("/api/admin/session", { method: "DELETE" });
    setAdminAuthenticated(false);
    setView("cashier");
  };

  return (
    <main className="min-h-screen bg-[#f7f6f2] text-[#202a27]" dir="rtl">
      <header className="border-b border-[#dedfd8] bg-[#fbfaf7]">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center overflow-hidden rounded-xl bg-[#173f3a] text-[#f4c95d]">
              {settings.logo_url ? (
                <Image
                  src={settings.logo_url}
                  alt=""
                  className="size-full object-cover"
                  width={40}
                  height={40}
                />
              ) : (
                <Coffee size={21} />
              )}
            </div>
            <div>
              <p className="font-display text-lg font-bold tracking-tight">
                {settings.name}
              </p>
              <p className="text-[11px] text-[#72807a]">{settings.tagline}</p>
            </div>
          </div>
          <nav className="flex rounded-xl bg-[#eef0ea] p-1 text-sm font-semibold">
            <button
              onClick={() => setView("cashier")}
              className={`rounded-lg px-4 py-2 transition ${view === "cashier" ? "bg-white text-[#173f3a] shadow-sm" : "text-[#72807a]"}`}
            >
              الكاشير
            </button>
            <button
              onClick={openAdmin}
              className={`rounded-lg px-4 py-2 transition ${view === "admin" ? "bg-white text-[#173f3a] shadow-sm" : "text-[#72807a]"}`}
            >
              الأدمن
            </button>
          </nav>
          <div className="hidden items-center gap-2 text-xs text-[#72807a] sm:flex">
            <span className="size-2 rounded-full bg-[#5aa67d]" />{" "}
            {settings.branch} <span className="mx-1 text-[#c2c8c2]">|</span>{" "}
            {settings.phone || "أضف رقم الهاتف"}
          </div>
        </div>
      </header>
      {view === "cashier" ? (
        <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-8 lg:grid-cols-[1fr_380px] lg:px-10">
          <section>
            <div className="mb-8 flex items-end justify-between">
              <div>
                <p className="mb-2 text-sm font-semibold text-[#c48738]">
                  صباح الخير، كابتن
                </p>
                <h1 className="font-display text-4xl font-bold tracking-tight text-[#173f3a]">
                  {settings.name}
                </h1>
                <p className="mt-2 text-sm text-[#72807a]">
                  {settings.tagline}
                </p>
              </div>
              <div className="hidden rounded-2xl border border-[#e2e1d8] bg-[#fffdf8] px-4 py-3 text-right sm:block">
                <p className="text-[11px] text-[#89918c]">طلبات اليوم</p>
                <p className="font-display text-2xl font-bold text-[#173f3a]">
                  24
                </p>
              </div>
            </div>
            <div className="mb-6 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search
                  className="absolute right-4 top-3.5 text-[#9ca49d]"
                  size={18}
                />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="ابحث عن صنف..."
                  className="h-12 w-full rounded-xl border border-[#dedfd8] bg-white pr-11 pl-4 text-sm outline-none transition focus:border-[#173f3a]"
                />
              </div>
              <div className="flex gap-2 overflow-auto pb-1">
                {categories.map((entry) => (
                  <button
                    key={entry}
                    onClick={() => setCategory(entry)}
                    className={`whitespace-nowrap rounded-xl px-4 text-sm font-semibold ${category === entry ? "bg-[#173f3a] text-white" : "border border-[#dedfd8] bg-white text-[#72807a]"}`}
                  >
                    {entry}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {filteredItems.map((item) => (
                <article
                  key={item.id}
                  className="group rounded-2xl border border-[#e4e3da] bg-[#fffdf9] p-3 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-[#173f3a0d]"
                >
                  <div
                    role="img"
                    aria-label={item.name}
                    className={`grid aspect-[1.3] place-items-center rounded-xl ${item.color} bg-cover bg-center text-6xl transition group-hover:scale-[1.02]`}
                    style={
                      item.image_url
                        ? { backgroundImage: `url(${item.image_url})` }
                        : undefined
                    }
                  >
                    {!item.image_url && item.emoji}
                  </div>
                  <div className="flex items-start justify-between gap-2 px-1 pt-3">
                    <div>
                      <h2 className="font-semibold">{item.name}</h2>
                      <p className="mt-1 text-xs text-[#8b948e]">
                        {item.category}
                      </p>
                    </div>
                    <p className="font-display text-lg font-bold text-[#c48738]">
                      {item.price}
                      <span className="mr-1 text-[10px] font-normal text-[#8b948e]">
                        ج.م
                      </span>
                    </p>
                  </div>
                  <button
                    onClick={() => updateQuantity(item.id, 1)}
                    className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#edf0e9] text-sm font-bold text-[#173f3a] transition hover:bg-[#dfe7df]"
                  >
                    <Plus size={16} /> إضافة للسلة
                  </button>
                </article>
              ))}
            </div>
          </section>
          <aside className="h-fit rounded-2xl border border-[#e0e1d9] bg-[#fffdf9] p-5 shadow-[0_12px_40px_#173f3a08] lg:sticky lg:top-6">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-[#f4e7c9] text-[#c48738]">
                  <ShoppingBag size={19} />
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold text-[#173f3a]">
                    سلة الطلب
                  </h2>
                  <p className="text-xs text-[#8b948e]">
                    {cartItems.length} أصناف مختارة
                  </p>
                </div>
              </div>
              {cartItems.length > 0 && (
                <button
                  onClick={() => setCart({})}
                  className="text-xs text-[#a16a4a]"
                >
                  إفراغ
                </button>
              )}
            </div>
            <div className="mb-5 space-y-3">
              {cartItems.length ? (
                cartItems.map(({ item, quantity }) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl bg-[#f6f6f1] p-3"
                  >
                    <span
                      className="grid size-10 place-items-center rounded-lg bg-white text-2xl"
                      style={
                        item.image_url
                          ? {
                              backgroundImage: `url(${item.image_url})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                            }
                          : undefined
                      }
                    >
                      {!item.image_url && item.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {item.name}
                      </p>
                      <p className="text-xs text-[#c48738]">
                        {item.price * quantity} ج.م
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="grid size-7 place-items-center rounded-md bg-white text-[#718079]"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="w-3 text-center text-sm font-bold">
                        {quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="grid size-7 place-items-center rounded-md bg-[#173f3a] text-white"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-[#d7dad2] py-10 text-center text-sm text-[#89918c]">
                  <ShoppingBag
                    className="mx-auto mb-2 text-[#b5bcb5]"
                    size={25}
                  />
                  السلة فاضية حالياً
                </div>
              )}
            </div>
            <div className="mb-4 border-t border-[#e7e7df] pt-4">
              <div className="mb-2 flex justify-between text-sm text-[#72807a]">
                <span>الإجمالي</span>
                <strong className="font-display text-2xl text-[#173f3a]">
                  {total} <small className="text-xs font-normal">ج.م</small>
                </strong>
              </div>
            </div>
            <div className="relative mb-3">
              <Smartphone
                className="absolute right-3 top-3 text-[#a2aaa3]"
                size={16}
              />
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="رقم الهاتف للحجز"
                className="h-11 w-full rounded-xl border border-[#dedfd8] bg-white pr-10 pl-3 text-sm outline-none focus:border-[#173f3a]"
              />
            </div>
            <button
              onClick={submitOrder}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#c48738] font-bold text-white transition hover:bg-[#ad722c]"
            >
              <Check size={18} /> تأكيد الحجز
            </button>
            {notice && (
              <p className="mt-3 text-center text-xs font-semibold text-[#56816c]">
                {notice}
              </p>
            )}
          </aside>
        </div>
      ) : !adminAuthenticated ? (
        <section className="mx-auto flex min-h-[560px] max-w-[560px] items-center justify-center px-5 py-8 lg:px-10">
          <form
            onSubmit={loginAdmin}
            className="w-full rounded-2xl border border-[#e0e1d9] bg-[#fffdf9] p-7 text-center shadow-[0_12px_40px_#173f3a08]"
          >
            <div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-[#e4eee5] text-[#173f3a]">
              <LockKeyhole size={25} />
            </div>
            <p className="mb-2 text-sm font-semibold text-[#c48738]">
              منطقة محمية
            </p>
            <h1 className="font-display text-3xl font-bold tracking-tight text-[#173f3a]">
              دخول الإدارة
            </h1>
            <p className="mt-2 text-sm text-[#72807a]">
              أدخل الرقم السري للوصول إلى الطلبات.
            </p>
            <input
              autoFocus
              type="password"
              inputMode="numeric"
              value={adminPin}
              onChange={(event) => setAdminPin(event.target.value)}
              placeholder="الرقم السري"
              className="mt-6 h-12 w-full rounded-xl border border-[#dedfd8] bg-white px-4 text-center text-lg tracking-[0.35em] outline-none focus:border-[#173f3a]"
            />
            <button className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#173f3a] font-bold text-white transition hover:bg-[#25534d]">
              <LockKeyhole size={17} /> دخول آمن
            </button>
            {adminError && (
              <p className="mt-3 text-sm font-semibold text-[#a16a4a]">
                {adminError}
              </p>
            )}
          </form>
        </section>
      ) : (
        <section className="mx-auto max-w-[1440px] px-5 py-8 lg:px-10">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="mb-2 text-sm font-semibold text-[#c48738]">
                لوحة المتابعة
              </p>
              <h1 className="font-display text-4xl font-bold tracking-tight text-[#173f3a]">
                الطلبات اليوم
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[#e4eee5] px-4 py-3 text-sm font-semibold text-[#39704f]">
                <span className="ml-2 inline-block size-2 rounded-full bg-[#5aa67d]" />
                {
                  orders.filter((order) => order.status === "قيد التنفيذ")
                    .length
                }{" "}
                قيد التنفيذ
              </div>
              <button
                onClick={logoutAdmin}
                className="flex items-center gap-2 rounded-xl border border-[#dedfd8] bg-white px-4 py-3 text-sm font-semibold text-[#72807a]"
              >
                <LogOut size={16} /> خروج
              </button>
            </div>
          </div>
          <nav className="mb-6 flex w-fit rounded-xl bg-[#eef0ea] p-1 text-sm font-semibold">
            <button
              onClick={() => setAdminTab("orders")}
              className={`rounded-lg px-5 py-2.5 transition ${adminTab === "orders" ? "bg-white text-[#173f3a] shadow-sm" : "text-[#72807a]"}`}
            >
              الطلبات
            </button>
            <button
              onClick={() => setAdminTab("menu")}
              className={`rounded-lg px-5 py-2.5 transition ${adminTab === "menu" ? "bg-white text-[#173f3a] shadow-sm" : "text-[#72807a]"}`}
            >
              إدارة القائمة
            </button>
            <button
              onClick={() => setAdminTab("settings")}
              className={`rounded-lg px-5 py-2.5 transition ${adminTab === "settings" ? "bg-white text-[#173f3a] shadow-sm" : "text-[#72807a]"}`}
            >
              إعدادات الصفحة
            </button>
          </nav>
          {adminTab === "settings" ? (
            <SettingsManager settings={settings} setSettings={setSettings} />
          ) : adminTab === "menu" ? (
            <ItemManager menuItems={menuItems} setMenuItems={setMenuItems} />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[#e0e1d9] bg-[#fffdf9]">
              <div className="hidden grid-cols-[100px_160px_1fr_100px_130px] gap-4 border-b border-[#e7e7df] bg-[#f7f7f2] px-5 py-4 text-xs font-bold text-[#89918c] sm:grid">
                <span>الطلب</span>
                <span>رقم الهاتف</span>
                <span>الأصناف</span>
                <span>الإجمالي</span>
                <span>الحالة</span>
              </div>
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="grid gap-3 border-b border-[#ededE7] px-5 py-5 last:border-0 sm:grid-cols-[100px_160px_1fr_100px_130px] sm:items-center sm:gap-4"
                >
                  <span className="font-display font-bold text-[#173f3a]">
                    {order.id}
                  </span>
                  <span className="text-sm text-[#596963]">{order.phone}</span>
                  <span className="text-sm text-[#596963]">
                    {order.items}
                    <small className="mr-2 block text-xs text-[#a1aaa3]">
                      {order.created_at}
                    </small>
                  </span>
                  <span className="font-display font-bold text-[#c48738]">
                    {order.total} ج.م
                  </span>
                  <button
                    disabled={order.status === "تم"}
                    onClick={() => markDone(order.id)}
                    className={`flex w-fit items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold ${order.status === "تم" ? "bg-[#e4eee5] text-[#39704f]" : "bg-[#fff0d4] text-[#a66c20]"}`}
                  >
                    {order.status === "تم" ? (
                      <Check size={14} />
                    ) : (
                      <Clock3 size={14} />
                    )}
                    {order.status}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
      <footer className="mx-auto max-w-[1440px] px-5 pb-8 pt-2 text-xs text-[#a0a8a1] lg:px-10">
        رَشفة <span className="mx-2">•</span> إدارة الحجوزات ببساطة
      </footer>
    </main>
  );
}

function ItemManager({
  menuItems,
  setMenuItems,
}: {
  menuItems: Item[];
  setMenuItems: (items: Item[]) => void;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState({
    name: "",
    category: "عام",
    price: "",
    emoji: "☕",
    imageUrl: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");

  const saveItem = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = {
      name: draft.name.trim(),
      category: draft.category.trim() || "عام",
      price: Number(draft.price),
      emoji: draft.emoji || "☕",
    };
    if (!payload.name || !Number.isFinite(payload.price) || payload.price < 0)
      return setMessage("راجع اسم الصنف والسعر");
    const formData = new FormData();
    Object.entries(editingId ? { id: editingId, ...payload } : payload).forEach(
      ([key, value]) => formData.append(key, String(value)),
    );
    if (imageFile) formData.append("image", imageFile);
    const response = await fetch("/api/admin/items", {
      method: editingId ? "PATCH" : "POST",
      body: formData,
    });
    if (!response.ok && response.status !== 503)
      return setMessage("تعذر حفظ الصنف");
    const savedResponse = response.ok ? await response.json() : null;
    const saved = {
      id: savedResponse?.id || editingId || Date.now(),
      ...payload,
      image_url: savedResponse?.image_url || draft.imageUrl || undefined,
      color: editingId
        ? menuItems.find((item) => item.id === editingId)?.color ||
          "bg-[#e9d3b1]"
        : "bg-[#e9d3b1]",
    };
    setMenuItems(
      editingId
        ? menuItems.map((item) => (item.id === editingId ? saved : item))
        : [...menuItems, saved],
    );
    setEditingId(null);
    setImageFile(null);
    setDraft({
      name: "",
      category: "عام",
      price: "",
      emoji: "☕",
      imageUrl: "",
    });
    setMessage("تم حفظ الصنف");
  };

  const editItem = (item: Item) => {
    setEditingId(item.id);
    setDraft({
      name: item.name,
      category: item.category,
      price: String(item.price),
      emoji: item.emoji,
      imageUrl: item.image_url || "",
    });
    setImageFile(null);
    setMessage("");
  };
  const removeItem = async (id: number) => {
    await fetch("/api/admin/items", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setMenuItems(menuItems.filter((item) => item.id !== id));
  };

  return (
    <section className="rounded-2xl border border-[#e0e1d9] bg-[#fffdf9] p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-[#c48738]">إدارة القائمة</p>
          <h2 className="font-display text-2xl font-bold text-[#173f3a]">
            الأصناف والأسعار
          </h2>
        </div>
        <span className="text-xs text-[#89918c]">{menuItems.length} أصناف</span>
      </div>
      <form
        onSubmit={saveItem}
        className="mb-5 grid gap-2 rounded-xl bg-[#f6f6f1] p-3 sm:grid-cols-[1.5fr_1fr_100px_70px_auto]"
      >
        <input
          required
          value={draft.name}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          placeholder="اسم الصنف"
          className="h-10 rounded-lg border border-[#dedfd8] bg-white px-3 text-sm outline-none focus:border-[#173f3a]"
        />
        <input
          value={draft.category}
          onChange={(event) =>
            setDraft({ ...draft, category: event.target.value })
          }
          placeholder="التصنيف"
          className="h-10 rounded-lg border border-[#dedfd8] bg-white px-3 text-sm outline-none focus:border-[#173f3a]"
        />
        <input
          required
          type="number"
          min="0"
          value={draft.price}
          onChange={(event) =>
            setDraft({ ...draft, price: event.target.value })
          }
          placeholder="السعر"
          className="h-10 rounded-lg border border-[#dedfd8] bg-white px-3 text-sm outline-none focus:border-[#173f3a]"
        />
        <input
          value={draft.emoji}
          onChange={(event) =>
            setDraft({ ...draft, emoji: event.target.value })
          }
          aria-label="رمز الصنف"
          className="h-10 rounded-lg border border-[#dedfd8] bg-white px-3 text-center text-xl outline-none focus:border-[#173f3a]"
        />
        <label className="flex h-10 cursor-pointer items-center justify-center rounded-lg border border-dashed border-[#c8cec7] bg-white px-3 text-xs font-bold text-[#56816c]">
          {imageFile ? "تم اختيار الصورة" : "رفع صورة"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0] || null;
              setImageFile(file);
              if (file)
                setDraft({ ...draft, imageUrl: URL.createObjectURL(file) });
            }}
          />
        </label>
        <button className="h-10 rounded-lg bg-[#173f3a] px-4 text-sm font-bold text-white">
          {editingId ? "حفظ التعديل" : "إضافة صنف"}
        </button>
      </form>
      {(draft.imageUrl || imageFile) && (
        <div className="mb-3 flex items-center gap-3 text-xs text-[#72807a]">
          <span
            className="size-12 rounded-lg bg-cover bg-center"
            style={{ backgroundImage: `url(${draft.imageUrl})` }}
          />{" "}
          معاينة الصورة
        </div>
      )}
      {message && (
        <p className="mb-3 text-xs font-semibold text-[#56816c]">{message}</p>
      )}
      <div className="grid gap-2">
        {menuItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-xl border border-[#ecece5] px-3 py-2"
          >
            <span
              className="size-10 rounded-lg bg-cover bg-center text-center text-2xl"
              style={
                item.image_url
                  ? { backgroundImage: `url(${item.image_url})` }
                  : undefined
              }
            >
              {!item.image_url && item.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{item.name}</p>
              <p className="text-xs text-[#89918c]">
                {item.category} <span className="mx-1">•</span> {item.price} ج.م
              </p>
            </div>
            <button
              onClick={() => editItem(item)}
              className="rounded-lg bg-[#edf0e9] px-3 py-2 text-xs font-bold text-[#173f3a]"
            >
              تعديل
            </button>
            <button
              onClick={() => removeItem(item.id)}
              className="rounded-lg bg-[#fff0d4] px-3 py-2 text-xs font-bold text-[#a66c20]"
            >
              حذف
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function SettingsManager({ settings, setSettings }: { settings: SiteSettings; setSettings: (settings: SiteSettings) => void }) {
  const [draft, setDraft] = useState(settings);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");

  const saveSettings = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData();
    Object.entries(draft).forEach(([key, value]) => { if (value !== undefined) formData.append(key, String(value)); });
    if (logoFile) formData.append("logo", logoFile);
    const response = await fetch("/api/settings", { method: "PATCH", body: formData });
    if (!response.ok) return setMessage("تعذر حفظ الإعدادات. تأكد من إعداد Supabase");
    const saved = await response.json();
    setSettings(saved);
    setDraft(saved);
    setLogoFile(null);
    setMessage("تم حفظ بيانات الصفحة");
  };

  return <section className="max-w-3xl rounded-2xl border border-[#e0e1d9] bg-[#fffdf9] p-5"><div className="mb-6"><p className="text-sm font-semibold text-[#c48738]">ما يراه العميل</p><h2 className="font-display text-2xl font-bold text-[#173f3a]">إعدادات الصفحة</h2><p className="mt-1 text-sm text-[#72807a]">غيّر اسم المكان والهوية ووسائل التواصل الظاهرة في الواجهة.</p></div><form onSubmit={saveSettings} className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">اسم الصفحة<input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="mt-2 h-11 w-full rounded-xl border border-[#dedfd8] px-3 font-normal outline-none focus:border-[#173f3a]" /></label><label className="text-sm font-semibold">الوصف المختصر<input value={draft.tagline} onChange={(event) => setDraft({ ...draft, tagline: event.target.value })} className="mt-2 h-11 w-full rounded-xl border border-[#dedfd8] px-3 font-normal outline-none focus:border-[#173f3a]" /></label><label className="text-sm font-semibold">اسم الفرع<input value={draft.branch} onChange={(event) => setDraft({ ...draft, branch: event.target.value })} className="mt-2 h-11 w-full rounded-xl border border-[#dedfd8] px-3 font-normal outline-none focus:border-[#173f3a]" /></label><label className="text-sm font-semibold">رقم الهاتف الأساسي<input value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} placeholder="01xxxxxxxxx" className="mt-2 h-11 w-full rounded-xl border border-[#dedfd8] px-3 font-normal outline-none focus:border-[#173f3a]" /></label><label className="text-sm font-semibold">رقم هاتف إضافي<input value={draft.secondary_phone} onChange={(event) => setDraft({ ...draft, secondary_phone: event.target.value })} placeholder="01xxxxxxxxx" className="mt-2 h-11 w-full rounded-xl border border-[#dedfd8] px-3 font-normal outline-none focus:border-[#173f3a]" /></label><label className="text-sm font-semibold">اللوجو<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0] || null; setLogoFile(file); if (file) setDraft({ ...draft, logo_url: URL.createObjectURL(file) }); }} className="mt-2 block w-full rounded-xl border border-dashed border-[#c8cec7] bg-[#f6f6f1] p-2 text-xs font-normal" /></label>{draft.logo_url && <div className="flex items-center gap-3 text-sm text-[#72807a] sm:col-span-2"><span className="size-16 rounded-xl bg-cover bg-center" style={{ backgroundImage: `url(${draft.logo_url})` }} /> معاينة اللوجو</div>}<button className="h-12 rounded-xl bg-[#173f3a] font-bold text-white sm:col-span-2">حفظ إعدادات الصفحة</button></form>{message && <p className="mt-4 text-center text-sm font-semibold text-[#56816c]">{message}</p>}</section>;
}
