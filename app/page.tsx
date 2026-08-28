"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Check,
  Coffee,
  Download,
  Grid2X2,
  LockKeyhole,
  LogOut,
  Minus,
  Plus,
  Printer,
  Radio,
  Search,
  ShoppingBag,
  Smartphone,
  Trash2,
  List,
} from "lucide-react";

type Item = {
  id: number;
  name: string;
  category: string;
  price: number;
  price_mode?: "fixed" | "market" | "exchange" | "free" | "discount";
  discount_percent?: number;
  emoji: string;
  color: string;
  image_url?: string;
};
type Order = {
  id: string;
  phone: string;
  governorate: string;
  district?: string;
  items: string;
  total: number;
  status: OrderStatus;
  created_at: string;
  status_changed_at?: string;
  staff_name?: string;
  admin_reverted?: boolean;
  order_items?: {
    id: number;
    name: string;
    quantity: number;
    category?: string;
  }[];
};
type OrderStatus = "قيد التنفيذ" | "تم" | "لم يرد" | "غير متاح" | "طلب مرفوض";
type UserRole = "admin" | "staff";
type Employee = { id: number; name: string; active: boolean; created_at: string };
const orderStatuses: OrderStatus[] = [
  "قيد التنفيذ",
  "تم",
  "لم يرد",
  "غير متاح",
  "طلب مرفوض",
];
type RewardRate = {
  milestone_count: number;
  milestone_reward: number;
  effective_from: string;
};
type SiteSettings = {
  id?: number;
  name: string;
  tagline: string;
  branch: string;
  phone: string;
  secondary_phone: string;
  marketing_url: string;
  logo_url?: string;
  staff_name: string;
  milestone_count: number;
  milestone_reward: number;
  reward_rate_history?: RewardRate[];
};

const defaultSettings: SiteSettings = {
  name: "الفيوم للأعلاف والدواجن",
  tagline: "نظام الحجوزات",
  branch: "الفرع الرئيسي",
  phone: "",
  secondary_phone: "",
  marketing_url: "",
  staff_name: "",
  milestone_count: 1,
  milestone_reward: 1,
};
const defaultCategories: string[] = [];
const QURAN_RADIO_URL = "https://qurango.net/radio/mix";

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

function formatRelativeTime(value: string | undefined, now: number) {
  if (!value) return "";
  const elapsed = Math.max(0, now - new Date(value).getTime());
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return "تم التغيير الآن";
  if (minutes < 60) return `تم التغيير منذ ${minutes} ${minutes === 1 ? "دقيقة" : "دقائق"}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `تم التغيير منذ ${hours} ${hours === 1 ? "ساعة" : "ساعات"}`;
  const days = Math.floor(hours / 24);
  return `تم التغيير منذ ${days} ${days === 1 ? "يوم" : "أيام"}`;
}

function getItemUnitPrice(item: Item) {
  if (item.price_mode === "market" || item.price_mode === "exchange" || item.price_mode === "free") return 0;
  if (item.price_mode === "discount") return item.price * (1 - (item.discount_percent || 0) / 100);
  return item.price;
}

function normalizePhone(value: string) {
  return value.replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function isValidMobilePhone(value: string) {
  return /^(010|011|012|015)\d{8}$/.test(normalizePhone(value));
}

function computeViolationWindows(orders: Order[]) {
  const violations = orders
    .filter((order) => order.admin_reverted)
    .sort(
      (a, b) =>
        new Date(a.status_changed_at || a.created_at).getTime() -
        new Date(b.status_changed_at || b.created_at).getTime(),
    );
  const windows: { start: Date; end: Date }[] = [];
  violations.forEach((order, index) => {
    if ((index + 1) % 3 === 0) {
      const start = new Date(order.status_changed_at || order.created_at);
      windows.push({ start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) });
    }
  });
  return windows;
}

function isWithinPenalty(date: Date, windows: { start: Date; end: Date }[]) {
  return windows.some((window) => date >= window.start && date <= window.end);
}

export default function Home() {
  const [view, setView] = useState<"cashier" | "admin">("cashier");
  const [phone, setPhone] = useState("");
  const [governorate, setGovernorate] = useState("الفيوم");
  const [district, setDistrict] = useState("");
  const [query, setQuery] = useState("");
  const [showItemSearch, setShowItemSearch] = useState(false);
  const [orderSearch, setOrderSearch] = useState("");
  const [category, setCategory] = useState("الكل");
  const [itemDisplayMode, setItemDisplayMode] = useState<"cards" | "list">("list");
  const [cart, setCart] = useState<Record<number, number>>({});
  const [orders, setOrders] = useState<Order[]>([]);
  const [notice, setNotice] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [loginRole, setLoginRole] = useState<UserRole>("admin");
  const [staffNameInput, setStaffNameInput] = useState("");
  const [staffName, setStaffName] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [menuItems, setMenuItems] = useState<Item[]>([]);
  const [adminTab, setAdminTab] = useState<"orders" | "menu" | "settings" | "employees" | "marketing" | "targets">(
    "orders",
  );
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [printEmployeeName, setPrintEmployeeName] = useState<string | null>(null);
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [visitorCount, setVisitorCount] = useState<number | null>(null);
  const [categoryOptions, setCategoryOptions] = useState(defaultCategories);
  const [todayOrdersCount, setTodayOrdersCount] = useState(0);
  const [orderCategory, setOrderCategory] = useState("الكل");
  const [orderItem, setOrderItem] = useState("الكل");
  const [orderPeriod, setOrderPeriod] = useState("all");
  const [orderStatus, setOrderStatus] = useState("الكل");
  const [currentTime, setCurrentTime] = useState(0);
  const cartRef = useRef<HTMLElement>(null);
  const radioRef = useRef<HTMLAudioElement>(null);
  const visitorTrackedRef = useRef(false);
  const [radioPlaying, setRadioPlaying] = useState(false);
  const [radioError, setRadioError] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstall, setShowIOSInstall] = useState(false);
  const [pendingDeleteOrder, setPendingDeleteOrder] = useState<string | null>(null);
  const [milestoneMessage, setMilestoneMessage] = useState("");
  const [pendingStatusConfirm, setPendingStatusConfirm] = useState<{ id: string; status: OrderStatus } | null>(null);
  const [penaltyMessage, setPenaltyMessage] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem("rashefa_staff_name");
    if (saved) {
      setStaffName(saved);
      setStaffNameInput(saved);
    }
  }, []);

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
    (sum, entry) =>
      sum + getItemUnitPrice(entry.item) * entry.quantity,
    0,
  );
  const hasVariablePrice = cartItems.some(
    ({ item }) => item.price_mode === "market" || item.price_mode === "exchange",
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
    const search = orderSearch.trim().toLowerCase();
    if (
      search &&
      ![order.id, order.phone, order.governorate, order.district]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search))
    )
      return false;
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
    if (!milestoneMessage) return;
    const timeout = window.setTimeout(() => setMilestoneMessage(""), 8000);
    return () => window.clearTimeout(timeout);
  }, [milestoneMessage]);

  useEffect(() => {
    if (userRole !== "staff" || !staffName) return setPenaltyMessage("");
    const windows = computeViolationWindows(orders.filter((order) => order.staff_name?.trim() === staffName));
    const now = new Date();
    const active = windows.find((window) => now >= window.start && now <= window.end);
    setPenaltyMessage(
      active
        ? `⚠️ لقد قمت بتغيير الحالة إلى "تم" لطلبات لم تُستلم من قبل العميل، لذا تم إيقافك عن تحقيق ربح التارجيت لمدة 24 ساعة حتى ${active.end.toLocaleString("ar-EG")}. يمكنك تغيير الحالة بشكل طبيعي لكن لن تُحتسب لك ضمن التارجيت خلال هذه المدة.`
        : "",
    );
  }, [orders, userRole, staffName]);


  useEffect(() => {
    const initialClock = window.setTimeout(() => setCurrentTime(Date.now()), 0);
    const clock = window.setInterval(() => setCurrentTime(Date.now()), 60000);
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    window.setTimeout(() => setIsIOS(ios), 0);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    const handleInstallPrompt = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPromptEvent); };
    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    return () => { window.clearTimeout(initialClock); window.clearInterval(clock); window.removeEventListener("beforeinstallprompt", handleInstallPrompt); };
  }, []);

  useEffect(() => {
    if (visitorTrackedRef.current) return;
    visitorTrackedRef.current = true;
    fetch("/api/visitors", { method: "POST" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (typeof data?.count === "number") setVisitorCount(data.count);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    fetch("/api/admin/session")
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        setAdminAuthenticated(Boolean(data?.authenticated));
        if (data?.authenticated) {
          setUserRole(data?.role || "admin");
          if (data?.staffName) {
            setStaffName(data.staffName);
            setStaffNameInput(data.staffName);
          }
          const ordersResponse = await fetch("/api/admin/orders");
          if (ordersResponse.ok) {
            const ordersData = await ordersResponse.json();
            if (Array.isArray(ordersData)) setOrders(ordersData);
          }
          if (data.role === "admin") {
            const employeesResponse = await fetch("/api/admin/employees");
            if (employeesResponse.ok) setEmployees(await employeesResponse.json());
          }
        }
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
    fetch("/api/settings")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) {
          setSettings({ ...defaultSettings, ...data });
          if (data.staff_name) setStaffNameInput(data.staff_name);
        }
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
  const setQuantity = (id: number, value: string) => {
    const quantity = Number(value);
    setCart((current) => ({
      ...current,
      [id]: Number.isFinite(quantity) ? Math.max(0, Math.floor(quantity)) : 0,
    }));
  };
  const submitOrder = async () => {
    const normalizedPhone = normalizePhone(phone).replace(/\D/g, "");
    if (!isValidMobilePhone(normalizedPhone)) return setNotice("اكتب رقم هاتف محمول صحيح من 11 رقمًا ويبدأ بـ 010 أو 011 أو 012 أو 015");
    if (governorate === "الفيوم" && !district)
      return setNotice("اختر المركز التابع لمحافظة الفيوم");
    if (governorate === "أخرى" && !district.trim())
      return setNotice("اكتب اسم محافظتك أولاً");
    if (!cartItems.length) return setNotice("أضف صنفاً واحداً على الأقل للسلة");
    const orderItems = cartItems
      .map(({ item, quantity }) => `${item.name} × ${quantity}`)
      .join("، ");
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: normalizedPhone,
        governorate: governorate === "أخرى" ? district.trim() : governorate,
        district: governorate === "الفيوم" ? district : null,
        items: cartItems.map(({ item, quantity }) => ({
          id: item.id,
          name: item.name,
          category: item.category,
          quantity,
          price: item.price,
          final_price: getItemUnitPrice(item),
        })),
        total,
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return setNotice(result.error || "تعذر حفظ الطلب، راجع اتصال Supabase");
    setOrders((current) => [
      {
        id: `#${1043 + current.length}`,
        phone: normalizedPhone,
        governorate,
        district,
        items: orderItems,
        total,
        status: "قيد التنفيذ",
        created_at: new Date().toISOString(),
        status_changed_at: new Date().toISOString(),
      },
      ...current,
    ]);
    setCart({});
    setPhone("");
    setGovernorate("الفيوم");
    setDistrict("");
    setTodayOrdersCount((count) => count + 1);
    setNotice("");
    setBookingSuccess(true);
  };

  const updateOrderStatus = async (id: string, status: OrderStatus) => {
    const target = orders.find((order) => order.id === id);
    const numericId = Number(id.replace("#", ""));
    const response = await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: numericId,
        status,
        staff_name: userRole === "staff" && status === "تم" ? staffName : undefined,
        previous_status: target?.status,
      }),
    });
    if (!response.ok) return;
    const changedAt = new Date().toISOString();
    setOrders((current) =>
      current.map((order) =>
        order.id === id
          ? {
              ...order,
              status,
              status_changed_at: changedAt,
              staff_name:
                userRole === "staff" && status === "تم" && staffName ? staffName : order.staff_name,
              admin_reverted:
                userRole === "staff" && status === "تم"
                  ? false
                  : userRole === "admin" && target?.status === "تم" && status !== "تم"
                    ? true
                    : order.admin_reverted,
            }
          : order,
      ),
    );
    if (status === "تم" && target?.status !== "تم" && userRole === "staff" && staffName) {
      const interval = Math.max(1, settings.milestone_count || 1);
      const reward = settings.milestone_reward || 0;
      const rateEffectiveFrom = settings.reward_rate_history?.length
        ? settings.reward_rate_history[settings.reward_rate_history.length - 1].effective_from
        : undefined;
      const completedCount =
        orders.filter(
          (order) =>
            order.status === "تم" &&
            order.staff_name === staffName &&
            (!rateEffectiveFrom ||
              new Date(order.status_changed_at || order.created_at).getTime() >=
                new Date(rateEffectiveFrom).getTime()),
        ).length + 1;
      if (completedCount % interval === 0) {
        setMilestoneMessage(`🎉 مبروك! حققت ${completedCount} حالة "تم" وحصلت على ${reward} جنيه تشجيع من الإدارة`);
      }
    }
  };

  const handleStatusSelect = (id: string, status: OrderStatus, currentStatus: OrderStatus) => {
    if (currentStatus === "تم" && userRole === "staff") return;
    if (userRole === "staff" && status === "تم" && currentStatus !== "تم") {
      setPendingStatusConfirm({ id, status });
      return;

    }
    void updateOrderStatus(id, status);
  };

  const confirmStatusChange = () => {
    if (!pendingStatusConfirm) return;
    void updateOrderStatus(pendingStatusConfirm.id, pendingStatusConfirm.status);
    setPendingStatusConfirm(null);
  };

  const deleteOrder = async (id: string) => {
    const response = await fetch("/api/admin/orders", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: Number(id.replace("#", "")) }),
    });
    if (!response.ok) {
      setAdminError("تعذر حذف الطلب");
      return;
    }
    setOrders((current) => current.filter((order) => order.id !== id));
    setPendingDeleteOrder(null);
  };

  const printOrders = () => window.print();

  const printEmployeeTarget = (name: string) => {
    setPrintEmployeeName(name);
    window.setTimeout(() => {
      window.print();
      window.setTimeout(() => setPrintEmployeeName(null), 100);
    }, 0);
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
    if ((result.role || loginRole) === "staff") {
      const name = result.staffName || "";
      if (!name) return setAdminError("هذا الموظف غير موجود");
      setStaffName(name);
    }
  };

  const logoutAdmin = async () => {
    await fetch("/api/admin/session", { method: "DELETE" });
    setAdminAuthenticated(false);
    setUserRole(null);
    setAdminTab("orders");
    setView("cashier");
  };

  return (
    <main className="min-h-screen max-w-full overflow-x-clip bg-[#f7f6f2] text-[#202a27]" dir="rtl">
      <header className="border-b border-[#dedfd8] bg-[#fbfaf7]">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-2 px-3 py-3 sm:px-5 sm:py-4 lg:px-10">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#173f3a] text-[#f4c95d] sm:size-10">
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
            <div className="min-w-0">
              <p className="truncate font-display text-base font-bold tracking-tight sm:text-lg">
                {settings.name}
              </p>
              <p className="truncate text-[10px] text-[#72807a] sm:text-[11px]">
                {settings.tagline}
                {visitorCount !== null && ` | ${visitorCount} زائر`}
              </p>
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
            className={`grid size-10 shrink-0 place-items-center rounded-xl border sm:size-12 ${radioPlaying ? "border-[#c48738] bg-[#fff0d4] text-[#a66c20]" : "border-[#e2e1d8] bg-[#fffdf8] text-[#173f3a]"}`}
            aria-label={radioPlaying ? "إيقاف إذاعة القرآن الكريم" : "تشغيل إذاعة القرآن الكريم"}
            title="إذاعة القرآن الكريم من مصر"
          >
            <Radio size={19} />
          </button>
          {(installPrompt || isIOS) && <button onClick={isIOS ? installOnIOS : installApp} className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#c48738] text-white sm:size-12" aria-label="تثبيت التطبيق" title="تثبيت التطبيق"><Download size={18} /></button>}
        </div>
      </header>
      <div className="sticky top-0 z-30 border-b border-[#dedfd8] bg-[#fbfaf7] px-3 py-2.5 lg:hidden">
        <div className="mx-auto grid max-w-[1440px] grid-cols-3 items-center gap-1.5 sm:gap-2">
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
          <div className="flex h-12 items-center justify-center gap-1 rounded-xl border border-[#e2e1d8] bg-[#fffdf8] px-1 sm:h-14 sm:px-2">
              <p className="text-[10px] text-[#89918c]">طلبات اليوم</p>
              <p className="font-display text-base font-bold text-[#173f3a] sm:text-lg">
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
              className="relative grid h-12 w-full place-items-center rounded-xl bg-[#173f3a] text-white sm:h-14"
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
      {pendingDeleteOrder && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[#173f3a66] px-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-order-title"
          onClick={() => setPendingDeleteOrder(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-[#e0e1d9] bg-[#fffdf9] p-6 text-right shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="delete-order-title" className="font-display text-xl font-bold text-[#173f3a]">
              حذف الطلب
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#72807a]">
              هل تريد حذف هذا الطلب نهائيًا؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setPendingDeleteOrder(null)}
                className="h-11 flex-1 rounded-xl border border-[#dedfd8] bg-white text-sm font-bold text-[#72807a]"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => void deleteOrder(pendingDeleteOrder)}
                className="h-11 flex-1 rounded-xl bg-[#a9584d] text-sm font-bold text-white"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}
      {pendingStatusConfirm && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[#173f3a66] px-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-status-title"
          onClick={() => setPendingStatusConfirm(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-[#e0e1d9] bg-[#fffdf9] p-6 text-right shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="confirm-status-title" className="font-display text-xl font-bold text-[#173f3a]">
              تأكيد تسليم الطلب
            </h2>
            <p className="mt-3 rounded-xl bg-[#fff0d4] p-3 text-sm font-bold leading-6 text-[#a66c20]">
              ⚠️ تنبيه: إذا لم يكن العميل قد استلم طلبه فعليًا سيتم خصم 50% من قيمة التارجيت الخاص بك. تأكد من استلام العميل عبر الاتصال به أولًا إذا لم تكن متأكدًا قبل التأكيد.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setPendingStatusConfirm(null)}
                className="h-11 flex-1 rounded-xl border border-[#dedfd8] bg-white text-sm font-bold text-[#72807a]"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={confirmStatusChange}
                className="h-11 flex-1 rounded-xl bg-[#173f3a] text-sm font-bold text-white"
              >
                تأكيد، العميل استلم الطلب
              </button>
            </div>
          </div>
        </div>
      )}
      {bookingSuccess && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[#173f3a99] px-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="booking-success-title"
          onClick={() => setBookingSuccess(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-[#f0d9a7] bg-[#fffdf8] p-1 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="rounded-[1.35rem] bg-gradient-to-b from-[#fff8e8] to-white px-6 py-8 text-center sm:px-9">
              <div className="mx-auto grid size-16 place-items-center rounded-full bg-[#e4eee5] text-[#39704f]">
                <Check size={32} strokeWidth={2.5} />
              </div>
              <h2 id="booking-success-title" className="mt-4 font-display text-2xl font-extrabold text-[#173f3a]">
                تم تسجيل الحجز بنجاح
              </h2>
              <p className="mt-3 text-base font-bold leading-8 text-[#56816c]">
                سوف نتواصل معك في أسرع وقت.
              </p>
              <p className="mt-1 text-sm leading-7 text-[#72807a]">
                في حالة عدم الاتصال بك خلال يومين عمل، كلمنا هنا:
              </p>
              <div className="mt-4 space-y-2 text-sm font-bold">
                <a href="tel:0842064130" className="block rounded-xl bg-[#f6f6f1] px-4 py-3 text-[#173f3a]">
                  اتصال: 0842064130
                </a>
                <a href="https://wa.me/201013000281" target="_blank" rel="noreferrer" className="block rounded-xl bg-[#e4eee5] px-4 py-3 text-[#39704f]">
                  اتصال أو واتساب: 01013000281
                </a>
                <a href="tel:01013000836" className="block rounded-xl bg-[#fff0d4] px-4 py-3 text-[#a66c20]">
                  للجملة: 01013000836
                </a>
              </div>
              <div className="mt-6 flex gap-2">
                <button
                  type="button"
                  onClick={() => setBookingSuccess(false)}
                  className="h-11 flex-1 rounded-xl bg-[#173f3a] text-sm font-bold text-white transition hover:bg-[#25534d]"
                >
                  حسنًا
                </button>
                {settings.marketing_url && (
                  <a
                    href={settings.marketing_url}
                    target={/^https?:\/\//i.test(settings.marketing_url) ? "_blank" : undefined}
                    rel={/^https?:\/\//i.test(settings.marketing_url) ? "noreferrer" : undefined}
                    className="flex h-11 flex-1 items-center justify-center rounded-xl bg-[#c48738] text-sm font-bold text-white transition hover:bg-[#ad722c]"
                  >
                    تابع الجديد
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {userRole === "staff" && milestoneMessage && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[#173f3a80] px-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="milestone-title"
          onClick={() => setMilestoneMessage("")}
        >
          <div
            className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-gradient-to-br from-[#ffe6a7] via-[#ffd7e8] to-[#c9f2dd] p-1 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="rounded-[1.35rem] bg-white/90 px-6 py-8 text-center">
              <p className="text-5xl">🎉🏆🎊</p>
              <h2 id="milestone-title" className="mt-3 font-display text-2xl font-extrabold text-[#173f3a]">
                مبروك!
              </h2>
              <p className="mt-3 text-base font-bold leading-7 text-[#56816c]">{milestoneMessage}</p>
              <button
                type="button"
                onClick={() => setMilestoneMessage("")}
                className="mt-6 h-11 w-full rounded-xl bg-[#173f3a] text-sm font-bold text-white"
              >
                رائع، شكرًا
              </button>
            </div>
          </div>
        </div>
      )}
      {userRole === "staff" && penaltyMessage && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[#4a1d1d80] px-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="penalty-title"
          onClick={() => setPenaltyMessage("")}
        >
          <div
            className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-gradient-to-br from-[#ffd9d0] via-[#ffe8c9] to-[#ffd0d0] p-1 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="rounded-[1.35rem] bg-white/90 px-6 py-8 text-center">
              <p className="text-5xl">⚠️</p>
              <h2 id="penalty-title" className="mt-3 font-display text-2xl font-extrabold text-[#a9584d]">
                تنبيه تأديبي
              </h2>
              <p className="mt-3 text-base font-bold leading-7 text-[#a9584d]">{penaltyMessage}</p>
              <button
                type="button"
                onClick={() => setPenaltyMessage("")}
                className="mt-6 h-11 w-full rounded-xl bg-[#a9584d] text-sm font-bold text-white"
              >
                فهمت
              </button>
            </div>
          </div>
        </div>
      )}
      {radioError && <button onClick={toggleRadio} className="fixed bottom-4 left-4 z-40 rounded-xl bg-[#fff0d4] px-3 py-2 text-xs font-bold text-[#a66c20] shadow-lg">تعذر تشغيل الإذاعة، اضغط للمحاولة</button>}
      {userRole === "admin" && adminTab === "orders" && (
        <section className="print-sheet" dir="rtl">
          <div className="print-sheet-header">
            <div>
              <h1>{settings.name}</h1>
              <p>تقرير الطلبات</p>
            </div>
            <div className="print-sheet-meta">
              <span>عدد الطلبات: {filteredOrders.length}</span>
              <span>{new Date().toLocaleString("ar-EG")}</span>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th className="print-col-70-less">الطلب</th>
                <th>الأصناف</th>
                <th className="print-col-half">الحالة</th>
                <th className="print-col-half">الإجمالي</th>
                <th className="print-col-quarter-less">الموقع</th>
                <th className="print-col-quarter-less">الهاتف</th>
                <th className="print-col-quarter-less">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={`print-${order.id}`}>
                  <td className="print-number print-col-70-less">{order.id}</td>
                  <td>{order.items}</td>
                  <td className="print-col-half">{order.status}</td>
                  <td className="print-number print-col-half">{order.total} جنيه</td>
                  <td className="print-col-quarter-less">{order.governorate}{order.district ? ` - ${order.district}` : ""}</td>
                  <td className="print-number print-col-quarter-less">{order.phone}</td>
                  <td className="print-col-quarter-less">{formatOrderDate(order.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      {userRole === "admin" && printEmployeeName && (
        <EmployeeTargetPrint
          name={printEmployeeName}
          orders={orders.filter((order) => order.staff_name?.trim() === printEmployeeName)}
          settings={settings}
        />
      )}
      {view === "cashier" ? (
        <div className="mx-auto grid w-full min-w-0 max-w-[1440px] gap-5 overflow-x-hidden px-3 py-5 sm:gap-8 sm:px-5 sm:py-8 lg:grid-cols-[1fr_380px] lg:px-10">
          <section className="min-w-0 max-w-full overflow-x-hidden">
            <div className="mb-6 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                {showItemSearch ? (
                  <div className="relative min-w-0 flex-1">
                    <Search
                      className="absolute right-4 top-3.5 text-[#9ca49d]"
                      size={18}
                    />
                    <input
                      autoFocus
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="ابحث عن صنف..."
                      className="h-12 w-full rounded-xl border border-[#dedfd8] bg-white pr-11 pl-4 text-sm outline-none transition focus:border-[#173f3a]"
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowItemSearch(true)}
                    aria-label="فتح البحث عن صنف"
                    title="بحث عن صنف"
                    className="grid size-12 shrink-0 place-items-center rounded-xl border border-[#dedfd8] bg-white text-[#72807a] transition hover:border-[#173f3a] hover:text-[#173f3a]"
                  >
                    <Search size={19} />
                  </button>
                )}
                <div className="flex shrink-0 items-center rounded-xl border border-[#dedfd8] bg-white p-1">
                  <button
                    type="button"
                    onClick={() => setItemDisplayMode("cards")}
                    aria-label="عرض الأصناف كبطاقات"
                    title="عرض البطاقات"
                    className={`grid size-9 place-items-center rounded-lg transition ${itemDisplayMode === "cards" ? "bg-[#173f3a] text-white" : "text-[#72807a] hover:bg-[#f1f3ed]"}`}
                  >
                    <Grid2X2 size={17} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemDisplayMode("list")}
                    aria-label="عرض الأصناف كقائمة"
                    title="عرض القائمة"
                    className={`grid size-9 place-items-center rounded-lg transition ${itemDisplayMode === "list" ? "bg-[#173f3a] text-white" : "text-[#72807a] hover:bg-[#f1f3ed]"}`}
                  >
                    <List size={18} />
                  </button>
                </div>
              </div>
              <div className="sticky top-[78px] z-20 min-w-0 w-full max-w-full border-b border-[#dedfd8] bg-[#f7f6f2] py-2 shadow-sm overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:thin] [touch-action:pan-x] sm:top-[84px] lg:top-0">
                <div className="flex w-max min-w-full flex-nowrap gap-2">
                {categories.map((entry) => (
                  <button
                    key={entry}
                    onClick={() => setCategory(entry)}
                    className={`flex min-h-11 w-[92px] shrink-0 items-center justify-center whitespace-nowrap rounded-xl px-3 text-sm font-semibold ${category === entry ? "bg-[#173f3a] text-white" : "border border-[#dedfd8] bg-white text-[#72807a]"}`}
                  >
                    {entry}
                  </button>
                ))}
                </div>
              </div>
            </div>
            <div className={`${itemDisplayMode === "cards" ? "grid min-w-0 grid-cols-1 gap-3 min-[400px]:grid-cols-2 min-[400px]:gap-4 md:grid-cols-3" : "grid min-w-0 gap-3"} pr-1`}>
              {filteredItems.map((item) => (
                <article
                  key={item.id}
                  onClick={() => updateQuantity(item.id, 1)}
                  className={`group relative min-w-0 max-w-full overflow-hidden rounded-2xl border bg-[#fffdf9] transition hover:shadow-lg hover:shadow-[#173f3a0d] ${itemDisplayMode === "cards" ? "p-3 hover:-translate-y-1" : "flex items-center gap-3 p-3"} ${cart[item.id] ? "border-[#56816c] ring-2 ring-[#56816c26]" : "border-[#e4e3da]"}`}
                >
                  <div
                    role="img"
                    aria-label={item.name}
                    className={`grid place-items-center rounded-xl ${item.color} bg-cover bg-center text-5xl transition group-hover:scale-[1.02] ${itemDisplayMode === "cards" ? "aspect-[1.3] text-6xl" : "size-20 shrink-0"}`}
                    style={
                      item.image_url
                        ? { backgroundImage: `url(${item.image_url})` }
                        : undefined
                    }
                  >
                    {!item.image_url && item.emoji}
                  </div>
                  <div className={itemDisplayMode === "cards" ? "min-w-0 px-1 pt-3" : "min-w-0 flex-1 px-1 py-1"}>
                    <h2 className="text-base font-bold leading-none text-[#173f3a] sm:text-lg">{item.name}</h2>
                    <div className={`mt-0 min-w-0 max-w-full flex flex-col gap-0 ${itemDisplayMode === "cards" ? "items-center" : "items-start"}`}>
                      <button
                        onClick={(event) => { event.stopPropagation(); updateQuantity(item.id, 1); }}
                        aria-label={`إضافة ${item.name} للسلة`}
                        className={`grid size-9 shrink-0 place-items-center rounded-full bg-[#173f3a] text-white shadow-sm transition hover:bg-[#285951] ${itemDisplayMode === "list" ? "self-end" : ""}`}
                      >
                        <Plus size={17} strokeWidth={2.5} />
                      </button>
                      <p className="max-w-full truncate text-left font-display text-lg font-extrabold leading-none text-[#c48738]">
                        {item.price_mode === "market"
                          ? "سوق"
                          : item.price_mode === "exchange"
                            ? "بورصة"
                            : item.price_mode === "free"
                              ? "مجاني 100%"
                              : <>{item.price_mode === "discount" && <span className="ml-2 text-sm text-[#56816c]">خصم {item.discount_percent}%</span>}{getItemUnitPrice(item)}<span className="mr-1 text-xs font-bold text-[#8b948e]">جنيه</span></>}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
          <aside
            ref={cartRef}
            className="h-fit w-full min-w-0 max-w-full overflow-x-clip rounded-2xl border border-[#e0e1d9] bg-[#fffdf9] p-5 shadow-[0_12px_40px_#173f3a08] lg:sticky lg:top-6"
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
                    className="flex min-w-0 max-w-full items-center gap-3 overflow-hidden rounded-xl bg-[#f6f6f1] p-3"
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
                      <p className="text-sm font-bold text-[#c48738]">
                        {item.price_mode === "market"
                          ? "سوق"
                          : item.price_mode === "exchange"
                            ? "بورصة"
                            : item.price_mode === "free"
                              ? "مجاني 100%"
                              : item.price_mode === "discount"
                                ? <>
                                    <span className="ml-2 text-xs font-semibold text-[#89918c] line-through">
                                      {item.price * quantity} جنيه
                                    </span>
                                    <span>{getItemUnitPrice(item) * quantity} جنيه</span>
                                    <small className="mr-1 text-xs font-bold text-[#56816c]">
                                      خصم {item.discount_percent}%
                                    </small>
                                  </>
                                : `${getItemUnitPrice(item) * quantity} جنيه`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="grid size-7 shrink-0 place-items-center rounded-md bg-white text-[#718079]"
                      >
                        <Minus size={13} />
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={quantity}
                        onChange={(event) => setQuantity(item.id, event.target.value)}
                        aria-label={`كمية ${item.name}`}
                        className="h-8 w-20 shrink-0 rounded-md border border-[#dedfd8] bg-white px-2 text-center text-base font-bold tabular-nums outline-none focus:border-[#173f3a]"
                      />
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="grid size-7 shrink-0 place-items-center rounded-md bg-[#173f3a] text-white"
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
                <strong className="font-display text-xl text-[#173f3a]">
                  {hasVariablePrice ? "طلب حجز" : <>{total} <small className="text-xs font-normal">جنيه</small></>}
                </strong>
                {hasVariablePrice && <small className="mt-1 block text-xs font-semibold text-[#a66c20]">لا يوجد سعر محدد</small>}
              </div>
            </div>
            <div className="relative mb-3">
              <Smartphone
                className="absolute right-3 top-3 text-[#a2aaa3]"
                size={16}
              />
              <input
                value={phone}
                onChange={(event) => setPhone(normalizePhone(event.target.value).replace(/\D/g, "").slice(0, 11))}
                placeholder="رقم الهاتف للحجز"
                type="tel"
                inputMode="numeric"
                maxLength={11}
                className="h-11 w-full rounded-xl border border-[#dedfd8] bg-white pr-10 pl-3 text-sm outline-none focus:border-[#173f3a]"
              />
            </div>
            <select
              value={governorate}
              onChange={(event) => {
                setGovernorate(event.target.value);
                setDistrict("");
              }}
              className="select-with-arrow mb-3 h-11 w-full rounded-xl border border-[#dedfd8] bg-white px-3 text-sm outline-none focus:border-[#173f3a]"
            >
              <option value="الفيوم">الفيوم</option>
              <option value="أخرى">محافظة أخرى</option>
            </select>
            {governorate === "الفيوم" ? (
              <select
                value={district}
                onChange={(event) => setDistrict(event.target.value)}
                className="select-with-arrow mb-3 h-11 w-full rounded-xl border border-[#dedfd8] bg-white px-3 text-sm outline-none focus:border-[#173f3a]"
              >
                <option value="">اختر المركز</option>
                <option value="الفيوم">الفيوم</option>
                <option value="إبشواي">إبشواي</option>
                <option value="إطسا">إطسا</option>
                <option value="سنورس">سنورس</option>
                <option value="طامية">طامية</option>
                <option value="يوسف الصديق">يوسف الصديق</option>
              </select>
            ) : (
              <input
                value={district}
                onChange={(event) => setDistrict(event.target.value)}
                placeholder="اكتب اسم محافظتك"
                className="mb-3 h-11 w-full rounded-xl border border-[#dedfd8] bg-white px-3 text-sm outline-none focus:border-[#173f3a]"
              />
            )}
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
        <section className="mx-auto max-w-[1440px] px-3 py-5 sm:px-5 sm:py-8 lg:px-10">
          <div className="mb-6 flex flex-col gap-5 sm:mb-8 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <div>
              <p className="mb-2 text-sm font-semibold text-[#c48738]">
                لوحة المتابعة
              </p>
              <h1 className="font-display text-3xl font-bold tracking-tight text-[#173f3a] sm:text-4xl">
                الطلبات اليوم
              </h1>
              {userRole === "staff" && staffName && (
                <p className="mt-2 text-sm font-bold text-[#56816c]">الموظف: {staffName}</p>
              )}
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:items-end">
              <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                {orderStatuses.map((status) => (
                  <div
                    key={status}
                    className={`rounded-xl px-2 py-2 text-center text-xs font-semibold sm:px-3 ${status === "قيد التنفيذ" ? "bg-[#fff0d4] text-[#a66c20]" : status === "تم" ? "bg-[#e4eee5] text-[#39704f]" : "bg-[#f0ece8] text-[#7d6559]"}`}
                  >
                    <span className="ml-1 text-base font-extrabold tabular-nums">{statusCounts[status]}</span>{" "}
                    {status}
                  </div>
                ))}
              </div>
              <button
                onClick={logoutAdmin}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#dedfd8] bg-white px-4 py-3 text-sm font-semibold text-[#72807a] sm:w-fit"
              >
                <LogOut size={16} /> خروج
              </button>
            </div>
          </div>
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <nav className="flex w-fit rounded-xl bg-[#eef0ea] p-1 text-sm font-semibold">
              <button
                onClick={() => setAdminTab("orders")}
                className={`rounded-lg px-5 py-2.5 transition ${adminTab === "orders" ? "bg-white text-[#173f3a] shadow-sm" : "text-[#72807a]"}`}
              >
                الطلبات
              </button>
              {userRole === "staff" && (
                <button
                  onClick={() => setAdminTab("targets")}
                  className={`rounded-lg px-5 py-2.5 transition ${adminTab === "targets" ? "bg-white text-[#173f3a] shadow-sm" : "text-[#72807a]"}`}
                >
                  التارجيت
                </button>
              )}
              {userRole === "admin" && (
                <>
                  <button
                    onClick={() => setAdminTab("targets")}
                    className={`rounded-lg px-5 py-2.5 transition ${adminTab === "targets" ? "bg-white text-[#173f3a] shadow-sm" : "text-[#72807a]"}`}
                  >
                    التارجيت
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
                  <button
                    onClick={() => setAdminTab("employees")}
                    className={`rounded-lg px-5 py-2.5 transition ${adminTab === "employees" ? "bg-white text-[#173f3a] shadow-sm" : "text-[#72807a]"}`}
                  >
                    إدارة الموظفين
                  </button>
                  <button
                    onClick={() => setAdminTab("marketing")}
                    className={`rounded-lg px-5 py-2.5 transition ${adminTab === "marketing" ? "bg-white text-[#173f3a] shadow-sm" : "text-[#72807a]"}`}
                  >
                    إدارة التسويق
                  </button>
                </>
              )}
            </nav>
            {userRole === "admin" && adminTab === "orders" && (
              <button
                type="button"
                onClick={printOrders}
                className="no-print flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#173f3a] px-4 text-sm font-bold text-white transition hover:bg-[#25534d] sm:w-fit"
                title="طباعة الطلبات أو حفظها PDF"
              >
                <Printer size={17} /> طباعة / PDF
              </button>
            )}
            {adminTab !== "targets" && (
              <div className="relative w-full sm:w-64">
                <Search
                  className="absolute right-3 top-3 text-[#9ca49d]"
                  size={17}
                />
                <input
                  value={orderSearch}
                  onChange={(event) => setOrderSearch(event.target.value)}
                  placeholder="ابحث برقم الطلب أو الهاتف"
                  aria-label="البحث في الطلبات"
                  className="h-11 w-full rounded-xl border border-[#dedfd8] bg-white pr-10 pl-3 text-sm outline-none transition focus:border-[#173f3a]"
                />
              </div>
            )}
          </div>
          {adminTab === "employees" && userRole === "admin" ? (
            <EmployeesManager employees={employees} setEmployees={setEmployees} onPrintTarget={printEmployeeTarget} />
          ) : adminTab === "marketing" && userRole === "admin" ? (
            <MarketingManager settings={settings} setSettings={setSettings} />
          ) : adminTab === "targets" && userRole === "admin" ? (
            <TargetsManager orders={orders} settings={settings} />
          ) : adminTab === "targets" && userRole === "staff" ? (
            <MyTargetCard orders={orders} settings={settings} staffName={staffName} />
          ) : userRole === "staff" ? (
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
                  className="grid gap-3 border-b border-[#ededE7] px-4 py-5 last:border-0 sm:grid-cols-[100px_160px_1fr_100px_130px] sm:items-center sm:gap-4 sm:px-5"
                >
                  <span className="font-display text-lg font-extrabold tabular-nums text-[#173f3a]">
                    {order.id}
                  </span>
                  <span className="text-lg font-bold tabular-nums text-[#596963]">
                    {order.phone}
                  </span>
                  <span className="text-base font-semibold leading-7 text-[#596963]">
                    {order.items}
                    <small className="mr-2 block text-sm font-bold text-[#56816c]">
                      {order.governorate}
                      {order.district ? ` - ${order.district}` : ""}
                    </small>
                    <small className="mr-2 block text-xs font-semibold text-[#72807a]">
                      {formatOrderDate(order.created_at)}
                    </small>
                    <small className="mr-2 block text-xs font-bold text-[#c48738]">{formatRelativeTime(order.status_changed_at || order.created_at, currentTime)}</small>
                  </span>
                  <span className="font-display text-lg font-extrabold tabular-nums text-[#c48738]">
                    {order.total} جنيه
                  </span>
                  {order.status === "تم" ? (
                    <div className="grid min-w-28 place-items-center gap-1 rounded-lg bg-[#e4eee5] px-3 py-2 text-center">
                      <span className="text-sm font-bold text-[#39704f]">✓ تم</span>
                      {order.staff_name && (
                        <span className="text-[11px] font-semibold text-[#56816c]">بواسطة {order.staff_name}</span>
                      )}
                    </div>
                  ) : (
                    <select
                      value={order.status}
                      onChange={(event) =>
                        handleStatusSelect(
                          order.id,
                          event.target.value as OrderStatus,
                          order.status,
                        )
                      }
                      className="select-with-arrow min-w-28 rounded-lg border-0 bg-[#fff0d4] px-3 py-3 text-sm font-bold text-[#a66c20] outline-none"
                    >
                      {orderStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  )}
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
                    className="select-with-arrow h-11 rounded-xl border border-[#dedfd8] bg-white px-3 text-sm outline-none focus:border-[#173f3a]"
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
                    className="select-with-arrow h-11 rounded-xl border border-[#dedfd8] bg-white px-3 text-sm outline-none focus:border-[#173f3a]"
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
                    className="select-with-arrow h-11 rounded-xl border border-[#dedfd8] bg-white px-3 text-sm outline-none focus:border-[#173f3a]"
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
                    className="select-with-arrow h-11 rounded-xl border border-[#dedfd8] bg-white px-3 text-sm outline-none focus:border-[#173f3a]"
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
                <div className="hidden grid-cols-[100px_160px_1fr_100px_130px_70px] gap-4 border-b border-[#e7e7df] bg-[#f7f7f2] px-5 py-4 text-xs font-bold text-[#89918c] sm:grid">
                  <span>الطلب</span>
                  <span>رقم الهاتف</span>
                  <span>الأصناف</span>
                  <span>الإجمالي</span>
                  <span>الحالة</span>
                  <span>إجراء</span>
                </div>
                {filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    className="grid gap-3 border-b border-[#ededE7] px-4 py-5 last:border-0 sm:grid-cols-[100px_160px_1fr_100px_130px_70px] sm:items-center sm:gap-4 sm:px-5"
                  >
                    <span className="font-display text-lg font-extrabold tabular-nums text-[#173f3a]">
                      {order.id}
                    </span>
                    <span className="text-lg font-bold tabular-nums text-[#596963]">
                      {order.phone}
                    </span>
                    <span className="text-base font-semibold leading-7 text-[#596963]">
                      {order.items}
                      <small className="mr-2 block text-sm font-bold text-[#56816c]">
                        {order.governorate}
                        {order.district ? ` - ${order.district}` : ""}
                      </small>
                      <small className="mr-2 block text-xs font-semibold text-[#72807a]">
                        {formatOrderDate(order.created_at)}
                      </small>
                      <small className="mr-2 block text-xs font-bold text-[#c48738]">{formatRelativeTime(order.status_changed_at || order.created_at, currentTime)}</small>
                    </span>
                    <span className="font-display text-lg font-extrabold tabular-nums text-[#c48738]">
                      {order.total} جنيه
                    </span>
                    <select
                      value={order.status}
                      onChange={(event) =>
                        void updateOrderStatus(
                          order.id,
                          event.target.value as OrderStatus,
                        )
                      }
                      className={`select-with-arrow w-fit rounded-lg border-0 px-3 py-2 text-xs font-bold outline-none ${order.status === "تم" ? "bg-[#e4eee5] text-[#39704f]" : "bg-[#fff0d4] text-[#a66c20]"}`}
                    >
                      {orderStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setPendingDeleteOrder(order.id)}
                      aria-label={`حذف الطلب ${order.id}`}
                      title="حذف الطلب"
                      className="grid size-9 place-items-center rounded-lg bg-[#f9e5e1] text-[#a9584d] transition hover:bg-[#f2d2cc]"
                    >
                      <Trash2 size={16} />
                    </button>
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
    priceMode: "fixed" as "fixed" | "market" | "exchange" | "free" | "discount",
    discountPercent: "",
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
      price_mode: draft.priceMode,
      discount_percent: Number(draft.discountPercent),
      emoji: "☕",
    };
    if (
      !payload.name ||
      !payload.category ||
      (payload.price_mode === "fixed" &&
        (!Number.isFinite(payload.price) || payload.price < 0)) ||
      (payload.price_mode === "discount" &&
        (!Number.isFinite(payload.price) || payload.price < 0 ||
          !Number.isFinite(payload.discount_percent) ||
          payload.discount_percent < 0 || payload.discount_percent > 100))
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
      priceMode: "fixed",
      discountPercent: "",
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
      priceMode: item.price_mode || "fixed",
      discountPercent: String(item.discount_percent || ""),
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
        className="mb-5 grid gap-2 rounded-xl bg-[#f6f6f1] p-3 sm:grid-cols-[1.5fr_1fr_1fr_100px_auto_auto]"
      >
        <input
          required
          value={draft.name}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          placeholder="اسم الصنف"
                    className="select-with-arrow h-10 rounded-lg border border-[#dedfd8] bg-white px-3 text-sm outline-none focus:border-[#173f3a]"
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
        <select
          value={draft.priceMode}
          onChange={(event) =>
            setDraft({
              ...draft,
              priceMode: event.target.value as "fixed" | "market" | "exchange",
            })
          }
          className="select-with-arrow h-10 rounded-lg border border-[#dedfd8] bg-white px-3 text-sm outline-none focus:border-[#173f3a]"
        >
          <option value="fixed">سعر ثابت</option>
          <option value="market">سوق</option>
          <option value="exchange">بورصة</option>
          <option value="free">مجاني 100%</option>
          <option value="discount">عليه خصم</option>
        </select>
        <input
          required={draft.priceMode === "fixed"}
          type="number"
          min="0"
          value={draft.price}
          onChange={(event) =>
            setDraft({ ...draft, price: event.target.value })
          }
          placeholder="السعر"
          disabled={draft.priceMode !== "fixed" && draft.priceMode !== "discount"}
          className="h-10 rounded-lg border border-[#dedfd8] bg-white px-3 text-sm outline-none focus:border-[#173f3a] disabled:cursor-not-allowed disabled:bg-[#eef0ea]"
        />
        {draft.priceMode === "discount" && (
          <input
            required
            type="number"
            min="0"
            max="100"
            value={draft.discountPercent}
            onChange={(event) =>
              setDraft({ ...draft, discountPercent: event.target.value })
            }
            placeholder="نسبة الخصم %"
            className="h-10 rounded-lg border border-[#dedfd8] bg-white px-3 text-sm outline-none focus:border-[#173f3a]"
          />
        )}
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
                {item.category} <span className="mx-1">•</span>
                {item.price_mode === "market"
                  ? "سوق"
                  : item.price_mode === "exchange"
                    ? "بورصة"
                    : item.price_mode === "free"
                      ? "مجاني 100%"
                      : item.price_mode === "discount"
                        ? `خصم ${item.discount_percent}% - ${item.price} جنيه`
                        : `${item.price} جنيه`}
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

function EmployeesManager({
  employees,
  setEmployees,
  onPrintTarget,
}: {
  employees: Employee[];
  setEmployees: (employees: Employee[]) => void;
  onPrintTarget: (name: string) => void;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [message, setMessage] = useState("");

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const isAdminPassword = adminPassword.trim();
    if (!name.trim() && !isAdminPassword) return setMessage("اكتب اسم الموظف");
    const response = isAdminPassword
      ? await fetch("/api/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: isAdminPassword }) })
      : await fetch("/api/admin/employees", { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editingId, name: name.trim(), password }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return setMessage(result.error || "تعذر الحفظ");
    if (isAdminPassword) {
      setAdminPassword("");
      return setMessage("تم تغيير كلمة سر الأدمن");
    }
    setEmployees(editingId ? employees.map((employee) => employee.id === editingId ? result : employee) : [result, ...employees]);
    setEditingId(null);
    setName("");
    setPassword("");
    setMessage(editingId ? "تم تعديل الموظف" : "تمت إضافة الموظف");
  };

  const edit = (employee: Employee) => {
    setEditingId(employee.id);
    setName(employee.name);
    setPassword("");
    setMessage("");
  };

  const remove = async (id: number) => {
    const response = await fetch("/api/admin/employees", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (!response.ok) return setMessage("تعذر إيقاف الموظف");
    setEmployees(employees.filter((employee) => employee.id !== id));
  };

  return (
    <section className="max-w-3xl rounded-2xl border border-[#e0e1d9] bg-[#fffdf9] p-5">
      <p className="text-sm font-semibold text-[#c48738]">صلاحيات الدخول</p>
      <h2 className="font-display text-2xl font-bold text-[#173f3a]">إدارة الموظفين</h2>
      <form onSubmit={save} className="mt-5 grid gap-3 rounded-xl bg-[#f6f6f1] p-4 sm:grid-cols-2">
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="اسم الموظف" className="h-11 rounded-xl border border-[#dedfd8] bg-white px-3 outline-none focus:border-[#173f3a]" />
        <input type="password" minLength={4} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={editingId ? "كلمة سر جديدة اختيارية" : "كلمة سر الموظف"} className="h-11 rounded-xl border border-[#dedfd8] bg-white px-3 outline-none focus:border-[#173f3a]" />
        <button className="h-11 rounded-xl bg-[#173f3a] font-bold text-white">{editingId ? "حفظ تعديل الموظف" : "إضافة موظف"}</button>
        {editingId && <button type="button" onClick={() => { setEditingId(null); setName(""); setPassword(""); }} className="h-11 rounded-xl bg-white font-bold text-[#72807a]">إلغاء التعديل</button>}
      </form>
      <form onSubmit={save} className="mt-4 grid gap-3 rounded-xl border border-[#e9e9e2] p-4 sm:grid-cols-[1fr_auto]">
        <input type="password" minLength={4} value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} placeholder="كلمة سر الأدمن الجديدة" className="h-11 rounded-xl border border-[#dedfd8] px-3 outline-none focus:border-[#173f3a]" />
        <button className="h-11 rounded-xl bg-[#c48738] px-5 font-bold text-white">تغيير كلمة سر الأدمن</button>
      </form>
      {message && <p className="mt-4 text-center text-sm font-semibold text-[#56816c]">{message}</p>}
      <div className="mt-5 grid gap-2">
        {employees.map((employee) => <div key={employee.id} className="flex items-center gap-3 rounded-xl border border-[#ecece5] px-3 py-3"><span className="flex-1 font-semibold">{employee.name}</span><button type="button" onClick={() => onPrintTarget(employee.name)} aria-label={`طباعة تارجيت ${employee.name}`} title="طباعة التارجيت PDF" className="grid size-9 place-items-center rounded-lg bg-[#e4eee5] text-[#173f3a]"><Printer size={15} /></button><button onClick={() => edit(employee)} className="rounded-lg bg-[#edf0e9] px-3 py-2 text-xs font-bold text-[#173f3a]">تعديل</button><button onClick={() => void remove(employee.id)} className="rounded-lg bg-[#fff0d4] px-3 py-2 text-xs font-bold text-[#a66c20]">إيقاف</button></div>)}
      </div>
    </section>
  );
}

function MarketingManager({
  settings,
  setSettings,
}: {
  settings: SiteSettings;
  setSettings: (settings: SiteSettings) => void;
}) {
  const [url, setUrl] = useState(settings.marketing_url);
  const [message, setMessage] = useState("");

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = url.trim();
    if (value && !(/^\//.test(value) || /^https?:\/\//i.test(value))) {
      return setMessage("اكتب مسارًا يبدأ بـ / أو رابطًا يبدأ بـ https://");
    }
    const formData = new FormData();
    Object.entries(settings).forEach(([key, currentValue]) => {
      if (key !== "reward_rate_history" && currentValue !== undefined)
        formData.append(key, String(currentValue));
    });
    formData.set("marketing_url", value);
    const response = await fetch("/api/settings", { method: "PATCH", body: formData });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return setMessage(result.error || "تعذر حفظ رابط التسويق");
    setSettings(result);
    setUrl(result.marketing_url || "");
    setMessage("تم حفظ رابط التسويق");
  };

  return (
    <section className="max-w-3xl rounded-2xl border border-[#e0e1d9] bg-[#fffdf9] p-5">
      <p className="text-sm font-semibold text-[#c48738]">رابط زر تابع الجديد</p>
      <h2 className="font-display text-2xl font-bold text-[#173f3a]">إدارة التسويق</h2>
      <p className="mt-1 text-sm text-[#72807a]">ضع مسار الصفحة أو الرابط الذي سيفتحه العميل بعد تسجيل الحجز.</p>
      <form onSubmit={save} className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
        <input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="مثال: /offers أو https://example.com"
          dir="ltr"
          className="h-11 rounded-xl border border-[#dedfd8] bg-white px-3 text-left outline-none focus:border-[#173f3a]"
        />
        <button className="h-11 rounded-xl bg-[#173f3a] px-5 font-bold text-white">حفظ الرابط</button>
      </form>
      {message && <p className="mt-4 text-center text-sm font-semibold text-[#56816c]">{message}</p>}
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
      if (key !== "staff_name" && value !== undefined) formData.append(key, String(value));
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
        <label className="text-sm font-semibold">
          كل كام حالة "تم" يستحق الموظف مكافأة
          <input
            type="number"
            min="1"
            value={draft.milestone_count}
            onChange={(event) =>
              setDraft({ ...draft, milestone_count: Number(event.target.value) })
            }
            className="mt-2 h-11 w-full rounded-xl border border-[#dedfd8] px-3 font-normal outline-none focus:border-[#173f3a]"
          />
        </label>
        <label className="text-sm font-semibold">
          قيمة المكافأة (جنيه)
          <input
            type="number"
            min="0"
            value={draft.milestone_reward}
            onChange={(event) =>
              setDraft({ ...draft, milestone_reward: Number(event.target.value) })
            }
            className="mt-2 h-11 w-full rounded-xl border border-[#dedfd8] px-3 font-normal outline-none focus:border-[#173f3a]"
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

function buildRateHistory(settings: SiteSettings): RewardRate[] {
  const interval = Math.max(1, settings.milestone_count || 1);
  const reward = settings.milestone_reward || 0;
  return settings.reward_rate_history?.length
    ? [...settings.reward_rate_history].sort(
        (a, b) => new Date(a.effective_from).getTime() - new Date(b.effective_from).getTime(),
      )
    : [{ milestone_count: interval, milestone_reward: reward, effective_from: "1970-01-01T00:00:00Z" }];
}

function computeEmployeeStats(orders: Order[], rateHistory: RewardRate[]) {
  const segmentIndexForDate = (date: Date) => {
    let index = 0;
    for (let i = 0; i < rateHistory.length; i += 1) {
      if (new Date(rateHistory[i].effective_from).getTime() <= date.getTime()) index = i;
      else break;
    }
    return index;
  };

  const violationWindows = computeViolationWindows(orders);
  const completedOrders = orders
    .filter(
      (order) =>
        order.status === "تم" &&
        !isWithinPenalty(new Date(order.status_changed_at || order.created_at), violationWindows),
    )
    .sort(
      (a, b) =>
        new Date(a.status_changed_at || a.created_at).getTime() -
        new Date(b.status_changed_at || b.created_at).getTime(),
    );

  const segmentCounters = new Map<number, number>();
  const rewardedOrders = completedOrders.map((order) => {
    const date = new Date(order.status_changed_at || order.created_at);
    const segment = segmentIndexForDate(date);
    const rate = rateHistory[segment];
    const rateCount = Math.max(1, rate.milestone_count);
    const nextCount = (segmentCounters.get(segment) || 0) + 1;
    segmentCounters.set(segment, nextCount);
    const orderReward = nextCount % rateCount === 0 ? rate.milestone_reward : 0;
    return { order, date, orderReward };
  });

  const totalCompleted = completedOrders.length;
  const totalStages = rewardedOrders.filter((entry) => entry.orderReward > 0).length;
  const totalReward = rewardedOrders.reduce((sum, entry) => sum + entry.orderReward, 0);
  const totalSales = completedOrders.reduce((sum, order) => sum + order.total, 0);

  const dailyMap = new Map<string, { count: number; reward: number; total: number }>();
  rewardedOrders.forEach(({ order, date, orderReward }) => {
    const key = date.toLocaleDateString("ar-EG");
    const entry = dailyMap.get(key) || { count: 0, reward: 0, total: 0 };
    entry.count += 1;
    entry.reward += orderReward;
    entry.total += order.total;
    dailyMap.set(key, entry);
  });
  const dailyStats = [...dailyMap.entries()].reverse();

  const periodsMap = new Map<number, { count: number; reward: number; total: number }>();
  const anchor = completedOrders.length
    ? new Date(completedOrders[0].status_changed_at || completedOrders[0].created_at)
    : null;
  if (anchor) anchor.setHours(0, 0, 0, 0);
  rewardedOrders.forEach(({ order, date, orderReward }) => {
    const daysDiff = Math.floor((date.getTime() - anchor!.getTime()) / 86400000);
    const periodIndex = Math.floor(daysDiff / 30);
    const entry = periodsMap.get(periodIndex) || { count: 0, reward: 0, total: 0 };
    entry.count += 1;
    entry.reward += orderReward;
    entry.total += order.total;
    periodsMap.set(periodIndex, entry);
  });
  const periods = [...periodsMap.entries()]
    .map(([index, data]) => {
      const start = new Date(anchor!);
      start.setDate(anchor!.getDate() + index * 30);
      const end = new Date(start);
      end.setDate(start.getDate() + 29);
      return {
        index,
        start,
        end,
        count: data.count,
        total: data.total,
        reward: data.reward,
      };
    })
    .sort((a, b) => b.index - a.index);

  return { totalCompleted, totalStages, totalReward, totalSales, dailyStats, periods };
}

function MyTargetCard({
  orders,
  settings,
  staffName,
}: {
  orders: Order[];
  settings: SiteSettings;
  staffName: string;
}) {
  const rateHistory = buildRateHistory(settings);
  const myOrders = orders.filter((order) => order.staff_name?.trim() === staffName);
  const interval = Math.max(1, settings.milestone_count || 1);
  const reward = settings.milestone_reward || 0;
  if (!staffName) {
    return (
      <p className="rounded-2xl border border-[#e0e1d9] bg-[#fffdf9] px-5 py-8 text-center text-sm text-[#89918c]">
        سجّل دخولك باسمك أولًا حتى يظهر تارجيتك هنا.
      </p>
    );
  }
  return (
    <section className="grid gap-5">
      <div className="rounded-2xl border border-[#e0e1d9] bg-[#fffdf9] p-4">
        <h2 className="font-display text-lg font-bold text-[#173f3a]">تارجيتي</h2>
        <p className="mt-1 text-xs text-[#89918c]">
          المعدل الحالي: كل {interval} حالة &quot;تم&quot; = مكافأة {reward} جنيه (يُطبَّق من وقت تحديده وليس بأثر رجعي).
        </p>
      </div>
      <EmployeeTargetCard name={staffName} orders={myOrders} rateHistory={rateHistory} showSales={false} />
    </section>
  );
}

function EmployeeTargetPrint({
  name,
  orders,
  settings,
}: {
  name: string;
  orders: Order[];
  settings: SiteSettings;
}) {
  const stats = computeEmployeeStats(orders, buildRateHistory(settings));
  return (
    <section className="print-sheet" dir="rtl">
      <div className="print-sheet-header">
        <div>
          <h1>{settings.name}</h1>
          <p>تقرير تارجيت الموظف: {name}</p>
        </div>
        <div className="print-sheet-meta">
          <span>تاريخ الطباعة: {new Date().toLocaleString("ar-EG")}</span>
          <span>المعدل: كل {Math.max(1, settings.milestone_count || 1)} حالة &quot;تم&quot;</span>
        </div>
      </div>
      <div className="print-target-summary">
        <div><strong>حالات تم</strong><span>{stats.totalCompleted}</span></div>
        <div><strong>المراحل المحققة</strong><span>{stats.totalStages}</span></div>
        <div><strong>إجمالي المكافآت</strong><span>{stats.totalReward} جنيه</span></div>
        <div><strong>إجمالي المبيعات</strong><span>{stats.totalSales} جنيه</span></div>
      </div>
      <h2>التارجيت كل 30 يوم</h2>
      <table>
        <thead><tr><th>الفترة</th><th>عدد &quot;تم&quot;</th><th>المبيعات</th><th>المكافأة</th></tr></thead>
        <tbody>
          {stats.periods.length ? stats.periods.map((period) => (
            <tr key={period.index}>
              <td>{period.start.toLocaleDateString("ar-EG")} - {period.end.toLocaleDateString("ar-EG")}</td>
              <td>{period.count}</td>
              <td>{period.total} جنيه</td>
              <td>{period.reward} جنيه</td>
            </tr>
          )) : <tr><td colSpan={4}>لا توجد حالات &quot;تم&quot; بعد</td></tr>}
        </tbody>
      </table>
    </section>
  );
}

function EmployeeTargetCard({
  name,
  orders,
  rateHistory,
  showSales = true,
}: {
  name: string;
  orders: Order[];
  rateHistory: RewardRate[];
  showSales?: boolean;
}) {
  const stats = computeEmployeeStats(orders, rateHistory);
  return (
    <details className="overflow-hidden rounded-2xl border border-[#e0e1d9] bg-[#fffdf9]" open>
      <summary className="flex cursor-pointer items-center justify-between gap-3 bg-[#f7f7f2] px-5 py-4">
        <span className="font-display text-lg font-bold text-[#173f3a]">{name}</span>
        <span className="text-xs font-semibold text-[#89918c]">
          {stats.totalCompleted} حالة &quot;تم&quot; • {stats.totalStages} مرحلة • {stats.totalReward} جنيه
        </span>
      </summary>
      <div className={`grid gap-3 p-5 ${showSales ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
        <div className="rounded-xl border border-[#ecece5] p-3 text-center">
          <p className="text-xs font-semibold text-[#89918c]">إجمالي حالات &quot;تم&quot;</p>
          <p className="mt-1 font-display text-xl font-bold text-[#173f3a]">{stats.totalCompleted}</p>
        </div>
        <div className="rounded-xl border border-[#ecece5] p-3 text-center">
          <p className="text-xs font-semibold text-[#89918c]">عدد المراحل المحققة</p>
          <p className="mt-1 font-display text-xl font-bold text-[#173f3a]">{stats.totalStages}</p>
        </div>
        <div className="rounded-xl border border-[#ecece5] p-3 text-center">
          <p className="text-xs font-semibold text-[#89918c]">إجمالي المكافآت</p>
          <p className="mt-1 font-display text-xl font-bold text-[#c48738]">{stats.totalReward} جنيه</p>
        </div>
        {showSales && (
          <div className="rounded-xl border border-[#ecece5] p-3 text-center">
            <p className="text-xs font-semibold text-[#89918c]">إجمالي المبيعات المنجزة</p>
            <p className="mt-1 font-display text-xl font-bold text-[#173f3a]">{stats.totalSales} جنيه</p>
          </div>
        )}
      </div>
      <div className="border-t border-[#ecece5] px-5 py-4">
        <h3 className="mb-2 text-sm font-bold text-[#173f3a]">تحقيق التارجيت كل 30 يوم</h3>
        <div className={`hidden gap-4 border-b border-[#e7e7df] bg-[#f7f7f2] px-3 py-2 text-xs font-bold text-[#89918c] sm:grid ${showSales ? "grid-cols-[1fr_100px_100px_120px]" : "grid-cols-[1fr_100px_120px]"}`}>
          <span>الفترة</span>
          <span>عدد &quot;تم&quot;</span>
          {showSales && <span>المبيعات</span>}
          <span>المكافأة</span>
        </div>
        {stats.periods.length ? (
          stats.periods.map((period) => (
            <div
              key={period.index}
              className={`grid gap-2 border-b border-[#ededE7] px-3 py-3 last:border-0 sm:items-center ${showSales ? "sm:grid-cols-[1fr_100px_100px_120px]" : "sm:grid-cols-[1fr_100px_120px]"}`}
            >
              <span className="text-sm font-semibold text-[#596963]">
                {period.start.toLocaleDateString("ar-EG")} - {period.end.toLocaleDateString("ar-EG")}
              </span>
              <span className="font-display text-base font-bold text-[#173f3a]">{period.count}</span>
              {showSales && <span className="font-display text-base font-bold text-[#173f3a]">{period.total} جنيه</span>}
              <span className="font-display text-base font-bold text-[#c48738]">{period.reward} جنيه</span>
            </div>
          ))
        ) : (
          <p className="py-4 text-center text-sm text-[#89918c]">لا توجد حالات &quot;تم&quot; بعد</p>
        )}
      </div>
      <div className="border-t border-[#ecece5] px-5 py-4">
        <h3 className="mb-2 text-sm font-bold text-[#173f3a]">إحصاء الحالات يوميًا</h3>
        <div className={`hidden gap-4 border-b border-[#e7e7df] bg-[#f7f7f2] px-3 py-2 text-xs font-bold text-[#89918c] sm:grid ${showSales ? "grid-cols-[1fr_100px_100px_120px]" : "grid-cols-[1fr_100px_120px]"}`}>
          <span>اليوم</span>
          <span>عدد &quot;تم&quot;</span>
          {showSales && <span>المبيعات</span>}
          <span>المكافأة</span>
        </div>
        {stats.dailyStats.length ? (
          stats.dailyStats.map(([day, data]) => (
            <div
              key={day}
              className={`grid gap-2 border-b border-[#ededE7] px-3 py-2 last:border-0 sm:items-center ${showSales ? "sm:grid-cols-[1fr_100px_100px_120px]" : "sm:grid-cols-[1fr_100px_120px]"}`}
            >
              <span className="text-sm font-semibold text-[#596963]">{day}</span>
              <span className="font-display text-base font-bold text-[#173f3a]">{data.count}</span>
              {showSales && <span className="font-display text-base font-bold text-[#173f3a]">{data.total} جنيه</span>}
              <span className="font-display text-base font-bold text-[#c48738]">{data.reward} جنيه</span>
            </div>
          ))
        ) : (
          <p className="py-4 text-center text-sm text-[#89918c]">لا توجد بيانات بعد</p>
        )}
      </div>
    </details>
  );
}

function TargetsManager({
  orders,
  settings,
}: {
  orders: Order[];
  settings: SiteSettings;
}) {
  const interval = Math.max(1, settings.milestone_count || 1);
  const reward = settings.milestone_reward || 0;
  const rateHistory = buildRateHistory(settings);
  const employeeOrders = orders.filter(
    (order) => order.status === "تم" && order.staff_name && order.staff_name.trim(),
  );
  const employees = [...new Set(employeeOrders.map((order) => order.staff_name!.trim()))].sort((a, b) =>
    a.localeCompare(b, "ar"),
  );

  return (
    <section className="grid gap-5">
      <div className="rounded-2xl border border-[#e0e1d9] bg-[#fffdf9] p-4">
        <h2 className="font-display text-lg font-bold text-[#173f3a]">تارجيت كل موظف على حدة</h2>
        <p className="mt-1 text-xs text-[#89918c]">
          المعدل الحالي: كل {interval} حالة &quot;تم&quot; = مكافأة {reward} جنيه (يُطبَّق من وقت تحديده وليس بأثر رجعي). تغييرات الأدمن على الحالة لا تُحتسب ضمن أي تارجيت.
        </p>
      </div>
      {employees.length ? (
        employees.map((name) => (
          <EmployeeTargetCard
            key={name}
            name={name}
            orders={orders.filter((order) => order.staff_name?.trim() === name)}
            rateHistory={rateHistory}
          />
        ))
      ) : (
        <p className="rounded-2xl border border-[#e0e1d9] bg-[#fffdf9] px-5 py-8 text-center text-sm text-[#89918c]">
          لا توجد بيانات موظفين بعد. يجب على الموظف إدخال اسمه عند تسجيل الدخول حتى يظهر تارجيته هنا.
        </p>
      )}
    </section>
  );
}
