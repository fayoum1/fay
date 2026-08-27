"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Check,
  Coffee,
  Download,
  LockKeyhole,
  LogOut,
  Minus,
  Plus,
  Radio,
  Search,
  ShoppingBag,
  Smartphone,
  Trash2,
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
  status: OrderStatus;
  created_at: string;
  order_items?: {
    id: number;
    name: string;
    quantity: number;
    category?: string;
  }[];
};
type OrderStatus = "قيد التنفيذ" | "تم" | "لم يرد" | "غير متاح" | "طلب مرفوض";
type UserRole = "admin" | "staff";
const orderStatuses: OrderStatus[] = [
  "قيد التنفيذ",
  "تم",
  "لم يرد",
  "غير متاح",
  "طلب مرفوض",
];
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
  name: "الفيوم للأعلاف والدواجن",
  tagline: "نظام الحجوزات",
  branch: "الفرع الرئيسي",
  phone: "",
  secondary_phone: "",
};
const defaultCategories: string[] = [];
const QURAN_RADIO_URL = "https://stream.radiojar.com/8s5u5tpdtwzuv";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

function validImageUrl(value?: string) {
  if (!value || value === "null" || value === "undefined") return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

function formatOrderDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ar-EG");
}

export default function Home() {
  const [view, setView] = useState<"cashier" | "admin">("cashier");
  const [phone, setPhone] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("الكل");
  const [cart, setCart] = useState<Record<number, number>>({});
  const [orders, setOrders] = useState<Order[]>([]);
  const [notice, setNotice] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [loginRole, setLoginRole] = useState<UserRole>("admin");
  const [adminError, setAdminError] = useState("");
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [menuItems, setMenuItems] = useState<Item[]>([]);
  const [adminTab, setAdminTab] = useState<"orders" | "menu" | "settings">(
    "orders",
  );
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [categoryOptions, setCategoryOptions] = useState(defaultCategories);
  const [todayOrdersCount, setTodayOrdersCount] = useState(0);
  const [orderCategory, setOrderCategory] = useState("الكل");
  const [orderItem, setOrderItem] = useState("الكل");
  const [orderPeriod, setOrderPeriod] = useState("all");
  const [orderStatus, setOrderStatus] = useState("الكل");
  const cartRef = useRef<HTMLElement>(null);
  const radioRef = useRef<HTMLAudioElement>(null);
  const [radioPlaying, setRadioPlaying] = useState(false);
  const [radioError, setRadioError] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstall, setShowIOSInstall] = useState(false);

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
  const cartCount = cartItems.length;
  const categories = [
    "الكل",
    ...new Set(menuItems.map((item) => item.category)),
  ];
  const orderItems = [
    ...new Set(
      orders.flatMap(
        (order) => order.order_items?.map((item) => item.name) || [],
      ),
    ),
  ];
  const filteredOrders = orders.filter((order) => {
    const date = new Date(order.created_at);
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (orderPeriod === "today" && date < start) return false;
    if (orderPeriod === "yesterday") {
      const yesterday = new Date(start);
      yesterday.setDate(start.getDate() - 1);
      if (date < yesterday || date >= start) return false;
    }
    if (orderPeriod === "week") {
      const weekStart = new Date(start);
      weekStart.setDate(start.getDate() - start.getDay());
      if (date < weekStart) return false;
    }
    if (
      orderPeriod === "month" &&
      date < new Date(now.getFullYear(), now.getMonth(), 1)
    )
      return false;
    if (
      orderPeriod === "90days" &&
      date < new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    )
      return false;
    if (
      orderCategory !== "الكل" &&
      !order.order_items?.some(
        (item) =>
          item.category === orderCategory ||
          menuItems.find((menuItem) => menuItem.id === item.id)?.category ===
            orderCategory,
      )
    )
      return false;
    if (
      orderItem !== "الكل" &&
      !order.order_items?.some((item) => item.name === orderItem)
    )
      return false;
    if (orderStatus !== "الكل" && order.status !== orderStatus) return false;
    return true;
  });
  const statusCounts = orderStatuses.reduce<Record<OrderStatus, number>>(
    (counts, status) => ({
      ...counts,
      [status]: filteredOrders.filter((order) => order.status === status)
        .length,
    }),
    { "قيد التنفيذ": 0, تم: 0, "لم يرد": 0, "غير متاح": 0, "طلب مرفوض": 0 },
  );

  useEffect(() => {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    window.setTimeout(() => setIsIOS(ios), 0);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    const handleInstallPrompt = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPromptEvent); };
    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
  }, []);

  useEffect(() => {
    fetch("/api/admin/session")
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        setAdminAuthenticated(response.ok);
        if (response.ok) setUserRole(data?.role || "admin");
      })
      .catch(() => setAdminAuthenticated(false));
    const radio = radioRef.current;
    if (radio) {
      radio
        .play()
        .then(() => setRadioPlaying(true))
        .catch(() => setRadioPlaying(false));
    }
    const startAfterGesture = () => { const currentRadio = radioRef.current; if (currentRadio && currentRadio.paused) currentRadio.play().then(() => setRadioPlaying(true)).catch(() => undefined); window.removeEventListener("pointerdown", startAfterGesture); };
    window.addEventListener("pointerdown", startAfterGesture, { once: true });
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(todayStart.getDate() + 1);
    fetch(
      `/api/orders/count?from=${encodeURIComponent(todayStart.toISOString())}&to=${encodeURIComponent(tomorrowStart.toISOString())}`,
    )
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data && typeof data.count === "number")
          setTodayOrdersCount(data.count);
      })
      .catch(() => undefined);
    fetch("/api/items")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length)
          setMenuItems(
            data.map((item) => ({
              ...item,
              color: item.color || "bg-[#e9d3b1]",
            })),
          );
      })
      .catch(() => undefined);
    fetch("/api/admin/orders")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (Array.isArray(data)) setOrders(data);
      })
      .catch(() => undefined);
    fetch("/api/settings")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) setSettings({ ...defaultSettings, ...data });
      })
      .catch(() => undefined);
    fetch("/api/categories")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length)
          setCategoryOptions(data.map((category) => category.name));
      })
      .catch(() => undefined);
  }, []);

  const installApp = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  const toggleRadio = async () => {
    const radio = radioRef.current;
    if (!radio) return;
    if (radioPlaying) {
      radio.pause();
      setRadioPlaying(false);
      return;
    }
    try {
      setRadioError(false);
      await radio.play();
      setRadioPlaying(true);
    } catch {
      setRadioPlaying(false);
      setRadioError(true);
    }
  };

  const handleRadioError = () => { setRadioPlaying(false); setRadioError(true); };

  const installOnIOS = () => setShowIOSInstall(true);

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
      ? await supabase.from("orders").insert({
          phone: phone.trim(),
          items: cartItems.map(({ item, quantity }) => ({
            id: item.id,
            name: item.name,
            category: item.category,
            quantity,
            price: item.price,
          })),
          total,
          status: "قيد التنفيذ",
        })
      : { error: null };
    if (error) return setNotice("تعذر حفظ الطلب، راجع اتصال Supabase");
    setOrders((current) => [
      {
        id: `#${1043 + current.length}`,
        phone,
        items: orderItems,
        total,
        status: "قيد التنفيذ",
        created_at: new Date().toISOString(),
      },
      ...current,
    ]);
    setCart({});
    setPhone("");
    setTodayOrdersCount((count) => count + 1);
    setNotice("تم تسجيل الحجز بنجاح");
  };

  const updateOrderStatus = async (id: string, status: OrderStatus) => {
    const numericId = Number(id.replace("#", ""));
    const response = await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: numericId, status }),
    });
    if (!response.ok) return;
    setOrders((current) =>
      current.map((order) => (order.id === id ? { ...order, status } : order)),
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
      body: JSON.stringify({ pin: adminPin, role: loginRole }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok)
      return setAdminError(result.error || "الرقم السري غير صحيح");
    setAdminAuthenticated(true);
    setUserRole(result.role || loginRole);
    setAdminPin("");
  };

  const logoutAdmin = async () => {
    await fetch("/api/admin/session", { method: "DELETE" });
    setAdminAuthenticated(false);
    setUserRole(null);
    setView("cashier");
  };

  return (
    <main className="min-h-screen bg-[#f7f6f2] text-[#202a27]" dir="rtl">
      <header className="border-b border-[#dedfd8] bg-[#fbfaf7]">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center overflow-hidden rounded-xl bg-[#173f3a] text-[#f4c95d]">
              {validImageUrl(settings.logo_url) ? (
                <Image
                  src={validImageUrl(settings.logo_url)!}
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
          <nav className="hidden rounded-xl bg-[#eef0ea] p-1 text-sm font-semibold lg:flex">
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
          <div className="hidden items-center gap-2 lg:flex">
            <div className="flex h-14 min-w-32 items-center justify-center gap-3 rounded-xl border border-[#e2e1d8] bg-[#fffdf8] px-4 text-right">
              <p className="text-[11px] text-[#89918c]">طلبات اليوم</p>
              <p className="font-display text-xl font-bold text-[#173f3a]">
                {todayOrdersCount}
              </p>
            </div>
            <button
              onClick={() =>
                cartRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                })
              }
              className="relative grid size-14 place-items-center rounded-xl bg-[#173f3a] text-white"
              aria-label="فتح السلة"
            >
              <ShoppingBag size={18} />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-[#c48738] text-[10px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </button>
            {(installPrompt || isIOS) && <button onClick={isIOS ? installOnIOS : installApp} className="grid size-14 shrink-0 place-items-center rounded-xl border border-[#e2e1d8] bg-[#fffdf8] text-[#173f3a]" aria-label="تثبيت التطبيق" title="تثبيت التطبيق"><Download size={18} /></button>}
          </div>
          <div className="hidden items-center gap-2 text-xs text-[#72807a] sm:flex">
            <span className="size-2 rounded-full bg-[#5aa67d]" />{" "}
            {settings.branch} <span className="mx-1 text-[#c2c8c2]">|</span>{" "}
            {settings.phone || "أضف رقم الهاتف"}
          </div>
          <button
            onClick={toggleRadio}
            className={`grid size-12 shrink-0 place-items-center rounded-xl border ${radioPlaying ? "border-[#c48738] bg-[#fff0d4] text-[#a66c20]" : "border-[#e2e1d8] bg-[#fffdf8] text-[#173f3a]"}`}
            aria-label={radioPlaying ? "إيقاف إذاعة القرآن الكريم" : "تشغيل إذاعة القرآن الكريم"}
            title="إذاعة القرآن الكريم من مصر"
          >
            <Radio size={19} />
          </button>
          {(installPrompt || isIOS) && <button onClick={isIOS ? installOnIOS : installApp} className="flex h-12 items-center gap-2 rounded-xl bg-[#c48738] px-3 text-xs font-bold text-white" aria-label="تثبيت التطبيق"><Download size={16} /> تثبيت التطبيق</button>}
        </div>
      </header>
      <div className="border-b border-[#dedfd8] bg-[#fbfaf7] px-5 py-3 lg:hidden">
        <div className="mx-auto grid max-w-[1440px] grid-cols-2 items-center gap-2">
          <nav className="flex h-14 w-full rounded-xl bg-[#eef0ea] p-1 text-xs font-semibold">
            <button
              onClick={() => setView("cashier")}
              className={`flex-1 rounded-lg px-2 py-2 ${view === "cashier" ? "bg-white text-[#173f3a] shadow-sm" : "text-[#72807a]"}`}
            >
              الكاشير
            </button>
            <button
              onClick={openAdmin}
              className={`flex-1 rounded-lg px-2 py-2 ${view === "admin" ? "bg-white text-[#173f3a] shadow-sm" : "text-[#72807a]"}`}
            >
              الأدمن
            </button>
          </nav>
          <div className="flex items-center justify-end gap-2">
            <div className="flex h-14 flex-1 items-center justify-center gap-2 rounded-xl border border-[#e2e1d8] bg-[#fffdf8] px-2">
              <p className="text-[10px] text-[#89918c]">طلبات اليوم</p>
              <p className="font-display text-lg font-bold text-[#173f3a]">
                {todayOrdersCount}
              </p>
            </div>
            <button
              onClick={() =>
                cartRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                })
              }
              className="relative grid size-14 shrink-0 place-items-center rounded-xl bg-[#173f3a] text-white"
              aria-label="فتح السلة"
            >
              <ShoppingBag size={18} />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-[#c48738] text-[10px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
      <audio
        ref={radioRef}
        src={QURAN_RADIO_URL}
        autoPlay
        loop
        playsInline
        preload="none"
        onPlay={() => setRadioPlaying(true)}
        onPause={() => setRadioPlaying(false)}
        onError={handleRadioError}
        aria-label="إذاعة القرآن الكريم من مصر"
      />
      {showIOSInstall && <div className="fixed inset-x-4 top-4 z-50 rounded-2xl border border-[#e2e1d8] bg-[#fffdf9] p-4 text-right shadow-2xl"><button onClick={() => setShowIOSInstall(false)} className="float-left text-xl text-[#72807a]" aria-label="إغلاق">×</button><p className="font-bold text-[#173f3a]">تثبيت التطبيق على iPhone</p><p className="mt-2 text-sm leading-6 text-[#596963]">اضغط زر المشاركة في المتصفح، ثم اختر <strong>إضافة إلى الشاشة الرئيسية</strong>، وبعدها افتح التطبيق من الأيقونة.</p></div>}
      {radioError && <button onClick={toggleRadio} className="fixed bottom-4 left-4 z-40 rounded-xl bg-[#fff0d4] px-3 py-2 text-xs font-bold text-[#a66c20] shadow-lg">تعذر تشغيل الإذاعة، اضغط للمحاولة</button>}
      {view === "cashier" ? (
        <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-8 lg:grid-cols-[1fr_380px] lg:px-10">
          <section>
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
          <aside
            ref={cartRef}
            className="h-fit rounded-2xl border border-[#e0e1d9] bg-[#fffdf9] p-5 shadow-[0_12px_40px_#173f3a08] lg:sticky lg:top-6"
          >
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
            <div className="mt-6 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLoginRole("admin")}
                className={`h-11 rounded-xl text-sm font-bold ${loginRole === "admin" ? "bg-[#173f3a] text-white" : "bg-[#eef0ea] text-[#72807a]"}`}
              >
                أدمن
              </button>
              <button
                type="button"
                onClick={() => setLoginRole("staff")}
                className={`h-11 rounded-xl text-sm font-bold ${loginRole === "staff" ? "bg-[#173f3a] text-white" : "bg-[#eef0ea] text-[#72807a]"}`}
              >
                موظف
              </button>
            </div>
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
              <div className="flex flex-wrap justify-end gap-2">
                {orderStatuses.map((status) => (
                  <div
                    key={status}
                    className={`rounded-xl px-3 py-2 text-xs font-semibold ${status === "قيد التنفيذ" ? "bg-[#fff0d4] text-[#a66c20]" : status === "تم" ? "bg-[#e4eee5] text-[#39704f]" : "bg-[#f0ece8] text-[#7d6559]"}`}
                  >
                    <span className="ml-1">{statusCounts[status]}</span>{" "}
                    {status}
                  </div>
                ))}
              </div>
              <button
                onClick={logoutAdmin}
                className="flex items-center gap-2 rounded-xl border border-[#dedfd8] bg-white px-4 py-3 text-sm font-semibold text-[#72807a]"
              >
                <LogOut size={16} /> خروج
              </button>
            </div>
          </div>
          {userRole === "admin" && (
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
          )}
          {userRole === "staff" ? (
            <div className="overflow-hidden rounded-2xl border border-[#e0e1d9] bg-[#fffdf9]">
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between gap-4 border-b border-[#ededE7] px-5 py-5 last:border-0"
                >
                  <div>
                    <p className="font-display font-bold text-[#173f3a]">
                      {order.id}{" "}
                      <span className="mr-3 text-sm font-normal text-[#596963]">
                        {order.phone}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-[#596963]">{order.items}</p>
                    <small className="text-xs text-[#a1aaa3]">
                      {formatOrderDate(order.created_at)}
                    </small>
                  </div>
                  <select
                    value={order.status}
                    onChange={(event) =>
                      void updateOrderStatus(
                        order.id,
                        event.target.value as OrderStatus,
                      )
                    }
                    className="rounded-lg border-0 bg-[#fff0d4] px-3 py-2 text-xs font-bold text-[#a66c20] outline-none"
                  >
                    {orderStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          ) : adminTab === "settings" ? (
            <SettingsManager settings={settings} setSettings={setSettings} />
          ) : adminTab === "menu" ? (
            <ItemManager
              menuItems={menuItems}
              setMenuItems={setMenuItems}
              categories={categoryOptions}
              setCategories={setCategoryOptions}
              onSessionExpired={() => {
                setAdminAuthenticated(false);
                setView("admin");
              }}
            />
          ) : (
            <>
              <div className="mb-5 rounded-2xl border border-[#e0e1d9] bg-[#fffdf9] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold text-[#173f3a]">
                    فلترة الطلبات
                  </h2>
                  <span className="text-xs text-[#89918c]">
                    {filteredOrders.length} نتيجة
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-4">
                  <select
                    value={orderCategory}
                    onChange={(event) => setOrderCategory(event.target.value)}
                    className="h-11 rounded-xl border border-[#dedfd8] bg-white px-3 text-sm outline-none focus:border-[#173f3a]"
                  >
                    <option value="الكل">كل الفئات</option>
                    {categoryOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <select
                    value={orderItem}
                    onChange={(event) => setOrderItem(event.target.value)}
                    className="h-11 rounded-xl border border-[#dedfd8] bg-white px-3 text-sm outline-none focus:border-[#173f3a]"
                  >
                    <option value="الكل">كل الأصناف</option>
                    {orderItems.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <select
                    value={orderPeriod}
                    onChange={(event) => setOrderPeriod(event.target.value)}
                    className="h-11 rounded-xl border border-[#dedfd8] bg-white px-3 text-sm outline-none focus:border-[#173f3a]"
                  >
                    <option value="all">كل الفترات</option>
                    <option value="today">اليوم</option>
                    <option value="yesterday">أمس</option>
                    <option value="week">هذا الأسبوع</option>
                    <option value="month">هذا الشهر</option>
                    <option value="90days">آخر 90 يوم</option>
                  </select>
                  <select
                    value={orderStatus}
                    onChange={(event) => setOrderStatus(event.target.value)}
                    className="h-11 rounded-xl border border-[#dedfd8] bg-white px-3 text-sm outline-none focus:border-[#173f3a]"
                  >
                    <option value="الكل">كل الحالات</option>
                    {orderStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="overflow-hidden rounded-2xl border border-[#e0e1d9] bg-[#fffdf9]">
                <div className="hidden grid-cols-[100px_160px_1fr_100px_130px] gap-4 border-b border-[#e7e7df] bg-[#f7f7f2] px-5 py-4 text-xs font-bold text-[#89918c] sm:grid">
                  <span>الطلب</span>
                  <span>رقم الهاتف</span>
                  <span>الأصناف</span>
                  <span>الإجمالي</span>
                  <span>الحالة</span>
                </div>
                {filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    className="grid gap-3 border-b border-[#ededE7] px-5 py-5 last:border-0 sm:grid-cols-[100px_160px_1fr_100px_130px] sm:items-center sm:gap-4"
                  >
                    <span className="font-display font-bold text-[#173f3a]">
                      {order.id}
                    </span>
                    <span className="text-sm text-[#596963]">
                      {order.phone}
                    </span>
                    <span className="text-sm text-[#596963]">
                      {order.items}
                      <small className="mr-2 block text-xs text-[#a1aaa3]">
                        {formatOrderDate(order.created_at)}
                      </small>
                    </span>
                    <span className="font-display font-bold text-[#c48738]">
                      {order.total} ج.م
                    </span>
                    <select
                      value={order.status}
                      onChange={(event) =>
                        void updateOrderStatus(
                          order.id,
                          event.target.value as OrderStatus,
                        )
                      }
                      className={`w-fit rounded-lg border-0 px-3 py-2 text-xs font-bold outline-none ${order.status === "تم" ? "bg-[#e4eee5] text-[#39704f]" : "bg-[#fff0d4] text-[#a66c20]"}`}
                    >
                      {orderStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      )}
      <footer className="mx-auto max-w-[1440px] px-5 pb-8 pt-2 text-xs text-[#a0a8a1] lg:px-10">
        {settings.name} <span className="mx-2">•</span> إدارة الحجوزات ببساطة
      </footer>
    </main>
  );
}

function ItemManager({
  menuItems,
  setMenuItems,
  categories,
  setCategories,
  onSessionExpired,
}: {
  menuItems: Item[];
  setMenuItems: (items: Item[]) => void;
  categories: string[];
  setCategories: (categories: string[]) => void;
  onSessionExpired: () => void;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState({
    name: "",
    category: categories[0] || "",
    price: "",
    imageUrl: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [newCategory, setNewCategory] = useState("");

  const addCategory = async () => {
    const name = newCategory.trim();
    if (!name || categories.includes(name))
      return setMessage("اكتب فئة جديدة غير مكررة");
    const response = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const result = await response.json().catch(() => ({}));
    if (response.status === 401) {
      onSessionExpired();
      return setMessage("انتهت جلسة الأدمن، سجل الدخول مرة أخرى");
    }
    if (!response.ok) return setMessage(result.error || "تعذر حفظ الفئة");
    if (!categories.includes(result.name || name))
      setCategories([...categories, result.name || name]);
    setDraft((current) => ({ ...current, category: result.name || name }));
    setNewCategory("");
    setMessage("تمت إضافة الفئة، اخترها الآن للصنف");
  };

  const saveItem = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = {
      name: draft.name.trim(),
      category: draft.category.trim(),
      price: Number(draft.price),
      emoji: "☕",
    };
    if (
      !payload.name ||
      !payload.category ||
      !Number.isFinite(payload.price) ||
      payload.price < 0
    )
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
    if (response.status === 401) {
      onSessionExpired();
      return setMessage("انتهت جلسة الأدمن، سجل الدخول مرة أخرى");
    }
    if (!response.ok) return setMessage("تعذر حفظ الصنف");
    const savedResponse = await response.json();
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
      category: categories[0] || "",
      price: "",
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
      <div className="mb-5 rounded-xl border border-[#e9e9e2] bg-[#fbfbf8] p-4">
        <div className="mb-3">
          <p className="text-sm font-bold text-[#173f3a]">الفئات المسجلة</p>
          <p className="mt-1 text-xs text-[#89918c]">
            أضف الفئة واحفظها هنا أولًا، ثم اخترها عند تسجيل الصنف.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            value={newCategory}
            onChange={(event) => setNewCategory(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void addCategory();
              }
            }}
            placeholder="مثال: مشروبات ساخنة"
            className="h-10 flex-1 rounded-lg border border-[#dedfd8] bg-white px-3 text-sm outline-none focus:border-[#173f3a]"
          />
          <button
            type="button"
            onClick={addCategory}
            className="h-10 rounded-lg bg-[#c48738] px-4 text-sm font-bold text-white"
          >
            حفظ الفئة
          </button>
        </div>
      </div>
      <form
        onSubmit={saveItem}
        className="mb-5 grid gap-2 rounded-xl bg-[#f6f6f1] p-3 sm:grid-cols-[1.5fr_1fr_100px_auto_auto]"
      >
        <input
          required
          value={draft.name}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          placeholder="اسم الصنف"
          className="h-10 rounded-lg border border-[#dedfd8] bg-white px-3 text-sm outline-none focus:border-[#173f3a]"
        />
        <select
          value={draft.category}
          onChange={(event) =>
            setDraft({ ...draft, category: event.target.value })
          }
          className="h-10 rounded-lg border border-[#dedfd8] bg-white px-3 text-sm outline-none focus:border-[#173f3a]"
        >
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
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
        <button
          disabled={!categories.length}
          className="h-10 rounded-lg bg-[#173f3a] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
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
      {!categories.length && (
        <p className="mb-3 rounded-lg bg-[#fff0d4] p-3 text-xs font-semibold text-[#a66c20]">
          أضف فئة أولًا حتى تتمكن من تسجيل صنف.
        </p>
      )}
      {!!categories.length && (
        <div className="mb-3 flex flex-wrap gap-2">
          {categories.map((category) => (
            <span
              key={category}
              className="flex items-center gap-1 rounded-lg bg-[#eef0ea] px-3 py-1.5 text-xs font-semibold text-[#56816c]"
            >
              {category}
              <button
                type="button"
                onClick={async () => {
                  const response = await fetch("/api/categories", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: category }),
                  });
                  if (!response.ok)
                    return setMessage("لا يمكن حذف فئة مرتبطة بصنف");
                  setCategories(
                    categories.filter((entry) => entry !== category),
                  );
                  if (draft.category === category)
                    setDraft({ ...draft, category: "" });
                }}
                aria-label={`حذف فئة ${category}`}
                className="text-[#a16a4a]"
              >
                <Trash2 size={12} />
              </button>
            </span>
          ))}
        </div>
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

function SettingsManager({
  settings,
  setSettings,
}: {
  settings: SiteSettings;
  setSettings: (settings: SiteSettings) => void;
}) {
  const [draft, setDraft] = useState(settings);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");

  const saveSettings = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData();
    Object.entries(draft).forEach(([key, value]) => {
      if (value !== undefined) formData.append(key, String(value));
    });
    if (logoFile) formData.append("logo", logoFile);
    const response = await fetch("/api/settings", {
      method: "PATCH",
      body: formData,
    });
    if (!response.ok)
      return setMessage("تعذر حفظ الإعدادات. تأكد من إعداد Supabase");
    const saved = await response.json();
    setSettings(saved);
    setDraft(saved);
    setLogoFile(null);
    setMessage("تم حفظ بيانات الصفحة");
  };

  return (
    <section className="max-w-3xl rounded-2xl border border-[#e0e1d9] bg-[#fffdf9] p-5">
      <div className="mb-6">
        <p className="text-sm font-semibold text-[#c48738]">ما يراه العميل</p>
        <h2 className="font-display text-2xl font-bold text-[#173f3a]">
          إعدادات الصفحة
        </h2>
        <p className="mt-1 text-sm text-[#72807a]">
          غيّر اسم المكان والهوية ووسائل التواصل الظاهرة في الواجهة.
        </p>
      </div>
      <form onSubmit={saveSettings} className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">
          اسم الصفحة
          <input
            required
            value={draft.name}
            onChange={(event) =>
              setDraft({ ...draft, name: event.target.value })
            }
            className="mt-2 h-11 w-full rounded-xl border border-[#dedfd8] px-3 font-normal outline-none focus:border-[#173f3a]"
          />
        </label>
        <label className="text-sm font-semibold">
          الوصف المختصر
          <input
            value={draft.tagline}
            onChange={(event) =>
              setDraft({ ...draft, tagline: event.target.value })
            }
            className="mt-2 h-11 w-full rounded-xl border border-[#dedfd8] px-3 font-normal outline-none focus:border-[#173f3a]"
          />
        </label>
        <label className="text-sm font-semibold">
          اسم الفرع
          <input
            value={draft.branch}
            onChange={(event) =>
              setDraft({ ...draft, branch: event.target.value })
            }
            className="mt-2 h-11 w-full rounded-xl border border-[#dedfd8] px-3 font-normal outline-none focus:border-[#173f3a]"
          />
        </label>
        <label className="text-sm font-semibold">
          رقم الهاتف الأساسي
          <input
            value={draft.phone}
            onChange={(event) =>
              setDraft({ ...draft, phone: event.target.value })
            }
            placeholder="01xxxxxxxxx"
            className="mt-2 h-11 w-full rounded-xl border border-[#dedfd8] px-3 font-normal outline-none focus:border-[#173f3a]"
          />
        </label>
        <label className="text-sm font-semibold">
          رقم هاتف إضافي
          <input
            value={draft.secondary_phone}
            onChange={(event) =>
              setDraft({ ...draft, secondary_phone: event.target.value })
            }
            placeholder="01xxxxxxxxx"
            className="mt-2 h-11 w-full rounded-xl border border-[#dedfd8] px-3 font-normal outline-none focus:border-[#173f3a]"
          />
        </label>
        <label className="text-sm font-semibold">
          اللوجو
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => {
              const file = event.target.files?.[0] || null;
              setLogoFile(file);
              if (file)
                setDraft({ ...draft, logo_url: URL.createObjectURL(file) });
            }}
            className="mt-2 block w-full rounded-xl border border-dashed border-[#c8cec7] bg-[#f6f6f1] p-2 text-xs font-normal"
          />
        </label>
        {draft.logo_url && (
          <div className="flex items-center gap-3 text-sm text-[#72807a] sm:col-span-2">
            <span
              className="size-16 rounded-xl bg-cover bg-center"
              style={{ backgroundImage: `url(${draft.logo_url})` }}
            />{" "}
            معاينة اللوجو
          </div>
        )}
        <button className="h-12 rounded-xl bg-[#173f3a] font-bold text-white sm:col-span-2">
          حفظ إعدادات الصفحة
        </button>
      </form>
      {message && (
        <p className="mt-4 text-center text-sm font-semibold text-[#56816c]">
          {message}
        </p>
      )}
    </section>
  );
}
