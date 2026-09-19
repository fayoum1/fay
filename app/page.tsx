"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FaFacebookF, FaInstagram, FaWhatsapp } from "react-icons/fa6";
import {
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  XCircle,
  Clock,
  Coffee,
  Download,
  LockKeyhole,
  LogOut,
  Minus,
  Plus,
  Printer,
  RefreshCw,
  Search,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Store,
  Trash2,
  Volume2,
  VolumeX,
} from "lucide-react";

type Item = {
  id: number;
  name: string;
  category: string;
  price: number;
  price_mode?: "fixed" | "market" | "exchange" | "free" | "discount";
  discount_percent?: number;
  age_or_weight?: string;
  availability_status?: ItemAvailabilityStatus;
  emoji: string;
  color: string;
  image_url?: string;
};
type ItemAvailabilityStatus = "متوفر الآن" | "جاي بالطريق" | "غير متاح" | "متوفر بالحجز" | "متوفر جملة فقط";
type OrderItemStatus = "حجز مؤكد" | "قادم" | "قيد التنفيذ" | "تم" | "لم يرد" | "غير متاح" | "طلب مرفوض";
type Order = {
  id: string;
  customer_name?: string;
  phone: string;
  governorate: string;
  district?: string;
  items: string;
  total: number;
  status: OrderStatus;
  created_at: string;
  status_changed_at?: string;
  staff_name?: string;
  booking_source?: string;
  booking_staff_name?: string;
  status_changed_by?: string;
  admin_reverted?: boolean;
  order_items?: {
    id: number;
    name: string;
    quantity: number;
    category?: string;
    age_or_weight?: string | null;
    price?: number;
    final_price?: number;
    item_status?: OrderItemStatus;
  }[];
};
type OrderStatus = "حجز مؤكد" | "قادم" | "قيد التنفيذ" | "تم" | "لم يرد" | "غير متاح" | "طلب مرفوض";
type UserRole = "admin" | "staff";
type Employee = { id: number; name: string; active: boolean; created_at: string };
type SellerOffer = {
  id: number;
  seller_name: string;
  phone: string;
  address: string;
  item_name: string;
  quantity: number;
  age_or_weight?: string | null;
  price: number;
  image_url?: string | null;
  status: "جديد" | "قيد المراجعة" | "تم التواصل" | "مهتم وجار التواصل" | "تم الشراء" | "مرفوض";
  admin_note?: string | null;
  visibility?: string;
  created_at: string;
};
type PublicAdvertisement = {
  id: number;
  advertiser_name: string;
  title: string;
  description?: string | null;
  media_type: string;
  image_url?: string | null;
  video_url?: string | null;
  target_url?: string | null;
  whatsapp?: string | null;
  featured?: boolean;
  reward_badge?: string | null;
};
type MarketTrader = { id: number; display_name: string; phone: string; receive_offers: boolean };
const orderStatuses: OrderStatus[] = [
  "حجز مؤكد",
  "قادم",
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
  facebook_url: string;
  instagram_url: string;
  whatsapp_url: string;
  visitor_message: string;
  logo_url?: string;
  staff_name: string;
  milestone_count: number;
  milestone_reward: number;
  show_target_to_staff: boolean;
  reward_rate_history?: RewardRate[];
};

const defaultSettings: SiteSettings = {
  name: "الفيوم للأعلاف والدواجن",
  tagline: "نظام الحجوزات",
  branch: "الفرع الرئيسي",
  phone: "",
  secondary_phone: "",
  marketing_url: "",
  facebook_url: "",
  instagram_url: "",
  whatsapp_url: "",
  visitor_message: "",
  staff_name: "",
  milestone_count: 1,
  milestone_reward: 1,
  show_target_to_staff: true,
};
const defaultCategories: string[] = [];
const itemAvailabilityStatuses: ItemAvailabilityStatus[] = [
  "متوفر الآن",
  "جاي بالطريق",
  "غير متاح",
  "متوفر بالحجز",
  "متوفر جملة فقط",
];
const RADIO_STATIONS = [
  { id: "cairo-quran", name: "إذاعة القرآن الكريم من القاهرة", url: "/api/radio/cairo" },
  { id: "quran", name: "إذاعة القرآن الكريم العامة", url: "https://qurango.net/radio/mix" },
  { id: "abdulbasit", name: "عبدالباسط", url: "https://radio.mp3islam.com/listen/abdulbasit/radio.mp3" },
  { id: "sudais", name: "السديس", url: "https://radio.mp3islam.com/listen/sudais/radio.mp3" },
  { id: "alhuthaifi", name: "الحذيفي", url: "https://radio.mp3islam.com/listen/alhuthaifi/radio.mp3" },
  { id: "kuwait", name: "إذاعة الكويت", url: "https://radio.mp3islam.com/listen/quran_radio/radio.mp3" },
  { id: "maher", name: "ماهر المعيقلي", url: "https://radio.mp3islam.com/listen/maher/radio.mp3" },
  { id: "mishary", name: "مشاري العفاسي", url: "https://radio.mp3islam.com/listen/mishary/radio.mp3" },
  { id: "minshawi", name: "المنشاوي", url: "https://radio.mp3islam.com/listen/minshawi/radio.mp3" },
  { id: "shuraim", name: "الشريم", url: "https://radio.mp3islam.com/listen/alshuraim/radio.mp3" },
  { id: "yaser", name: "ياسر الدوسري", url: "https://radio.mp3islam.com/listen/yaser/radio.mp3" },
];

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

function OrderAttribution({ order }: { order: Order }) {
  return (
    <div className="mt-1 text-xs font-semibold leading-5 text-[#89918c]">
      <span>الحجز: {order.booking_staff_name || order.booking_source || "عبر الأونلاين"}</span>
      <span className="mx-1">|</span>
      <span>آخر تغيير: {order.status_changed_by || (order.status === "تم" ? order.staff_name : null) || "غير مسجل"}</span>
    </div>
  );
}

function getConfirmedOrders(orders: Order[]) {
  return orders.flatMap((order) => {
    if (!order.order_items?.length) {
      return order.status === "حجز مؤكد" || order.status === "قادم" ? [order] : [];
    }
    const confirmedItems = order.order_items.filter((item) =>
      item.item_status === "حجز مؤكد" || item.item_status === "قادم" ||
      (!item.item_status && (order.status === "حجز مؤكد" || order.status === "قادم")),
    );
    return confirmedItems.length ? [{ ...order, order_items: confirmedItems }] : [];
  });
}

export default function Home() {
  const [view, setView] = useState<"cashier" | "admin">("cashier");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [governorate, setGovernorate] = useState("الفيوم");
  const [district, setDistrict] = useState("");
  const [query, setQuery] = useState("");
  const [showItemSearch, setShowItemSearch] = useState(false);
  const [orderSearch, setOrderSearch] = useState("");
  const [category, setCategory] = useState("الكل");
  const [cart, setCart] = useState<Record<number, number>>({});
  const [orders, setOrders] = useState<Order[]>([]);
  const [notice, setNotice] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [duplicateBooking, setDuplicateBooking] = useState<{
    items: { id: string; name: string; status: OrderStatus; quantity: number; order_id: number }[];
  } | null>(null);
  const [duplicateQuantities, setDuplicateQuantities] = useState<Record<string, number>>({});
  const [adminPin, setAdminPin] = useState("");
  const [loginRole, setLoginRole] = useState<UserRole>("admin");
  const [staffNameInput, setStaffNameInput] = useState("");
  const [staffName, setStaffName] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [menuItems, setMenuItems] = useState<Item[]>([]);
  const [adminTab, setAdminTab] = useState<"orders" | "edit-order" | "menu" | "settings" | "employees" | "marketing" | "targets" | "sellers" | "advertisements">(
    "orders",
  );
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [printEmployeeName, setPrintEmployeeName] = useState<string | null>(null);
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [visitorCount, setVisitorCount] = useState<number | null>(null);
  const [categoryOptions, setCategoryOptions] = useState(defaultCategories);
  const [todayOrdersCount, setTodayOrdersCount] = useState(0);
  const [confirmedOrdersCount, setConfirmedOrdersCount] = useState(0);
  const [ordersDialog, setOrdersDialog] = useState<"today" | "confirmed" | null>(null);
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
  const [selectedRadioStation, setSelectedRadioStation] = useState(RADIO_STATIONS[0].id);
  const [radioMuted, setRadioMuted] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstall, setShowIOSInstall] = useState(false);
  const [showDesktopInstallHelp, setShowDesktopInstallHelp] = useState(false);
  const [appUpdate, setAppUpdate] = useState<ServiceWorkerRegistration | null>(null);
  const [showOutsideDeliveryWarning, setShowOutsideDeliveryWarning] = useState(false);
  const [pendingDeleteOrder, setPendingDeleteOrder] = useState<string | null>(null);
  const [milestoneMessage, setMilestoneMessage] = useState("");
  const [pendingStatusConfirm, setPendingStatusConfirm] = useState<{ id: string; status: OrderStatus; itemId?: number } | null>(null);
  const [penaltyMessage, setPenaltyMessage] = useState("");
  const [advertisements, setAdvertisements] = useState<PublicAdvertisement[]>([]);
  const [featuredAdvertisement, setFeaturedAdvertisement] = useState<PublicAdvertisement | null>(null);

  useEffect(() => {
    const restoreStaffName = window.setTimeout(() => {
      const saved = window.localStorage.getItem("rashefa_staff_name");
      if (saved) {
        setStaffName(saved);
        setStaffNameInput(saved);
      }
    }, 0);
    return () => window.clearTimeout(restoreStaffName);
  }, []);

  useEffect(() => {
    let closeTimer: number | undefined;
    let cancelled = false;
    fetch("/api/advertisements")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled) return;
        const accepted = Array.isArray(data?.advertisements) ? data.advertisements : [];
        setAdvertisements(accepted);
        const featuredAdvertisements = accepted.filter((item: PublicAdvertisement) => item.featured);
        const featured = featuredAdvertisements[Math.floor(Math.random() * featuredAdvertisements.length)];
        const featuredAdvertisementShown = window.sessionStorage.getItem("featured_advertisement_shown");
        if (featured && !featuredAdvertisementShown) {
          window.sessionStorage.setItem("featured_advertisement_shown", "true");
          setFeaturedAdvertisement(featured);
          closeTimer = window.setTimeout(() => setFeaturedAdvertisement(null), 15000);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      if (closeTimer) window.clearTimeout(closeTimer);
    };
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
    if (
      orderStatus !== "الكل" &&
      !order.order_items?.some(
        (item) =>
          (!orderItem || item.name === orderItem) &&
          (item.item_status || order.status) === orderStatus,
      )
    ) return false;
    return true;
  });
  const statusCounts = orderStatuses.reduce<Record<OrderStatus, number>>(
    (counts, status) => ({
      ...counts,
      [status]: filteredOrders.filter((order) => order.status === status || order.order_items?.some((item) => (item.item_status || order.status) === status))
        .length,
    }),
    { "حجز مؤكد": 0, قادم: 0, "قيد التنفيذ": 0, تم: 0, "لم يرد": 0, "غير متاح": 0, "طلب مرفوض": 0 },
  );
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayOrders = orders.filter((order) => new Date(order.created_at) >= startOfToday);
  const confirmedOrders = getConfirmedOrders(orders);
  const filteredOrderItems = filteredOrders.flatMap((order) =>
    (order.order_items || []).filter((item) =>
      (orderItem === "الكل" || item.name === orderItem) &&
      (orderStatus === "الكل" || (item.item_status || order.status) === orderStatus),
    ),
  );
  const filteredItemUnits = filteredOrderItems.reduce((sum, item) => sum + item.quantity, 0);
  const filteredItemStatuses = orderStatuses.reduce<Record<OrderStatus, number>>((counts, status) => ({
    ...counts,
    [status]: filteredOrderItems
      .filter((item) => (item.item_status || "قيد التنفيذ") === status)
      .reduce((sum, item) => sum + item.quantity, 0),
  }), { "حجز مؤكد": 0, قادم: 0, "قيد التنفيذ": 0, تم: 0, "لم يرد": 0, "غير متاح": 0, "طلب مرفوض": 0 });

  useEffect(() => {
    if (!milestoneMessage) return;
    const timeout = window.setTimeout(() => setMilestoneMessage(""), 8000);
    return () => window.clearTimeout(timeout);
  }, [milestoneMessage]);

  useEffect(() => {
    const updatePenalty = window.setTimeout(() => {
      if (userRole !== "staff" || !staffName) {
        setPenaltyMessage("");
        return;
      }
      const windows = computeViolationWindows(orders.filter((order) => order.staff_name?.trim() === staffName));
      const now = new Date();
      const active = windows.find((window) => now >= window.start && now <= window.end);
      setPenaltyMessage(
        active
          ? `⚠️ لقد قمت بتغيير الحالة إلى "تم" لطلبات لم تُستلم من قبل العميل، لذا تم إيقافك عن تحقيق ربح التارجيت لمدة 24 ساعة حتى ${active.end.toLocaleString("ar-EG")}. يمكنك تغيير الحالة بشكل طبيعي لكن لن تُحتسب لك ضمن التارجيت خلال هذه المدة.`
          : "",
      );
    }, 0);
    return () => window.clearTimeout(updatePenalty);
  }, [orders, userRole, staffName]);


  useEffect(() => {
    const initialClock = window.setTimeout(() => setCurrentTime(Date.now()), 0);
    const clock = window.setInterval(() => setCurrentTime(Date.now()), 60000);
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    window.setTimeout(() => setIsIOS(ios), 0);
    if ("serviceWorker" in navigator) {
      let refreshing = false;
      const handleControllerChange = () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      };
      navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
      navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .then((registration) => {
          const showUpdate = () => {
            if (registration.waiting) setAppUpdate(registration);
          };
          showUpdate();
          registration.addEventListener("updatefound", () => {
            const installing = registration.installing;
            if (!installing) return;
            installing.addEventListener("statechange", () => {
              if (installing.state === "installed" && navigator.serviceWorker.controller) showUpdate();
            });
          });
          return registration.update();
        })
        .catch(() => undefined);
      window.addEventListener("beforeunload", () => navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange), { once: true });
    }
    const handleInstallPrompt = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPromptEvent); };
    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    return () => { window.clearTimeout(initialClock); window.clearInterval(clock); window.removeEventListener("beforeinstallprompt", handleInstallPrompt); };
  }, []);

  const applyAppUpdate = () => {
    const waiting = appUpdate?.waiting;
    setAppUpdate(null);
    if (!waiting) {
      window.location.reload();
      return;
    }
    waiting.postMessage({ type: "SKIP_WAITING" });
  };

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
        if (data && typeof data.count === "number") {
          setTodayOrdersCount(data.count);
          setConfirmedOrdersCount(typeof data.confirmedCount === "number" ? data.confirmedCount : 0);
        }
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

  useEffect(() => {
    if (!adminAuthenticated) return;
    const refreshOrders = () => {
      fetch("/api/admin/orders")
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => {
          if (Array.isArray(data)) {
            setOrders(data);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            setTodayOrdersCount(data.filter((order: Order) => new Date(order.created_at) >= today).length);
            setConfirmedOrdersCount(getConfirmedOrders(data).length);
          }
        })
        .catch(() => undefined);
    };
    const interval = window.setInterval(refreshOrders, 30000);
    return () => window.clearInterval(interval);
  }, [adminAuthenticated]);

  const installApp = async () => {
    if (!installPrompt) {
      setShowDesktopInstallHelp(true);
      return;
    }
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

  const toggleRadioMute = () => {
    const radio = radioRef.current;
    const nextMuted = !radioMuted;
    setRadioMuted(nextMuted);
    if (radio) radio.muted = nextMuted;
  };

  useEffect(() => {
    const radio = radioRef.current;
    if (!radio || !radioPlaying) return;
    radio.load();
    radio.play().catch(() => {
      setRadioPlaying(false);
      setRadioError(true);
    });
  }, [selectedRadioStation]);

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
    if (!customerName.trim()) return setNotice("اكتب اسم العميل");
    const normalizedPhone = normalizePhone(phone).replace(/\D/g, "");
    if (!isValidMobilePhone(normalizedPhone)) return setNotice("اكتب رقم هاتف محمول صحيح من 11 رقمًا ويبدأ بـ 010 أو 011 أو 012 أو 015");
    if (governorate === "الفيوم" && !district)
      return setNotice("اختر المركز التابع لمحافظة الفيوم");
    if (governorate === "أخرى" && !district.trim())
      return setNotice("اكتب اسم محافظتك أولاً");
    if (!cartItems.length) return setNotice("أضف صنفاً واحداً على الأقل للسلة");
    const totalQuantity = cartItems.reduce((sum, entry) => sum + entry.quantity, 0);
    if (governorate !== "الفيوم" && totalQuantity < 100) {
      setNotice("");
      setShowOutsideDeliveryWarning(true);
      return;
    }
    const orderItems = cartItems
      .map(({ item, quantity }) => `${item.name}${item.age_or_weight ? ` (${item.age_or_weight})` : ""} × ${quantity}`)
      .join("، ");
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_name: customerName.trim(),
        phone: normalizedPhone,
        governorate: governorate === "أخرى" ? district.trim() : governorate,
        district: governorate === "الفيوم" ? district : null,
        items: cartItems.map(({ item, quantity }) => ({
          id: item.id,
          name: item.name,
          category: item.category,
          age_or_weight: item.age_or_weight || null,
          quantity,
          price: item.price,
          final_price: getItemUnitPrice(item),
        })),
        total,
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (response.status === 409) {
      setNotice("");
      const duplicateItems = Array.isArray(result.duplicateItems) ? result.duplicateItems : [];
      setDuplicateBooking({
        items: duplicateItems,
      });
      setDuplicateQuantities(Object.fromEntries(duplicateItems.map((item: { id: string; order_id: number; quantity: number }) => [`${item.order_id}:${item.id}`, item.quantity])));
      return;
    }
    if (!response.ok) return setNotice(result.error || "تعذر حفظ الطلب، راجع اتصال Supabase");
    setOrders((current) => [
      {
        id: `#${1043 + current.length}`,
        customer_name: customerName.trim(),
        phone: normalizedPhone,
        governorate,
        district,
        items: orderItems,
        total,
        status: "قيد التنفيذ",
        created_at: new Date().toISOString(),
        status_changed_at: new Date().toISOString(),
        booking_source: staffName ? "بواسطة موظف" : "عبر الأونلاين",
        booking_staff_name: staffName || undefined,
      },
      ...current,
    ]);
    setCart({});
    setCustomerName("");
    setPhone("");
    setGovernorate("الفيوم");
    setDistrict("");
    setTodayOrdersCount((count) => count + 1);
    setNotice("");
    setBookingSuccess(true);
  };

  const updateDuplicateQuantities = async () => {
    if (!duplicateBooking) return;
    const response = await fetch("/api/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: normalizePhone(phone),
        changes: duplicateBooking.items.map((item) => ({
          order_id: item.order_id,
          item_id: Number(item.id),
          quantity: duplicateQuantities[`${item.order_id}:${item.id}`],
        })),
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setNotice(result.error || "تعذر تعديل كمية الحجز");
      setDuplicateBooking(null);
      return;
    }
    setDuplicateBooking(null);
    setNotice("تم تعديل كمية الحجز الموجود بنجاح");
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
              status_changed_by: userRole === "staff" ? staffName : "الأدمن",
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
    setConfirmedOrdersCount((count) =>
      target && (target.status === "حجز مؤكد" || target.status === "قادم") && status !== "حجز مؤكد" && status !== "قادم"
        ? Math.max(0, count - 1)
        : target && target.status !== "حجز مؤكد" && target.status !== "قادم" && (status === "حجز مؤكد" || status === "قادم")
          ? count + 1
          : count,
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

  const updateOrderItemStatus = async (id: string, itemId: number, status: OrderStatus) => {
    const target = orders.find((order) => order.id === id);
    const numericId = Number(id.replace("#", ""));
    const item = target?.order_items?.find((entry) => entry.id === itemId);
    if (!target || !item) return;
    const response = await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: numericId,
        item_id: itemId,
        item_status: status,
        staff_name: userRole === "staff" && status === "تم" ? staffName : undefined,
      }),
    });
    if (!response.ok) return;
    const updatedItems = target.order_items?.map((entry) =>
      entry.id === itemId ? { ...entry, item_status: status } : entry,
    ) || [];
    const itemStatuses = updatedItems.map((entry) => entry.item_status).filter(Boolean) as OrderStatus[];
    const orderStatus = itemStatuses.length === updatedItems.length && new Set(itemStatuses).size === 1
      ? itemStatuses[0]
      : target.status;
    setOrders((current) => current.map((order) => order.id === id
      ? {
          ...order,
          status: orderStatus,
          status_changed_by: userRole === "staff" ? staffName : "الأدمن",
          staff_name:
            userRole === "staff" && orderStatus === "تم" && staffName ? staffName : order.staff_name,
          status_changed_at: itemStatuses.length === updatedItems.length && new Set(itemStatuses).size === 1
            ? new Date().toISOString()
            : order.status_changed_at,
          order_items: updatedItems,
          items: updatedItems.map((entry) => `${entry.name}${entry.age_or_weight ? ` (${entry.age_or_weight})` : ""} × ${entry.quantity}`).join("، "),
        }
      : order,
    ));
  };

  const handleStatusSelect = (id: string, status: OrderStatus, currentStatus: OrderStatus, itemId?: number) => {
    if (currentStatus === "تم" && userRole === "staff") return;
    if (userRole === "staff" && status === "تم" && currentStatus !== "تم") {
      setPendingStatusConfirm({ id, status, itemId });
      return;

    }
    void (itemId ? updateOrderItemStatus(id, itemId, status) : updateOrderStatus(id, status));
  };

  const confirmStatusChange = () => {
    if (!pendingStatusConfirm) return;
    void (pendingStatusConfirm.itemId
      ? updateOrderItemStatus(pendingStatusConfirm.id, pendingStatusConfirm.itemId, pendingStatusConfirm.status)
      : updateOrderStatus(pendingStatusConfirm.id, pendingStatusConfirm.status));
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
            <OrderSummary
              todayCount={todayOrdersCount}
              confirmedCount={confirmedOrdersCount}
              interactive={adminAuthenticated}
              onToday={() => setOrdersDialog("today")}
              onConfirmed={() => setOrdersDialog("confirmed")}
            />
            <button
              onClick={() =>
                cartRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                })
              }
              className="relative grid size-12 place-items-center rounded-xl bg-[#173f3a] text-white"
              aria-label="فتح السلة"
              title="فتح السلة"
            >
              <ShoppingCart size={16} />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-[#c48738] text-[10px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </button>
            <button
              onClick={() => window.location.reload()}
              className="grid size-12 place-items-center rounded-xl border border-[#e2e1d8] bg-[#fffdf8] text-[#173f3a] transition hover:bg-[#eef4ee]"
              aria-label="تحديث الصفحة"
              title="تحديث الصفحة"
            >
              <RefreshCw size={17} />
            </button>
            <button onClick={installApp} className="grid size-14 shrink-0 place-items-center rounded-xl border border-[#e2e1d8] bg-[#fffdf8] text-[#173f3a]" aria-label="تثبيت التطبيق على سطح المكتب" title="تثبيت التطبيق على سطح المكتب"><Download size={18} /></button>
          </div>
          <div className="hidden items-center gap-2 text-xs text-[#72807a] sm:flex">
            <span className="size-2 rounded-full bg-[#5aa67d]" />{" "}
            {settings.branch} <span className="mx-1 text-[#c2c8c2]">|</span>{" "}
            {settings.phone || "أضف رقم الهاتف"}
          </div>
          <div className="flex min-w-0 shrink items-center gap-1 rounded-xl border border-[#e2e1d8] bg-[#fffdf8] p-1 text-[#173f3a]">
            <select
              value={selectedRadioStation}
              onChange={(event) => {
                setSelectedRadioStation(event.target.value);
                setRadioError(false);
                setRadioPlaying(true);
              }}
              className="h-8 min-w-0 max-w-28 bg-transparent px-1 text-[10px] font-bold outline-none sm:h-10 sm:max-w-32 sm:text-xs"
              aria-label="اختيار الإذاعة الإسلامية"
            >
              {RADIO_STATIONS.map((station) => (
                <option key={station.id} value={station.id}>{station.name}</option>
              ))}
            </select>
            <button
              onClick={toggleRadioMute}
              className="grid size-8 shrink-0 place-items-center rounded-lg text-[#173f3a] hover:bg-[#eef0ea] sm:size-10"
              aria-label={radioMuted ? "إلغاء كتم الإذاعة" : "كتم الإذاعة"}
              title={radioMuted ? "إلغاء الكتم" : "كتم الصوت"}
            >
              {radioMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
          </div>
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
          <OrderSummary
            todayCount={todayOrdersCount}
            confirmedCount={confirmedOrdersCount}
            interactive={adminAuthenticated}
            onToday={() => setOrdersDialog("today")}
            onConfirmed={() => setOrdersDialog("confirmed")}
            compact
          />
          <div className="flex items-center gap-1.5">
            <button
              onClick={() =>
                cartRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                })
              }
              className="relative grid h-12 min-w-0 flex-1 place-items-center rounded-xl bg-[#173f3a] text-white sm:h-14"
              aria-label="فتح السلة"
              title="فتح السلة"
            >
              <ShoppingCart size={16} />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-[#c48738] text-[10px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </button>
            <button
              onClick={() => window.location.reload()}
              className="grid size-12 shrink-0 place-items-center rounded-xl border border-[#e2e1d8] bg-[#fffdf8] text-[#173f3a] transition hover:bg-[#eef4ee] sm:size-14"
              aria-label="تحديث الصفحة"
              title="تحديث الصفحة"
            >
              <RefreshCw size={17} />
            </button>
          </div>
          </div>
      </div>
      <audio
        ref={radioRef}
        src={RADIO_STATIONS.find((station) => station.id === selectedRadioStation)?.url}
        autoPlay
        loop
        playsInline
        preload="none"
        muted={radioMuted}
        onPlay={() => setRadioPlaying(true)}
        onPause={() => setRadioPlaying(false)}
        onError={handleRadioError}
        aria-label="المشغل الإسلامي"
      />
      {ordersDialog && adminAuthenticated && (
        <OrdersDialog
          title={ordersDialog === "today" ? "طلبات اليوم" : "الحجوزات المؤكدة والقادمة"}
          orders={ordersDialog === "today" ? todayOrders : confirmedOrders}
          onClose={() => setOrdersDialog(null)}
          onStatusChange={handleStatusSelect}
        />
      )}
      {showIOSInstall && <div className="fixed inset-x-4 top-4 z-50 rounded-2xl border border-[#e2e1d8] bg-[#fffdf9] p-4 text-right shadow-2xl"><button onClick={() => setShowIOSInstall(false)} className="float-left text-xl text-[#72807a]" aria-label="إغلاق">×</button><p className="font-bold text-[#173f3a]">تثبيت التطبيق على iPhone</p><p className="mt-2 text-sm leading-6 text-[#596963]">اضغط زر المشاركة في المتصفح، ثم اختر <strong>إضافة إلى الشاشة الرئيسية</strong>، وبعدها افتح التطبيق من الأيقونة.</p></div>}
      {showDesktopInstallHelp && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#173f3a99] px-5" role="dialog" aria-modal="true" aria-labelledby="desktop-install-title" onClick={() => setShowDesktopInstallHelp(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-[#e0e1d9] bg-[#fffdf9] p-6 text-center shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-[#e4eee5] text-[#173f3a]"><Download size={26} /></div>
            <h2 id="desktop-install-title" className="mt-4 font-display text-xl font-bold text-[#173f3a]">تثبيت البرنامج على سطح المكتب</h2>
            <p className="mt-3 text-sm leading-7 text-[#596963]">اختر تثبيت التطبيق من شريط عنوان المتصفح أو من قائمة المتصفح. إذا لم يظهر الخيار، فقد يكون البرنامج مثبتًا بالفعل.</p>
            <button type="button" onClick={() => setShowDesktopInstallHelp(false)} className="mt-5 h-11 w-full rounded-xl bg-[#173f3a] text-sm font-bold text-white">حسنًا</button>
          </div>
        </div>
      )}
      {showOutsideDeliveryWarning && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#173f3a99] px-5" role="alertdialog" aria-modal="true" aria-labelledby="outside-delivery-title" onClick={() => setShowOutsideDeliveryWarning(false)}>
          <div className="w-full max-w-md rounded-2xl border border-[#f0d9a7] bg-[#fffdf8] p-6 text-center shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <h2 id="outside-delivery-title" className="font-display text-xl font-extrabold text-[#a66c20]">تنبيه بخصوص التوصيل والحجز</h2>
            <p className="mt-3 text-sm font-semibold leading-7 text-[#596963]">لا يوجد توصيل أو حجز للكميات الصغيرة خارج محافظة الفيوم. يرجى زيادة إجمالي عدد الأصناف إلى 100 أو أكثر، أو التواصل مع فريق الدعم.</p>
            <a href="tel:0842064130" className="mt-4 block rounded-xl bg-[#fff0d4] px-4 py-3 font-bold text-[#a66c20]">0842064130</a>
            <button type="button" onClick={() => setShowOutsideDeliveryWarning(false)} className="mt-4 h-11 w-full rounded-xl bg-[#173f3a] text-sm font-bold text-white">العودة لزيادة الكمية</button>
          </div>
        </div>
      )}
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
              {pendingStatusConfirm.itemId ? "تأكيد استلام الصنف" : "تأكيد تسليم الطلب"}
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
                تأكيد، العميل استلم {pendingStatusConfirm.itemId ? "الصنف" : "الطلب"}
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
      {duplicateBooking && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[#173f3a99] px-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="duplicate-booking-title"
          onClick={() => setDuplicateBooking(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[#f0d9a7] bg-[#fffdf8] p-6 text-center shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-[#fff0d4] text-[#a66c20]">
              <Clock size={27} />
            </div>
            <h2 id="duplicate-booking-title" className="mt-4 font-display text-xl font-extrabold text-[#173f3a]">
              تم استلام حجزك بالفعل
            </h2>
            <p className="mt-3 text-sm font-semibold leading-7 text-[#596963]">
              يوجد حجز نشط من نفس رقم الهاتف للأصناف التالية:
            </p>
            <div className="mt-2 grid gap-2 text-right">
              {duplicateBooking.items.map((item) => {
                const key = `${item.order_id}:${item.id}`;
                return (
                  <div key={key} className="rounded-xl bg-[#f6f6f1] px-4 py-3">
                    <div className="flex items-center justify-between gap-3 text-sm font-bold text-[#173f3a]">
                      <span>{item.name}</span>
                      <span className="text-[#a66c20]">{item.status}</span>
                    </div>
                    <label className="mt-2 flex items-center justify-between gap-3 text-xs font-semibold text-[#72807a]">
                      الكمية الحالية
                      <input
                        type="number"
                        min="1"
                        value={duplicateQuantities[key] || item.quantity}
                        onChange={(event) => setDuplicateQuantities((current) => ({ ...current, [key]: Math.max(1, Math.floor(Number(event.target.value) || 1)) }))}
                        className="h-9 w-24 rounded-lg border border-[#dedfd8] bg-white text-center font-bold text-[#173f3a] outline-none focus:border-[#173f3a]"
                      />
                    </label>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-xs leading-6 text-[#72807a]">
              لا يمكن إنشاء حجز جديد للصنف أثناء وجوده في هذه الحالة. يمكنك تعديل الكمية، أو حجزه من جديد بعد أن تصبح حالته «تم» أو «طلب مرفوض».
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setDuplicateBooking(null);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="h-11 rounded-xl border border-[#dedfd8] bg-white text-sm font-bold text-[#72807a]"
              >
                العودة للقائمة
              </button>
              <button
                type="button"
                onClick={() => void updateDuplicateQuantities()}
                className="h-11 rounded-xl bg-[#c48738] text-sm font-bold text-white"
              >
                تعديل الكمية
              </button>
              <button
                type="button"
                onClick={() => {
                  const duplicateIds = new Set(duplicateBooking.items.map((item) => Number(item.id)));
                  setCart((current) => Object.fromEntries(Object.entries(current).filter(([id]) => !duplicateIds.has(Number(id)))));
                  setDuplicateBooking(null);
                }}
                className="h-11 rounded-xl bg-[#173f3a] text-sm font-bold text-white sm:col-span-2"
              >
                إزالة المحجوز ومتابعة الأصناف الأخرى
              </button>
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
      {featuredAdvertisement && <FeaturedAdvertisement advertisement={featuredAdvertisement} />}
      {appUpdate && (
        <div className="fixed inset-x-4 bottom-4 z-50 flex items-center justify-between gap-3 rounded-xl bg-[#173f3a] px-4 py-3 text-right text-sm font-bold text-white shadow-2xl sm:left-auto sm:right-4 sm:max-w-sm">
          <span>توجد نسخة جديدة من التطبيق</span>
          <button onClick={applyAppUpdate} className="shrink-0 rounded-lg bg-[#c48738] px-3 py-2 text-xs font-bold text-white">تحديث الآن</button>
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
            <div className="flex flex-col gap-3">
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
                    className="grid size-12 shrink-0 place-items-center rounded-xl border border-[#dedfd8] bg-white text-[#72807a] transition hover:border-[#173f3a] hover:text-[#173f3a] max-[359px]:hidden"
                  >
                    <Search size={19} />
                  </button>
                )}
                {!showItemSearch && settings.visitor_message && (
                  <div className="h-12 min-w-0 flex-1 overflow-hidden rounded-xl border border-[#dedfd8] bg-white text-[#173f3a]" aria-label="رسالة للزوار">
                    <div className="visitor-message-ticker flex h-full w-max items-center whitespace-nowrap px-4 text-sm font-bold">
                      {settings.visitor_message}
                    </div>
                  </div>
                )}
                {!showItemSearch && (settings.facebook_url || settings.instagram_url || settings.whatsapp_url) && (
                  <div className="flex shrink-0 items-center gap-1">
                    {settings.facebook_url && (
                      <a href={settings.facebook_url} target="_blank" rel="noreferrer" aria-label="فيسبوك" title="فيسبوك" className="grid size-9 place-items-center rounded-lg bg-[#1877f2] text-white transition hover:opacity-85 max-[359px]:size-7">
                        <FaFacebookF size={17} />
                      </a>
                    )}
                    {settings.instagram_url && (
                      <a href={settings.instagram_url} target="_blank" rel="noreferrer" aria-label="إنستجرام" title="إنستجرام" className="grid size-9 place-items-center rounded-lg bg-[#c13584] text-white transition hover:opacity-85 max-[359px]:size-7">
                        <FaInstagram size={18} />
                      </a>
                    )}
                    {settings.whatsapp_url && (
                      <a href={settings.whatsapp_url} target="_blank" rel="noreferrer" aria-label="واتساب" title="واتساب" className="grid size-9 place-items-center rounded-lg bg-[#25a866] text-white transition hover:opacity-85 max-[359px]:size-7">
                        <FaWhatsapp size={19} />
                      </a>
                    )}
                  </div>
                )}
              </div>
              <div className="sticky top-[78px] z-20 w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain border-b border-[#dedfd8] bg-[#f7f6f2] px-0 pb-1 pt-2 shadow-sm [scrollbar-width:thin] [touch-action:pan-x] sm:top-[84px] lg:top-0">
                <div className="flex w-max min-w-full flex-nowrap gap-2">
                <button
                  type="button"
                  onClick={() => { window.location.href = "/sell"; }}
                  className="grid h-11 w-[92px] shrink-0 place-items-center rounded-xl border border-[#173f3a] bg-[#173f3a] text-sm font-bold text-white"
                  aria-label="صفحة البيع"
                  title="إضافة عرض للبيع"
                >
                  البيع
                </button>
                {(installPrompt || isIOS) && (
                  <button
                    type="button"
                    onClick={isIOS ? installOnIOS : installApp}
                    className="grid h-11 w-[92px] shrink-0 place-items-center rounded-xl bg-[#c48738] text-white"
                    aria-label="تثبيت التطبيق"
                    title="تثبيت التطبيق"
                  >
                    <Download size={18} />
                  </button>
                )}
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
            {advertisements.length > 0 && <AdvertisementStrip advertisements={advertisements} />}
            <div className="grid min-w-0 gap-3 pr-1">
              {filteredItems.map((item) => (
                <article
                  key={item.id}
                  onClick={() => updateQuantity(item.id, 1)}
                  className={`group relative flex min-w-0 max-w-full items-center gap-2 overflow-hidden rounded-2xl border bg-[#fffdf9] p-2 transition hover:shadow-lg hover:shadow-[#173f3a0d] ${cart[item.id] ? "border-[#56816c] ring-2 ring-[#56816c26]" : "border-[#e4e3da]"}`}
                >
                  <div
                    role="img"
                    aria-label={item.name}
                    className={`grid size-16 shrink-0 place-items-center rounded-xl ${item.color} bg-cover bg-center text-5xl transition group-hover:scale-[1.02]`}
                    style={
                      item.image_url
                        ? { backgroundImage: `url(${item.image_url})` }
                        : undefined
                    }
                  >
                    {!item.image_url && item.emoji}
                  </div>
                  <div className="min-w-0 flex-1 px-1 py-1">
                    <h2 className="text-base font-bold leading-none text-[#173f3a] sm:text-lg">{item.name}</h2>
                    <div className="mt-0 flex min-w-0 max-w-full flex-col items-start gap-0">
                      <button
                        onClick={(event) => { event.stopPropagation(); updateQuantity(item.id, 1); }}
                        aria-label={`إضافة ${item.name} للسلة`}
                        className="grid size-9 shrink-0 place-items-center self-end rounded-full bg-[#173f3a] text-white shadow-sm transition hover:bg-[#285951]"
                      >
                        <Plus size={17} strokeWidth={2.5} />
                      </button>
                      <p className="max-w-full whitespace-nowrap text-left font-display text-sm font-extrabold leading-none text-[#c48738] sm:text-lg">
                        {item.price_mode === "market"
                          ? "سوق"
                          : item.price_mode === "exchange"
                            ? "بورصة"
                            : item.price_mode === "free"
                              ? "مجاني 100%"
                              : <>{item.price_mode === "discount" && <span className="ml-2 text-sm text-[#56816c]">خصم {item.discount_percent}%</span>}{getItemUnitPrice(item)}<span className="mr-1 text-xs font-bold text-[#8b948e]">جنيه</span></>}
                        {item.age_or_weight && (
                          <span className="mr-1 text-[10px] font-semibold text-[#56816c] sm:mr-2 sm:text-xs">- {item.age_or_weight}</span>
                        )}
                        <span className={`mr-1 text-[10px] font-semibold sm:mr-2 sm:text-xs ${item.availability_status === "غير متاح" ? "text-[#a9584d]" : "text-[#56816c]"}`}>
                          - {item.availability_status || "متوفر الآن"}
                        </span>
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
              <input
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="اسم العميل للحجز"
                maxLength={100}
                className="h-11 w-full rounded-xl border border-[#dedfd8] bg-white px-3 text-sm outline-none focus:border-[#173f3a]"
              />
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
            <nav className="w-full shrink-0 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:thin] [touch-action:pan-x] sm:w-auto sm:overflow-visible sm:pb-0">
              <div className="flex w-max flex-nowrap items-center gap-3">
              <div className="flex flex-nowrap rounded-xl bg-[#eef0ea] p-1 text-sm font-semibold [&>button]:shrink-0 [&>button]:whitespace-nowrap">
              <button
                onClick={() => setAdminTab("orders")}
                className={`rounded-lg px-5 py-2.5 transition ${adminTab === "orders" ? "bg-white text-[#173f3a] shadow-sm" : "text-[#72807a]"}`}
              >
                الطلبات
              </button>
              {userRole === "staff" && (
                <>
                  <button
                    onClick={() => setAdminTab("targets")}
                    className={`rounded-lg px-5 py-2.5 transition ${adminTab === "targets" ? "bg-white text-[#173f3a] shadow-sm" : "text-[#72807a]"}`}
                  >
                    التارجيت
                  </button>
                  <button
                    onClick={() => setAdminTab("edit-order")}
                    className={`rounded-lg px-5 py-2.5 transition ${adminTab === "edit-order" ? "bg-white text-[#173f3a] shadow-sm" : "text-[#72807a]"}`}
                  >
                    تعديل طلب
                  </button>
                </>
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
                    onClick={() => setAdminTab("edit-order")}
                    className={`rounded-lg px-5 py-2.5 transition ${adminTab === "edit-order" ? "bg-white text-[#173f3a] shadow-sm" : "text-[#72807a]"}`}
                  >
                    تعديل طلب
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
                  <button
                    onClick={() => setAdminTab("sellers")}
                    className={`rounded-lg px-5 py-2.5 transition ${adminTab === "sellers" ? "bg-white text-[#173f3a] shadow-sm" : "text-[#72807a]"}`}
                  >
                    البائعون
                  </button>
                  <button
                    onClick={() => setAdminTab("advertisements")}
                    className={`rounded-lg px-5 py-2.5 transition ${adminTab === "advertisements" ? "bg-white text-[#173f3a] shadow-sm" : "text-[#72807a]"}`}
                  >
                    الإعلانات
                  </button>
                </>
              )}
              </div>
              {userRole === "admin" && adminTab === "orders" && (
                <button
                  type="button"
                  onClick={printOrders}
                  className="no-print flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#173f3a] px-4 text-sm font-bold text-white transition hover:bg-[#25534d]"
                  title="طباعة الطلبات أو حفظها PDF"
                >
                  <Printer size={17} /> طباعة / PDF
                </button>
              )}
              </div>
            </nav>
            {adminTab === "orders" && (
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
          ) : adminTab === "sellers" && userRole === "admin" ? (
            <SellersManager />
          ) : adminTab === "advertisements" && userRole === "admin" ? (
            <div className="grid gap-5"><AdminAdvertisementsWorkspace /><RewardCampaignManager /></div>
          ) : adminTab === "targets" && userRole === "admin" ? (
            <TargetsManager orders={orders} settings={settings} />
          ) : adminTab === "targets" && userRole === "staff" ? (
            settings.show_target_to_staff === false ? (
              <p className="rounded-2xl border border-[#e0e1d9] bg-[#fffdf9] px-5 py-8 text-center text-sm text-[#89918c]">نتائج التارجيت مخفية حاليًا من الإدارة.</p>
            ) : (
              <MyTargetCard orders={orders} settings={settings} staffName={staffName} />
            )
          ) : adminTab === "edit-order" ? (
            <OrderEditor orders={orders} menuItems={menuItems} setOrders={setOrders} />
          ) : userRole === "staff" ? (
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
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  <select
                    value={orderItem}
                    onChange={(event) => setOrderItem(event.target.value)}
                    className="select-with-arrow h-11 rounded-xl border border-[#dedfd8] bg-white px-3 text-sm outline-none focus:border-[#173f3a]"
                  >
                    <option value="الكل">كل الأصناف</option>
                    {orderItems.map((option) => (
                      <option key={option} value={option}>{option}</option>
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
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="sticky top-2 z-30 mb-3 grid gap-2 rounded-2xl border border-[#d8dfd6] bg-[#fffdf9]/95 p-3 shadow-[0_8px_24px_#173f3a18] backdrop-blur">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                  <strong className="text-[#173f3a]">إحصاء الأصناف</strong>
                  <span className="font-extrabold text-black">{filteredItemUnits} وحدة</span>
                  <span className="text-[#72807a]">{filteredOrderItems.length} صنف</span>
                  <span className="text-[#72807a]">{filteredOrders.length} طلب</span>
                  {orderItem !== "الكل" && <span className="font-bold text-[#c48738]">الصنف: {orderItem}</span>}
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-bold">
                  {orderStatuses.map((status) => (
                    <span key={status} className={`rounded-full px-2.5 py-1 ${orderStatus === status ? "bg-[#173f3a] text-white" : "bg-[#eef0ea] text-[#56816c]"}`}>
                      {status}: {filteredItemStatuses[status]}
                    </span>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 rounded-2xl border border-[#e0e1d9] bg-[#f7f7f2] p-2">
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
                  className="grid gap-3 rounded-xl border border-[#e7e7df] bg-[#fffdf9] px-4 py-5 sm:grid-cols-[100px_180px_1fr_100px_130px] sm:items-center sm:gap-4 sm:px-5"
                >
                  <span className="font-display text-lg font-extrabold tabular-nums text-[#173f3a]">
                    {order.id}
                  </span>
                  <span className="text-lg font-bold tabular-nums text-[#596963]">
                    {order.phone}
                    {order.customer_name && (
                      <small className="block text-sm font-semibold text-[#56816c]">{order.customer_name}</small>
                    )}
                    <small className="block text-xs font-semibold text-[#89918c]">
                      {order.governorate}{order.district ? ` - ${order.district}` : ""}
                    </small>
                  </span>
                  <span className="text-base font-semibold leading-7 text-[#596963]">
                    <OrderItemsGrid
                      order={order}
                      onStatusChange={handleStatusSelect}
                      itemName={orderItem === "الكل" ? undefined : orderItem}
                      itemStatus={orderStatus === "الكل" ? undefined : orderStatus as OrderStatus}
                    />
                    <small className="mr-2 block text-xs font-semibold text-[#72807a]">
                      {formatOrderDate(order.created_at)}
                    </small>
                    <small className="mr-2 block text-xs font-bold text-[#c48738]">{formatRelativeTime(order.status_changed_at || order.created_at, currentTime)}</small>
                    <OrderAttribution order={order} />
                  </span>
                  <span className="font-display text-lg font-extrabold tabular-nums text-[#c48738]">
                    {order.total} جنيه
                  </span>
                </div>
              ))}
              </div>
            </>
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
              <div className="sticky top-2 z-30 mb-3 grid gap-2 rounded-2xl border border-[#d8dfd6] bg-[#fffdf9]/95 p-3 shadow-[0_8px_24px_#173f3a18] backdrop-blur">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                  <strong className="text-[#173f3a]">إحصاء الأصناف</strong>
                  <span className="font-extrabold text-black">{filteredItemUnits} وحدة</span>
                  <span className="text-[#72807a]">{filteredOrderItems.length} صنف</span>
                  <span className="text-[#72807a]">{filteredOrders.length} طلب</span>
                  {orderItem !== "الكل" && <span className="font-bold text-[#c48738]">الصنف: {orderItem}</span>}
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-bold">
                  {orderStatuses.map((status) => (
                    <span key={status} className={`rounded-full px-2.5 py-1 ${orderStatus === status ? "bg-[#173f3a] text-white" : "bg-[#eef0ea] text-[#56816c]"}`}>
                      {status}: {filteredItemStatuses[status]}
                    </span>
                  ))}
                </div>
              </div>
              <div className="overflow-hidden rounded-2xl border border-[#e0e1d9] bg-[#fffdf9]">
                <div className="hidden grid-cols-[100px_160px_1fr_100px_130px_70px] gap-4 border-b border-[#e7e7df] bg-[#f7f7f2] px-5 py-4 text-xs font-bold text-[#89918c] sm:grid">
                  <span>الطلب</span>
                  <span>رقم الهاتف</span>
                  <span>الأصناف</span>
                  <span>الإجمالي</span>
                  <span className="inline-flex items-center justify-center gap-1">
                    الحالة
                    {filteredOrderItems.some((item) => item.item_status) && <CheckCircle2 size={14} className="text-[#39704f]" aria-label="تم تغيير حالة صنف" />}
                  </span>
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
                      {order.customer_name && (
                        <small className="block text-sm font-semibold text-[#56816c]">{order.customer_name}</small>
                      )}
                      <small className="block text-xs font-semibold text-[#89918c]">
                        {order.governorate}{order.district ? ` - ${order.district}` : ""}
                      </small>
                    </span>
                    <span className="text-base font-semibold leading-7 text-[#596963]">
                      <OrderItemsGrid
                        order={order}
                        onStatusChange={handleStatusSelect}
                        itemName={orderItem === "الكل" ? undefined : orderItem}
                        itemStatus={orderStatus === "الكل" ? undefined : orderStatus as OrderStatus}
                      />
                      <small className="mr-2 block text-xs font-semibold text-[#72807a]">
                        {formatOrderDate(order.created_at)}
                      </small>
                      <small className="mr-2 block text-xs font-bold text-[#c48738]">{formatRelativeTime(order.status_changed_at || order.created_at, currentTime)}</small>
                      <OrderAttribution order={order} />
                    </span>
                    <span className="font-display text-lg font-extrabold tabular-nums text-[#c48738]">
                      {order.total} جنيه
                    </span>
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

function OrderEditor({
  orders,
  menuItems,
  setOrders,
}: {
  orders: Order[];
  menuItems: Item[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
}) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [showReview, setShowReview] = useState(false);
  const [message, setMessage] = useState("");
  const selectedOrder = orders.find((order) => order.id === selectedId);
  const normalizedSearch = search.trim().toLocaleLowerCase("ar");
  const matchingOrders = normalizedSearch
    ? orders.filter(
        (order) =>
          order.status !== "تم" &&
          (order.phone.includes(normalizedSearch) ||
            order.customer_name?.toLocaleLowerCase("ar").includes(normalizedSearch)),
      )
    : [];
  const originalQuantities = Object.fromEntries(
    (selectedOrder?.order_items || []).map((item) => [item.id, item.quantity]),
  );
  const changes = menuItems.flatMap((item) => {
    const before = originalQuantities[item.id] || 0;
    const after = quantities[item.id] || 0;
    if (before === after) return [];
    if (!before) return [`إضافة ${item.name} بكمية ${after}`];
    if (!after) return [`حذف ${item.name} من الطلب`];
    return [`تغيير ${item.name} من ${before} إلى ${after}`];
  });

  const selectOrder = (order: Order) => {
    setSelectedId(order.id);
    setQuantities(Object.fromEntries((order.order_items || []).map((item) => [item.id, item.quantity])));
    setShowReview(false);
    setMessage("");
  };

  const saveChanges = async () => {
    if (!selectedOrder) return;
    const items = Object.entries(quantities)
      .filter(([, quantity]) => quantity > 0)
      .map(([id, quantity]) => ({ id: Number(id), quantity }));
    const response = await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: Number(selectedOrder.id.replace("#", "")), items }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return setMessage(result.error || "تعذر تعديل الطلب");
    const orderItems = Array.isArray(result.items) ? result.items : [];
    setOrders((current) =>
      current.map((order) =>
        order.id === selectedOrder.id
          ? {
              ...order,
              order_items: orderItems,
              items: orderItems.map((item: { name: string; age_or_weight?: string | null; quantity: number }) => `${item.name}${item.age_or_weight ? ` (${item.age_or_weight})` : ""} × ${item.quantity}`).join("، "),
              total: Number(result.total) || 0,
            }
          : order,
      ),
    );
    setShowReview(false);
    setMessage("تم تعديل الطلب بنجاح");
  };

  return (
    <section className="grid gap-5 lg:grid-cols-[340px_1fr]">
      <div className="h-fit rounded-2xl border border-[#e0e1d9] bg-[#fffdf9] p-5">
        <h2 className="font-display text-xl font-bold text-[#173f3a]">البحث عن طلب</h2>
        <p className="mt-1 text-xs leading-6 text-[#89918c]">ابحث باسم العميل أو رقم الهاتف. الطلبات المكتملة لا تظهر هنا.</p>
        <div className="relative mt-4">
          <Search className="absolute right-3 top-3 text-[#89918c]" size={17} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="الاسم أو رقم الهاتف" className="h-11 w-full rounded-xl border border-[#dedfd8] bg-white pr-10 pl-3 text-sm outline-none focus:border-[#173f3a]" />
        </div>
        <div className="mt-3 grid max-h-[440px] gap-2 overflow-y-auto">
          {matchingOrders.map((order) => (
            <button key={order.id} type="button" onClick={() => selectOrder(order)} className={`rounded-xl border p-3 text-right ${selectedId === order.id ? "border-[#173f3a] bg-[#e4eee5]" : "border-[#e7e7df] bg-white"}`}>
              <span className="flex justify-between text-sm font-bold text-[#173f3a]"><span>{order.customer_name || "بدون اسم"}</span><span>{order.id}</span></span>
              <span className="mt-1 block text-xs text-[#596963]">{order.phone} | {order.status}</span>
            </button>
          ))}
          {normalizedSearch && !matchingOrders.length && <p className="py-6 text-center text-sm text-[#89918c]">لا توجد طلبات غير مكتملة مطابقة.</p>}
        </div>
      </div>
      <div className="rounded-2xl border border-[#e0e1d9] bg-[#fffdf9] p-5">
        {selectedOrder ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e7e7df] pb-4">
              <div><h2 className="font-display text-xl font-bold text-[#173f3a]">تعديل {selectedOrder.id}</h2><p className="mt-1 text-xs text-[#72807a]">{selectedOrder.customer_name} | {selectedOrder.phone}</p></div>
              <span className="rounded-lg bg-[#fff0d4] px-3 py-2 text-xs font-bold text-[#a66c20]">{selectedOrder.status}</span>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {menuItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-xl border border-[#ecece5] p-3">
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-[#173f3a]">{item.name}</p><p className="text-xs text-[#89918c]">{item.category}</p></div>
                  <input type="number" min="0" value={quantities[item.id] || 0} onChange={(event) => setQuantities((current) => ({ ...current, [item.id]: Math.max(0, Math.floor(Number(event.target.value) || 0)) }))} aria-label={`كمية ${item.name}`} className="h-10 w-20 rounded-lg border border-[#dedfd8] text-center font-bold outline-none focus:border-[#173f3a]" />
                </div>
              ))}
            </div>
            <button type="button" disabled={!changes.length} onClick={() => { setMessage(""); setShowReview(true); }} className="mt-5 h-11 w-full rounded-xl bg-[#c48738] font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">مراجعة التعديلات</button>
            {message && <p className="mt-3 text-center text-sm font-bold text-[#56816c]">{message}</p>}
            {showReview && (
              <div className="mt-4 rounded-xl border border-[#f0d9a7] bg-[#fff8e8] p-4">
                <h3 className="font-bold text-[#173f3a]">سيتم تعديل الآتي:</h3>
                <ul className="mt-2 grid gap-1 text-sm leading-6 text-[#596963]">{changes.map((change) => <li key={change}>• {change}</li>)}</ul>
                <div className="mt-4 flex gap-2"><button type="button" onClick={() => setShowReview(false)} className="h-11 flex-1 rounded-xl border border-[#dedfd8] bg-white font-bold text-[#72807a]">رجوع</button><button type="button" onClick={() => void saveChanges()} className="h-11 flex-1 rounded-xl bg-[#173f3a] font-bold text-white">تأكيد التعديل</button></div>
              </div>
            )}
          </>
        ) : (
          <div className="grid min-h-64 place-items-center text-center text-sm text-[#89918c]">اختر طلبًا من نتائج البحث لعرض أصنافه وتعديلها.</div>
        )}
      </div>
    </section>
  );
}

function OrderSummary({
  todayCount,
  confirmedCount,
  interactive,
  onToday,
  onConfirmed,
  compact = false,
}: {
  todayCount: number;
  confirmedCount: number;
  interactive: boolean;
  onToday: () => void;
  onConfirmed: () => void;
  compact?: boolean;
}) {
  const itemClass = `grid flex-1 place-items-center ${compact ? "h-10" : "h-12"}`;
  return (
    <div className={`flex items-center divide-x divide-x-reverse divide-[#e2e1d8] overflow-hidden rounded-xl border border-[#e2e1d8] bg-[#fffdf8] ${compact ? "h-12 w-full px-1" : "h-14 min-w-40 px-2"}`}>
      <button type="button" disabled={!interactive} onClick={onToday} className={`${itemClass} disabled:cursor-default`}>
        <span className="text-[10px] font-semibold text-[#89918c]">اليوم</span>
        <strong className="font-display text-lg leading-none text-[#173f3a]">{todayCount}</strong>
      </button>
      <button type="button" disabled={!interactive} onClick={onConfirmed} className={`${itemClass} disabled:cursor-default`}>
        <span className="text-[10px] font-semibold text-[#89918c]">مؤكد</span>
        <strong className="font-display text-lg leading-none text-[#c48738]">{confirmedCount}</strong>
      </button>
    </div>
  );
}

function OrderItemsGrid({
  order,
  onStatusChange,
  itemName,
  itemStatus,
}: {
  order: Order;
  onStatusChange: (id: string, status: OrderStatus, currentStatus: OrderStatus, itemId?: number) => void;
  itemName?: string;
  itemStatus?: OrderStatus;
}) {
  const items = (order.order_items || []).filter((item) =>
    (!itemName || item.name === itemName) &&
    (!itemStatus || (item.item_status || order.status) === itemStatus),
  );
  const hasItems = (order.order_items || []).length > 0;
  return (
    <div className="grid gap-1.5 rounded-xl bg-[#f7f7f2] p-1.5 sm:gap-2 sm:p-2">
      {items.length ? items.map((item) => {
        const status = item.item_status || order.status;
        const statusClass = {
          "حجز مؤكد": "border-[#c9dced] bg-[#eef6ff] text-[#2f628c]",
          "قادم": "border-[#ead3a8] bg-[#fff7e6] text-[#a66c20]",
          "قيد التنفيذ": "border-[#e5d2b9] bg-[#fff3e5] text-[#9a5b23]",
          "تم": "border-[#bcdcc8] bg-[#e9f7ed] text-[#39704f]",
          "لم يرد": "border-[#e3c5d0] bg-[#fff0f5] text-[#934563]",
          "غير متاح": "border-[#e2c1bc] bg-[#fff0ed] text-[#a9584d]",
          "طلب مرفوض": "border-[#d0c5c5] bg-[#f4eeee] text-[#754f4f]",
        }[status];
        return (
          <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_38px_100px] items-center gap-1.5 rounded-lg border border-[#d9ddd5] bg-white px-2 py-2 text-sm shadow-sm sm:grid-cols-[minmax(0,1fr)_72px_150px] sm:gap-3 sm:px-4 sm:py-2.5">
            <span className="flex min-w-0 items-center gap-1.5 text-xs font-extrabold text-black sm:gap-2 sm:text-base">
              <StatusIcon status={status} label={`${item.name}: ${status}`} />
              <span className="min-w-0 break-words">{item.name}</span>
            </span>
            <span className="text-center text-xs font-bold text-black sm:text-sm">× {item.quantity}</span>
            <div className="flex items-center gap-1.5">
              <select
                value={status}
                onChange={(event) => onStatusChange(order.id, event.target.value as OrderStatus, status, item.id)}
                className={`select-with-arrow min-w-0 flex-1 rounded-lg border px-1.5 py-1.5 text-[10px] font-bold outline-none sm:px-2 sm:py-2 sm:text-xs ${statusClass}`}
                aria-label={`حالة ${item.name}`}
              >
                {orderStatuses.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
          </div>
        );
      }) : <span className="text-xs text-[#89918c]">{hasItems ? "لا توجد أصناف مطابقة للفلاتر" : "لا توجد تفاصيل للأصناف"}</span>}
    </div>
  );
}

function StatusIcon({ status, label }: { status: OrderStatus; label: string }) {
  const iconClass = {
          "حجز مؤكد": "bg-[#d8ecff] text-[#075985]",
          "قادم": "bg-[#fff0b3] text-[#854d0e]",
          "قيد التنفيذ": "bg-[#eadcff] text-[#6b21a8]",
          "تم": "bg-[#c9f7d7] text-[#166534]",
          "لم يرد": "bg-[#ffd1e1] text-[#9d174d]",
          "غير متاح": "bg-[#ffd0c8] text-[#991b1b]",
          "طلب مرفوض": "bg-[#d7d7df] text-[#27272a]",
          }[status];
        const icon = status === "تم"
          ? <CheckCircle2 size={17} />
          : status === "طلب مرفوض"
            ? <XCircle size={17} />
            : status === "غير متاح"
              ? <XCircle size={17} />
              : status === "قادم"
                ? <Clock3 size={17} />
                : status === "قيد التنفيذ"
                  ? <CircleAlert size={17} />
                  : status === "لم يرد"
                    ? <CircleAlert size={17} />
                    : <CheckCircle2 size={17} />;
  return (
    <span title={label} aria-label={label} className={`grid size-7 shrink-0 place-items-center rounded-full ${iconClass}`}>
      {icon}
    </span>
  );
}

function OrderStatusIcons({ order }: { order: Order }) {
  return (
    <div className="flex flex-wrap items-center justify-start gap-1.5" aria-label="حالات الأصناف">
      {(order.order_items || []).map((item) => {
        const status = item.item_status || order.status;
        return <StatusIcon key={item.id} status={status} label={`${item.name}: ${status}`} />;
      })}
    </div>
  );
}

function OrdersDialog({
  title,
  orders,
  onClose,
  onStatusChange,
}: {
  title: string;
  orders: Order[];
  onClose: () => void;
  onStatusChange: (id: string, status: OrderStatus, currentStatus: OrderStatus) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#173f3a99] p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="orders-dialog-title" onClick={onClose}>
      <div className="flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[#e0e1d9] bg-[#fffdf9] shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[#e7e7df] px-5 py-4">
          <div>
            <h2 id="orders-dialog-title" className="font-display text-xl font-bold text-[#173f3a]">{title}</h2>
            <p className="mt-1 text-xs text-[#89918c]">{orders.length} طلب</p>
          </div>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="grid size-10 place-items-center rounded-lg border border-[#dedfd8] bg-white text-xl text-[#72807a]">×</button>
        </div>
        <div className="overflow-y-auto p-3 sm:p-5">
          <div className="mb-2 hidden grid-cols-[80px_170px_minmax(0,1fr)_90px_100px] gap-4 px-4 text-xs font-bold text-[#89918c] sm:grid sm:px-5">
            <span>الطلب</span>
            <span>رقم الهاتف والعنوان</span>
            <span>الأصناف</span>
            <span>الإجمالي</span>
            <span>الحالة</span>
          </div>
          <div className="grid gap-3">
            {orders.map((order) => (
              <article key={order.id} className="grid min-w-0 gap-3 rounded-xl border border-[#e7e7df] bg-white p-4 sm:grid-cols-[80px_170px_minmax(0,1fr)_90px_100px] sm:items-center sm:gap-4 sm:px-5">
                <strong className="min-w-0 font-display text-lg text-[#173f3a]">{order.id}</strong>
                <div className="min-w-0 text-sm font-bold text-[#596963]">
                  <a href={`tel:${order.phone}`} className="block">{order.phone}</a>
                  <span className="text-xs text-[#56816c]">{order.customer_name || "بدون اسم"}</span>
                  <small className="block text-xs font-semibold text-[#89918c]">{order.governorate}{order.district ? ` - ${order.district}` : ""}</small>
                </div>
                <div className="min-w-0 text-sm font-semibold leading-6 text-[#596963]">
                  <OrderItemsGrid order={order} onStatusChange={onStatusChange} />
                  <small className="block text-[#89918c]">{formatOrderDate(order.created_at)}</small>
                  <OrderAttribution order={order} />
                </div>
                <strong className="hidden min-w-0 font-display text-lg text-[#c48738] sm:block">{order.total} جنيه</strong>
                <div className="hidden min-w-0 sm:block"><OrderStatusIcons order={order} /></div>
              </article>
            ))}
            {!orders.length && <p className="rounded-xl border border-dashed border-[#dedfd8] py-10 text-center text-sm text-[#89918c]">لا توجد طلبات في هذه القائمة.</p>}
          </div>
        </div>
      </div>
    </div>
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
    ageOrWeight: "",
    availabilityStatus: "متوفر الآن" as ItemAvailabilityStatus,
    imageUrl: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [itemCategory, setItemCategory] = useState("الكل");
  const [itemAvailability, setItemAvailability] = useState("الكل");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const filteredMenuItems = menuItems.filter(
    (item) =>
      (itemCategory === "الكل" || item.category === itemCategory) &&
      (itemAvailability === "الكل" || (item.availability_status || "متوفر الآن") === itemAvailability) &&
      item.name.toLocaleLowerCase("ar").includes(itemSearch.trim().toLocaleLowerCase("ar")),
  );

  const refreshItems = async () => {
    setIsRefreshing(true);
    const response = await fetch("/api/items");
    const data = await response.json().catch(() => null);
    if (response.ok && Array.isArray(data)) {
      setMenuItems(data.map((item) => ({ ...item, color: item.color || "bg-[#e9d3b1]" })));
      setMessage("تم تحديث الأصناف");
    } else {
      setMessage(data?.error || "تعذر تحديث الأصناف");
    }
    setIsRefreshing(false);
  };

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
      age_or_weight: draft.ageOrWeight.trim(),
      availability_status: draft.availabilityStatus,
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
      ageOrWeight: "",
      availabilityStatus: "متوفر الآن",
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
      ageOrWeight: item.age_or_weight || "",
      availabilityStatus: item.availability_status || "متوفر الآن",
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
          value={draft.ageOrWeight}
          onChange={(event) => setDraft({ ...draft, ageOrWeight: event.target.value })}
          placeholder="مثال: العمر: 12 يوم"
          maxLength={50}
          className="h-10 rounded-lg border border-[#dedfd8] bg-white px-3 text-sm outline-none focus:border-[#173f3a]"
        />
        <select
          value={draft.availabilityStatus}
          onChange={(event) => setDraft({ ...draft, availabilityStatus: event.target.value as ItemAvailabilityStatus })}
          className="select-with-arrow h-10 rounded-lg border border-[#dedfd8] bg-white px-3 text-sm outline-none focus:border-[#173f3a]"
        >
          {itemAvailabilityStatuses.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
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
      <div className="mb-3 rounded-xl border border-[#e9e9e2] bg-[#fbfbf8] p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-bold text-[#173f3a]">فلترة الأصناف</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#89918c]">{filteredMenuItems.length} نتيجة</span>
            <button
              type="button"
              onClick={refreshItems}
              disabled={isRefreshing}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#d9e3da] bg-white px-3 text-xs font-bold text-[#173f3a] transition hover:bg-[#eef4ee] disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
              تحديث
            </button>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#89918c]" size={16} />
            <input
              value={itemSearch}
              onChange={(event) => setItemSearch(event.target.value)}
              placeholder="ابحث باسم الصنف"
              className="h-10 w-full rounded-lg border border-[#dedfd8] bg-white py-2 pl-3 pr-9 text-sm outline-none focus:border-[#173f3a]"
            />
          </div>
          <select
            value={itemCategory}
            onChange={(event) => setItemCategory(event.target.value)}
            className="select-with-arrow h-10 rounded-lg border border-[#dedfd8] bg-white px-3 text-sm outline-none focus:border-[#173f3a]"
          >
            <option value="الكل">كل الفئات</option>
            {categories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <select
            value={itemAvailability}
            onChange={(event) => setItemAvailability(event.target.value)}
            className="select-with-arrow h-10 rounded-lg border border-[#dedfd8] bg-white px-3 text-sm outline-none focus:border-[#173f3a]"
          >
            <option value="الكل">كل الحالات</option>
            {itemAvailabilityStatuses.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-2">
        {filteredMenuItems.map((item) => (
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
                      <span className="mx-1">•</span>
                      {item.availability_status || "متوفر الآن"}
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
        {!filteredMenuItems.length && (
          <p className="rounded-xl border border-dashed border-[#dedfd8] px-3 py-6 text-center text-sm text-[#89918c]">
            لا توجد أصناف مطابقة للفلتر.
          </p>
        )}
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
  const [draft, setDraft] = useState({
    marketingUrl: settings.marketing_url,
    facebookUrl: settings.facebook_url,
    instagramUrl: settings.instagram_url,
    whatsappUrl: settings.whatsapp_url,
    visitorMessage: settings.visitor_message,
  });
  const [message, setMessage] = useState("");

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const marketingUrl = draft.marketingUrl.trim();
    const socialUrls = [draft.facebookUrl, draft.instagramUrl, draft.whatsappUrl].map((value) => value.trim());
    if (marketingUrl && !(/^\//.test(marketingUrl) || /^https?:\/\//i.test(marketingUrl))) {
      return setMessage("اكتب مسارًا يبدأ بـ / أو رابطًا يبدأ بـ https://");
    }
    if (socialUrls.some((value) => value && !/^https?:\/\//i.test(value))) {
      return setMessage("روابط التواصل يجب أن تبدأ بـ https://");
    }
    const formData = new FormData();
    Object.entries(settings).forEach(([key, currentValue]) => {
      if (key !== "reward_rate_history" && currentValue !== undefined)
        formData.append(key, String(currentValue));
    });
    formData.set("marketing_url", marketingUrl);
    formData.set("facebook_url", socialUrls[0]);
    formData.set("instagram_url", socialUrls[1]);
    formData.set("whatsapp_url", socialUrls[2]);
    formData.set("visitor_message", draft.visitorMessage.trim());
    const response = await fetch("/api/settings", { method: "PATCH", body: formData });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return setMessage(result.error || "تعذر حفظ إعدادات التسويق");
    setSettings(result);
    setDraft({
      marketingUrl: result.marketing_url || "",
      facebookUrl: result.facebook_url || "",
      instagramUrl: result.instagram_url || "",
      whatsappUrl: result.whatsapp_url || "",
      visitorMessage: result.visitor_message || "",
    });
    setMessage("تم حفظ إعدادات التسويق");
  };

  return (
    <section className="max-w-3xl rounded-2xl border border-[#e0e1d9] bg-[#fffdf9] p-5">
      <p className="text-sm font-semibold text-[#c48738]">روابط التواصل ورسالة الزوار</p>
      <h2 className="font-display text-2xl font-bold text-[#173f3a]">إدارة التسويق</h2>
      <p className="mt-1 text-sm text-[#72807a]">لن تظهر أيقونة التواصل للزوار إلا بعد إضافة رابطها.</p>
      <form onSubmit={save} className="mt-5 grid gap-4">
        <label className="grid gap-1.5 text-sm font-bold text-[#173f3a]">
          رابط فيسبوك
          <input value={draft.facebookUrl} onChange={(event) => setDraft({ ...draft, facebookUrl: event.target.value })} placeholder="https://facebook.com/..." dir="ltr" className="h-11 rounded-xl border border-[#dedfd8] bg-white px-3 text-left font-normal outline-none focus:border-[#173f3a]" />
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-[#173f3a]">
          رابط إنستجرام
          <input value={draft.instagramUrl} onChange={(event) => setDraft({ ...draft, instagramUrl: event.target.value })} placeholder="https://instagram.com/..." dir="ltr" className="h-11 rounded-xl border border-[#dedfd8] bg-white px-3 text-left font-normal outline-none focus:border-[#173f3a]" />
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-[#173f3a]">
          رابط واتساب
          <input value={draft.whatsappUrl} onChange={(event) => setDraft({ ...draft, whatsappUrl: event.target.value })} placeholder="https://wa.me/201..." dir="ltr" className="h-11 rounded-xl border border-[#dedfd8] bg-white px-3 text-left font-normal outline-none focus:border-[#173f3a]" />
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-[#173f3a]">
          رسالة الزوار المتحركة
          <input maxLength={200} value={draft.visitorMessage} onChange={(event) => setDraft({ ...draft, visitorMessage: event.target.value })} placeholder="اكتب الرسالة التي ستظهر بجوار أزرار العرض" className="h-11 rounded-xl border border-[#dedfd8] bg-white px-3 font-normal outline-none focus:border-[#173f3a]" />
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-[#173f3a]">
          رابط زر تابع الجديد بعد الحجز
          <input value={draft.marketingUrl} onChange={(event) => setDraft({ ...draft, marketingUrl: event.target.value })} placeholder="مثال: /offers أو https://example.com" dir="ltr" className="h-11 rounded-xl border border-[#dedfd8] bg-white px-3 text-left font-normal outline-none focus:border-[#173f3a]" />
        </label>
        <button className="h-11 rounded-xl bg-[#173f3a] px-5 font-bold text-white">حفظ إعدادات التسويق</button>
      </form>
      {message && <p className="mt-4 text-center text-sm font-semibold text-[#56816c]">{message}</p>}
    </section>
  );
}

function AdvertisementStrip({ advertisements }: { advertisements: PublicAdvertisement[] }) {
  return (
    <div className="my-2 overflow-hidden" aria-label="الإعلانات المقبولة">
      <div className="advertisement-strip flex w-max min-w-full items-center gap-3">
        {advertisements.map((advertisement) => {
          const content = (
            <div className="grid h-[158px] w-[min(96vw,600px)] shrink-0 grid-cols-[190px_minmax(0,1fr)] items-center gap-3 rounded-md border border-[#dfe5dc] bg-white p-2.5 text-right">
              {advertisement.media_type === "video" && advertisement.video_url ? <video src={advertisement.video_url} muted autoPlay loop playsInline className="h-[138px] w-[190px] rounded-md bg-[#eef0ea] object-cover" /> : advertisement.image_url ? <img src={advertisement.image_url} alt="" className="h-[138px] w-[190px] rounded-md bg-[#eef0ea] object-cover" /> : <div className="grid h-[138px] w-[190px] place-items-center rounded-md border border-dashed border-[#d8dfd6] bg-[#f7faf6] text-[10px] font-bold text-[#89918c]">نصي</div>}
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[10px] font-bold text-[#a66c20]">إعلان ممول</p>
                  {advertisement.reward_badge && <span className="inline-flex min-h-7 items-center rounded-md bg-[#39704f] px-2.5 py-1 text-xs font-black text-white shadow-sm">{advertisement.reward_badge}</span>}
                </div>
                <p className="line-clamp-1 text-sm font-bold leading-5 text-[#173f3a]">{advertisement.title}</p>
                <p className="line-clamp-3 text-xs leading-5 text-[#596963]">{advertisement.description}</p>
              </div>
            </div>
          );
          return <Link key={advertisement.id} href={`/ads/${advertisement.id}`}>{content}</Link>;
        })}
      </div>
    </div>
  );
}

function FeaturedAdvertisement({ advertisement }: { advertisement: PublicAdvertisement }) {
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-[#173f3acc] sm:p-5" role="dialog" aria-modal="true" aria-label="إعلان مميز">
      <div className="relative max-h-[100dvh] w-full overflow-y-auto bg-[#fffdf9] text-right shadow-2xl sm:max-h-[calc(100dvh-2.5rem)] sm:max-w-xl sm:rounded-lg">
        <div className="px-4 pb-3 pt-4 sm:px-5">
          <p className="text-xs font-bold text-[#c48738]">إعلان ممول</p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <h2 className="min-w-0 font-display text-xl font-bold text-[#173f3a] sm:text-2xl">{advertisement.title}</h2>
            {advertisement.reward_badge && <span className="shrink-0 text-xs font-black text-[#39704f] sm:text-sm">{advertisement.reward_badge}</span>}
          </div>
        </div>
        {advertisement.media_type === "video" && advertisement.video_url ? (
          <video src={advertisement.video_url} controls autoPlay loop muted playsInline preload="auto" className="max-h-[62dvh] w-full bg-black object-contain" />
        ) : advertisement.image_url && (
          <img src={advertisement.image_url} alt={advertisement.title} className="max-h-[62dvh] w-full bg-[#18201e] object-contain" />
        )}
        <div className="px-4 py-4 sm:px-5">
          <p className="line-clamp-3 text-sm leading-6 text-[#596963]">{advertisement.description}</p>
          <Link href={`/ads/${advertisement.id}`} className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-md bg-[#c48738] px-5 text-sm font-bold text-white sm:w-auto">عرض ملف المعلن</Link>
        </div>
      </div>
    </div>
  );
}

type AdminAdvertisement = PublicAdvertisement & {
  status: string;
  admin_note?: string | null;
  payment_status: string;
  featured: boolean;
  price: number;
  views?: number;
  clicks?: number;
  likes?: number;
};

type AdvertisementPackage = {
  id: number;
  name: string;
  duration_days: number;
  price: number;
  active: boolean;
};

function AdminAdvertisementsWorkspace() {
  const [advertisements, setAdvertisements] = useState<AdminAdvertisement[]>([]);
  const [packages, setPackages] = useState<AdvertisementPackage[]>([]);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("الكل");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [packageDraft, setPackageDraft] = useState({ name: "", duration_days: "7", price: "0" });

  const load = async () => {
    setLoading(true);
    const response = await fetch("/api/admin/advertisements");
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(result.error || "تعذر تحميل الإعلانات");
      setLoading(false);
      return;
    }
    setAdvertisements(result.advertisements || []);
    setPackages(result.packages || []);
    setLoading(false);
  };

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(initialLoad);
  }, []);

  const updateAdvertisement = async (advertisement: AdminAdvertisement, changes: Record<string, unknown>) => {
    setMessage("");
    const response = await fetch("/api/admin/advertisements", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: advertisement.id,
        status: changes.status || advertisement.status,
        payment_status: changes.payment_status || advertisement.payment_status,
        featured: changes.featured ?? advertisement.featured,
        admin_note: notes[advertisement.id] ?? advertisement.admin_note ?? "",
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return setMessage(result.error || "تعذر تحديث الإعلان");
    setMessage("تم حفظ تعديلات الإعلان");
    await load();
  };

  const removeEntity = async (entity: "advertisement" | "package", id: number) => {
    if (!window.confirm(entity === "package" ? "حذف هذه الباقة؟" : "حذف الإعلان وكل بياناته؟")) return;
    const response = await fetch("/api/admin/advertisements", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity, id }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return setMessage(result.error || "تعذر الحذف");
    setMessage(entity === "package" ? "تم حذف الباقة" : "تم حذف الإعلان");
    await load();
  };

  const updatePackage = async (item: AdvertisementPackage, changes: Partial<AdvertisementPackage>) => {
    const response = await fetch("/api/admin/advertisements", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "package", id: item.id, ...changes }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return setMessage(result.error || "تعذر تعديل الباقة");
    setPackages((current) => current.map((entry) => entry.id === item.id ? { ...entry, ...result } : entry));
  };

  const addPackage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const response = await fetch("/api/admin/advertisements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(packageDraft),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return setMessage(result.error || "تعذر إضافة الباقة");
    setPackages((current) => [...current, result]);
    setPackageDraft({ name: "", duration_days: "7", price: "0" });
    setMessage("تمت إضافة الباقة");
  };

  const normalizedQuery = query.trim().toLowerCase();
  const visibleAdvertisements = advertisements.filter((advertisement) => {
    const matchesStatus = statusFilter === "الكل" || advertisement.status === statusFilter;
    const matchesQuery = !normalizedQuery || `${advertisement.title} ${advertisement.advertiser_name}`.toLowerCase().includes(normalizedQuery);
    return matchesStatus && matchesQuery;
  });
  const pendingCount = advertisements.filter((advertisement) => advertisement.status === "قيد المراجعة").length;
  const activeCount = advertisements.filter((advertisement) => advertisement.status === "مقبول").length;
  const paidCount = advertisements.filter((advertisement) => advertisement.payment_status === "تم الدفع").length;

  return (
    <section className="overflow-hidden rounded-lg border border-[#d9ded7] bg-[#fffdf9] shadow-[0_18px_45px_rgba(23,63,58,0.07)]">
      <header className="border-b border-[#e4e8e1] bg-[linear-gradient(135deg,#173f3a_0%,#24564e_64%,#b97b30_160%)] px-4 py-5 text-white sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold text-[#e6bf7e]">إدارة الإعلانات</p>
            <h2 className="mt-1 font-display text-2xl font-bold">المراجعة والتشغيل</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#d7e4df]">راجع المحتوى، أكد الدفع، تابع الأداء، واضبط النشر من مكان واحد.</p>
          </div>
          <button type="button" onClick={() => void load()} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/25 bg-white/10 px-4 text-sm font-bold text-white hover:bg-white/15">
            <RefreshCw size={16} /> تحديث البيانات
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 border-b border-[#e4e8e1] bg-white sm:grid-cols-4">
        {[
          ["كل الإعلانات", advertisements.length],
          ["بانتظار المراجعة", pendingCount],
          ["منشورة", activeCount],
          ["مدفوعة", paidCount],
        ].map(([label, value], index) => (
          <div key={String(label)} className={`px-4 py-4 ${index ? "border-r border-[#edf0eb]" : ""}`}>
            <span className="text-xs font-bold text-[#7c8782]">{label}</span>
            <strong className="mt-1 block font-display text-2xl text-[#173f3a]">{value}</strong>
          </div>
        ))}
      </div>

      <div className="p-4 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 border-b border-[#e7eae5] pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute right-3 top-3 text-[#87918d]" size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث باسم الإعلان أو المعلن" className="h-11 w-full rounded-md border border-[#d9ded7] bg-white pr-10 pl-3 text-sm outline-none focus:border-[#39704f]" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {["الكل", "قيد المراجعة", "مقبول", "متوقف", "مرفوض", "منتهي"].map((status) => (
              <button key={status} type="button" onClick={() => setStatusFilter(status)} className={`h-9 shrink-0 rounded-md px-3 text-xs font-bold ${statusFilter === status ? "bg-[#173f3a] text-white" : "border border-[#d9ded7] bg-white text-[#596963]"}`}>{status}</button>
            ))}
          </div>
        </div>

        <div className="grid gap-3">
          {visibleAdvertisements.map((advertisement) => (
            <article key={advertisement.id} className="overflow-hidden rounded-lg border border-[#dfe4dc] bg-white">
              <div className="grid lg:grid-cols-[190px_minmax(0,1fr)]">
                <div className="min-h-44 bg-[#edf1ec]">
                  {advertisement.media_type === "video" && advertisement.video_url ? (
                    <video src={advertisement.video_url} controls playsInline preload="metadata" className="h-full max-h-60 w-full object-contain" />
                  ) : advertisement.image_url ? (
                    <img src={advertisement.image_url} alt={advertisement.title} className="h-full max-h-60 w-full object-contain" />
                  ) : (
                    <div className="grid h-full min-h-44 place-items-center text-xs font-bold text-[#87918d]">إعلان نصي</div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-lg font-bold text-[#173f3a]">{advertisement.title}</h3>
                        {advertisement.featured && <span className="rounded-sm bg-[#fff1d7] px-2 py-1 text-[11px] font-bold text-[#9a651f]">مميز</span>}
                      </div>
                      <p className="mt-1 text-xs font-bold text-[#77827d]">{advertisement.advertiser_name} · إعلان #{advertisement.id}</p>
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#596963]">{advertisement.description}</p>
                    </div>
                    <span className={`shrink-0 rounded-sm px-2.5 py-1 text-xs font-bold ${advertisement.status === "مقبول" ? "bg-[#e8f4ec] text-[#39704f]" : advertisement.status === "قيد المراجعة" ? "bg-[#fff3dc] text-[#9a651f]" : "bg-[#f4e9e7] text-[#a9584d]"}`}>{advertisement.status}</span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 divide-x divide-x-reverse divide-[#e6e9e4] rounded-md border border-[#e6e9e4] bg-[#f8faf7] py-3 text-center">
                    <span><strong className="block text-base text-[#173f3a]">{advertisement.views || 0}</strong><small className="text-[#7c8782]">مشاهدة</small></span>
                    <span><strong className="block text-base text-[#173f3a]">{advertisement.clicks || 0}</strong><small className="text-[#7c8782]">نقرة</small></span>
                    <span><strong className="block text-base text-[#173f3a]">{advertisement.likes || 0}</strong><small className="text-[#7c8782]">إعجاب</small></span>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[170px_170px_minmax(220px,1fr)]">
                    <label className="grid gap-1 text-xs font-bold text-[#596963]">حالة الدفع
                      <select value={advertisement.payment_status} onChange={(event) => void updateAdvertisement(advertisement, { payment_status: event.target.value })} className="h-10 rounded-md border border-[#d9ded7] bg-white px-2 font-normal">
                        <option>غير مطلوب</option><option>قيد الانتظار</option><option>تم الدفع</option><option>مرفوض</option>
                      </select>
                    </label>
                    <label className="grid gap-1 text-xs font-bold text-[#596963]">حالة الإعلان
                      <select value={advertisement.status} onChange={(event) => void updateAdvertisement(advertisement, { status: event.target.value })} className="h-10 rounded-md border border-[#d9ded7] bg-white px-2 font-normal">
                        <option>قيد المراجعة</option><option>مقبول</option><option>متوقف</option><option>مرفوض</option><option>منتهي</option>
                      </select>
                    </label>
                    <label className="grid gap-1 text-xs font-bold text-[#596963]">ملاحظة للمعلن
                      <input value={notes[advertisement.id] ?? advertisement.admin_note ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [advertisement.id]: event.target.value }))} onBlur={() => void updateAdvertisement(advertisement, {})} placeholder="سبب الرفض أو ملاحظة المراجعة" className="h-10 rounded-md border border-[#d9ded7] bg-white px-3 font-normal outline-none focus:border-[#39704f]" />
                    </label>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#edf0eb] pt-3">
                    <button type="button" onClick={() => void updateAdvertisement(advertisement, { status: "مقبول" })} className="inline-flex h-9 items-center gap-2 rounded-md bg-[#39704f] px-3 text-xs font-bold text-white"><CheckCircle2 size={15} /> اعتماد ونشر</button>
                    <button type="button" onClick={() => void updateAdvertisement(advertisement, { featured: !advertisement.featured })} className="h-9 rounded-md border border-[#c9d1ca] px-3 text-xs font-bold text-[#173f3a]">{advertisement.featured ? "إلغاء التمييز" : "تمييز الإعلان"}</button>
                    <Link href={`/ads/${advertisement.id}`} target="_blank" className="h-9 rounded-md border border-[#c9d1ca] px-3 py-2 text-xs font-bold text-[#173f3a]">معاينة الإعلان</Link>
                    <button type="button" onClick={() => void removeEntity("advertisement", advertisement.id)} className="mr-auto inline-flex size-9 items-center justify-center rounded-md border border-[#dfbbb5] text-[#a9584d]" aria-label="حذف الإعلان" title="حذف الإعلان"><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
            </article>
          ))}
          {!loading && !visibleAdvertisements.length && <p className="rounded-md border border-dashed border-[#ccd3cc] py-10 text-center text-sm text-[#7c8782]">لا توجد إعلانات مطابقة.</p>}
          {loading && <p className="py-10 text-center text-sm text-[#7c8782]">جار تحميل الإعلانات...</p>}
        </div>

        <section className="mt-6 border-t border-[#dfe4dc] pt-6">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div><p className="text-xs font-bold text-[#b2762d]">التسعير والمدة</p><h3 className="font-display text-xl font-bold text-[#173f3a]">الباقات الإعلانية</h3></div>
            <span className="text-xs text-[#7c8782]">{packages.length} باقة</span>
          </div>
          <div className="grid gap-2">
            {packages.map((item) => (
              <div key={item.id} className="grid gap-2 rounded-md border border-[#e1e5df] bg-[#f8faf7] p-3 sm:grid-cols-[minmax(180px,1fr)_100px_120px_100px_auto_auto]">
                <input defaultValue={item.name} onBlur={(event) => void updatePackage(item, { name: event.target.value })} className="h-10 rounded-md border border-[#d9ded7] bg-white px-3 text-sm" />
                <input defaultValue={item.duration_days} type="number" min="1" onBlur={(event) => void updatePackage(item, { duration_days: Number(event.target.value) })} className="h-10 rounded-md border border-[#d9ded7] bg-white px-2 text-sm" />
                <input defaultValue={item.price} type="number" min="0" step="0.01" onBlur={(event) => void updatePackage(item, { price: Number(event.target.value) })} className="h-10 rounded-md border border-[#d9ded7] bg-white px-2 text-sm" />
                <span className="grid place-items-center text-xs font-bold text-[#596963]">{item.active ? "فعالة" : "متوقفة"}</span>
                <button type="button" onClick={() => void updatePackage(item, { active: !item.active })} className="h-10 rounded-md bg-[#173f3a] px-3 text-xs font-bold text-white">{item.active ? "إيقاف" : "تشغيل"}</button>
                <button type="button" onClick={() => void removeEntity("package", item.id)} className="grid size-10 place-items-center rounded-md border border-[#dfbbb5] text-[#a9584d]" aria-label="حذف الباقة" title="حذف الباقة"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
          <form onSubmit={addPackage} className="mt-3 grid gap-2 rounded-md border border-dashed border-[#bdc8be] p-3 sm:grid-cols-[minmax(180px,1fr)_100px_120px_auto]">
            <input required value={packageDraft.name} onChange={(event) => setPackageDraft({ ...packageDraft, name: event.target.value })} placeholder="اسم الباقة الجديدة" className="h-10 rounded-md border border-[#d9ded7] px-3 text-sm" />
            <input required type="number" min="1" value={packageDraft.duration_days} onChange={(event) => setPackageDraft({ ...packageDraft, duration_days: event.target.value })} placeholder="الأيام" className="h-10 rounded-md border border-[#d9ded7] px-2 text-sm" />
            <input required type="number" min="0" step="0.01" value={packageDraft.price} onChange={(event) => setPackageDraft({ ...packageDraft, price: event.target.value })} placeholder="السعر" className="h-10 rounded-md border border-[#d9ded7] px-2 text-sm" />
            <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#b2762d] px-4 text-sm font-bold text-white"><Plus size={16} /> إضافة باقة</button>
          </form>
        </section>

        {message && <p className="mt-4 rounded-md bg-[#eef5ef] px-3 py-2 text-center text-sm font-bold text-[#39704f]">{message}</p>}
      </div>
    </section>
  );
}

function AdvertisementsManager() {
  const [advertisements, setAdvertisements] = useState<(PublicAdvertisement & { status: string; admin_note?: string | null; payment_status: string; featured: boolean; price: number; starts_at?: string | null; ends_at?: string | null })[]>([]);
  const [packages, setPackages] = useState<{ id: number; name: string; duration_days: number; price: number; active: boolean }[]>([]);
  const [note, setNote] = useState<Record<number, string>>({});
  const [message, setMessage] = useState("");
  const [packageDraft, setPackageDraft] = useState({ name: "", duration_days: "7", price: "0" });

  const load = async () => {
    const response = await fetch("/api/admin/advertisements");
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return setMessage(result.error || "تعذر تحميل الإعلانات");
    setAdvertisements(result.advertisements || []); setPackages(result.packages || []);
  };
  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(initialLoad);
  }, []);

  const update = async (id: number, status: string, featured = false, payment_status?: string) => {
    const response = await fetch("/api/admin/advertisements", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status, featured, payment_status, admin_note: note[id] || "" }) });
    if (!response.ok) return setMessage("تعذر تحديث الإعلان");
    setAdvertisements((current) => current.map((item) => item.id === id ? { ...item, status, featured, ...(payment_status ? { payment_status } : {}), admin_note: note[id] || item.admin_note } : item));
  };

  const updatePackage = async (item: typeof packages[number], changes: Partial<typeof item>) => {
    const response = await fetch("/api/admin/advertisements", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entity: "package", id: item.id, ...changes }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return setMessage(result.error || "تعذر تعديل الباقة");
    setPackages((current) => current.map((packageItem) => packageItem.id === item.id ? { ...packageItem, ...result } : packageItem));
  };

  const deleteEntity = async (entity: "advertisement" | "package", id: number) => {
    if (!window.confirm(entity === "package" ? "حذف هذه الباقة؟" : "حذف هذا الإعلان؟")) return;
    const response = await fetch("/api/admin/advertisements", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entity, id }) });
    if (!response.ok) return setMessage("تعذر الحذف");
    if (entity === "package") setPackages((current) => current.filter((item) => item.id !== id));
    else setAdvertisements((current) => current.filter((item) => item.id !== id));
  };

  const addPackage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const response = await fetch("/api/admin/advertisements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(packageDraft) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return setMessage(result.error || "تعذر إضافة الباقة");
    setPackages((current) => [...current, result]);
    setPackageDraft({ name: "", duration_days: "7", price: "0" });
  };

  return (
    <section className="grid gap-5">
      <div className="rounded-2xl border border-[#e0e1d9] bg-[#fffdf9] p-5"><div className="mb-4"><p className="text-sm font-semibold text-[#c48738]">مراجعة ونشر</p><h2 className="font-display text-2xl font-bold text-[#173f3a]">الإعلانات العامة</h2></div><div className="grid gap-3">{advertisements.map((advertisement) => <article key={advertisement.id} className="grid gap-3 rounded-xl border border-[#e7e7df] bg-white p-4 lg:grid-cols-[1fr_180px_180px]"><div><p className="font-bold text-[#173f3a]">{advertisement.title}</p><p className="mt-1 text-xs text-[#72807a]">{advertisement.advertiser_name} | {advertisement.payment_status}</p><p className="mt-2 text-sm leading-6 text-[#596963]">{advertisement.description}</p><textarea value={note[advertisement.id] ?? advertisement.admin_note ?? ""} onChange={(event) => setNote((current) => ({ ...current, [advertisement.id]: event.target.value }))} placeholder="ملاحظة للمعلن" className="mt-2 min-h-16 w-full rounded-lg border border-[#dedfd8] p-2 text-xs outline-none" /></div><div className="grid content-start gap-2"><span className="rounded-lg bg-[#eef0ea] px-3 py-2 text-center text-xs font-bold text-[#596963]">{advertisement.status}</span><button onClick={() => void update(advertisement.id, "مقبول", advertisement.featured)} className="h-9 rounded-lg bg-[#39704f] text-xs font-bold text-white">موافقة</button><button onClick={() => void update(advertisement.id, "مرفوض")} className="h-9 rounded-lg bg-[#a9584d] text-xs font-bold text-white">رفض</button></div><div className="grid content-start gap-2"><label className="flex items-center gap-2 text-xs font-bold text-[#596963]"><input type="checkbox" checked={advertisement.featured} onChange={(event) => void update(advertisement.id, advertisement.status, event.target.checked)} /> إعلان مميز عند الدخول</label>{advertisement.image_url && <a href={advertisement.image_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-[#173f3a] underline">عرض الصورة</a>}</div></article>)}{!advertisements.length && <p className="py-10 text-center text-sm text-[#89918c]">لا توجد إعلانات مرسلة.</p>}</div></div>
      <div className="rounded-2xl border border-[#e0e1d9] bg-[#fffdf9] p-5"><h2 className="font-display text-xl font-bold text-[#173f3a]">الباقات الحالية</h2><div className="mt-3 grid gap-2 sm:grid-cols-3">{packages.map((item) => <div key={item.id} className="rounded-xl bg-[#f7faf6] p-3 text-sm font-bold">{item.name}<span className="mt-1 block text-xs text-[#72807a]">{item.duration_days} يوم | {item.price} جنيه</span></div>)}</div><form onSubmit={addPackage} className="mt-4 grid gap-2 sm:grid-cols-[1fr_120px_120px_auto]"><input required value={packageDraft.name} onChange={(event) => setPackageDraft({ ...packageDraft, name: event.target.value })} placeholder="اسم الباقة" className="h-10 rounded-lg border border-[#dedfd8] px-3 text-sm outline-none" /><input required type="number" min="1" value={packageDraft.duration_days} onChange={(event) => setPackageDraft({ ...packageDraft, duration_days: event.target.value })} placeholder="الأيام" className="h-10 rounded-lg border border-[#dedfd8] px-3 text-sm outline-none" /><input required type="number" min="0" step="0.01" value={packageDraft.price} onChange={(event) => setPackageDraft({ ...packageDraft, price: event.target.value })} placeholder="السعر" className="h-10 rounded-lg border border-[#dedfd8] px-3 text-sm outline-none" /><button className="h-10 rounded-lg bg-[#173f3a] px-4 text-sm font-bold text-white">إضافة باقة</button></form></div>
      {message && <p className="text-center text-sm font-semibold text-[#a9584d]">{message}</p>}
    </section>
  );
}

function AdvertisementOperations() {
  const [items, setItems] = useState<Array<{ id: number; title: string; status: string; payment_status: string; featured: boolean; media_type?: string; image_url?: string | null; video_url?: string | null; views?: number; clicks?: number; likes?: number }>>([]);
  const [packages, setPackages] = useState<Array<{ id: number; name: string; duration_days: number; price: number; active: boolean }>>([]);
  const [message, setMessage] = useState("");

  const load = async () => {
    const response = await fetch("/api/admin/advertisements");
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return setMessage(result.error || "تعذر تحميل أدوات التحكم");
    setItems(result.advertisements || []); setPackages(result.packages || []);
  };
  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(initialLoad);
  }, []);

  const patch = async (body: Record<string, unknown>) => {
    const response = await fetch("/api/admin/advertisements", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return setMessage(result.error || "تعذر تنفيذ العملية");
    await load();
  };

  const remove = async (entity: "advertisement" | "package", id: number) => {
    if (!window.confirm(entity === "package" ? "حذف الباقة؟" : "حذف الإعلان؟")) return;
    const response = await fetch("/api/admin/advertisements", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entity, id }) });
    if (!response.ok) return setMessage("تعذر الحذف");
    await load();
  };

  return (
    <section className="rounded-2xl border border-[#e0e1d9] bg-[#fffdf9] p-5">
      <div className="mb-4"><p className="text-sm font-semibold text-[#c48738]">تحكم سريع</p><h2 className="font-display text-xl font-bold text-[#173f3a]">الدفع والتشغيل والباقات</h2></div>
      <div className="mb-3 grid gap-2 sm:grid-cols-2">{items.map((item) => <div key={`stats-${item.id}`} className="rounded-lg bg-[#f7faf6] px-3 py-2 text-xs font-bold text-[#72807a]">{item.title}: مشاهدات {item.views || 0} | نقرات {item.clicks || 0} | إعجابات {item.likes || 0}</div>)}</div>
      <div className="grid gap-2">{items.map((item) => <div key={item.id} className="grid gap-2 rounded-xl border border-[#e7e7df] bg-white p-3 sm:grid-cols-[minmax(180px,1fr)_150px_150px_auto]"><div><span className="text-sm font-bold text-[#173f3a]">{item.title}</span>{item.media_type === "video" && item.video_url ? <video src={item.video_url} controls playsInline className="mt-2 max-h-32 w-full rounded-lg object-contain" /> : item.image_url && <img src={item.image_url} alt="" className="mt-2 max-h-32 w-full rounded-lg object-contain" />}</div><select value={item.payment_status} onChange={(event) => void patch({ id: item.id, status: item.status, payment_status: event.target.value, featured: item.featured })} className="h-9 rounded-lg border border-[#dedfd8] px-2 text-xs"><option>غير مطلوب</option><option>قيد الانتظار</option><option>تم الدفع</option><option>مرفوض</option></select><select value={item.status} onChange={(event) => void patch({ id: item.id, status: event.target.value, payment_status: item.payment_status, featured: item.featured })} className="h-9 rounded-lg border border-[#dedfd8] px-2 text-xs"><option>قيد المراجعة</option><option>مقبول</option><option>متوقف</option><option>مرفوض</option><option>منتهي</option></select><button type="button" onClick={() => void remove("advertisement", item.id)} className="h-9 rounded-lg border border-[#a9584d] px-3 text-xs font-bold text-[#a9584d]">حذف</button></div>)}</div>
      <div className="mt-5 grid gap-2">{packages.map((item) => <div key={item.id} className="grid gap-2 rounded-xl border border-[#e7e7df] bg-[#f7faf6] p-3 sm:grid-cols-[1fr_100px_100px_110px_auto_auto]"><input defaultValue={item.name} onBlur={(event) => void patch({ entity: "package", id: item.id, name: event.target.value })} className="h-9 rounded-lg border border-[#dedfd8] px-2 text-xs" /><input defaultValue={item.duration_days} type="number" min="1" onBlur={(event) => void patch({ entity: "package", id: item.id, duration_days: Number(event.target.value) })} className="h-9 rounded-lg border border-[#dedfd8] px-2 text-xs" /><input defaultValue={item.price} type="number" min="0" step="0.01" onBlur={(event) => void patch({ entity: "package", id: item.id, price: Number(event.target.value) })} className="h-9 rounded-lg border border-[#dedfd8] px-2 text-xs" /><span className="grid place-items-center text-xs font-bold">{item.active ? "فعالة" : "متوقفة"}</span><button type="button" onClick={() => void patch({ entity: "package", id: item.id, active: !item.active })} className="h-9 rounded-lg bg-[#173f3a] px-3 text-xs font-bold text-white">{item.active ? "إيقاف" : "تشغيل"}</button><button type="button" onClick={() => void remove("package", item.id)} className="h-9 rounded-lg border border-[#a9584d] px-3 text-xs font-bold text-[#a9584d]">حذف</button></div>)}</div>
      {message && <p className="mt-3 text-center text-sm font-bold text-[#a9584d]">{message}</p>}
    </section>
  );
}

type RewardCampaignStats = {
  audience_count: number;
  audience_interaction_count: number;
  interaction_count: number;
  participant_count: number;
  pending_amount: number;
  approved_amount: number;
  pending_points: number;
  approved_points: number;
  current_entitlement: number;
  estimated_share: number | null;
};

function RewardCampaignManager() {
  const [campaigns, setCampaigns] = useState<Array<{ id: number; advertisement_id: number; name: string; reward_mode: string; budget: number; max_recipients: number | null; per_user_limit: number; status: string; advertisements?: { title?: string }; stats?: RewardCampaignStats }>>([]);
  const [advertisements, setAdvertisements] = useState<Array<{ id: number; title: string }>>([]);
  const [draft, setDraft] = useState({ advertisement_id: "", name: "", reward_mode: "points", budget: "0", max_recipients: "", per_user_limit: "1", action_type: "referral", reward_points: "1", reward_amount: "0", required_seconds: "" });
  const [message, setMessage] = useState("");
  const [rewards, setRewards] = useState<Array<{ id: number; status: string; points: number; amount: number; reason?: string | null; created_at: string; market_users?: { display_name?: string; phone?: string }; ad_reward_campaigns?: { name?: string } }>>([]);
  const [selectedRewardIds, setSelectedRewardIds] = useState<number[]>([]);
  const [withdrawals, setWithdrawals] = useState<Array<{ id: number; amount: number; wallet_number: string; status: string; created_at: string; market_users?: { display_name?: string; phone?: string } }>>([]);

  const load = async () => {
    const response = await fetch("/api/admin/reward-campaigns");
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return setMessage(result.error || "تعذر تحميل الحملات");
    setCampaigns(result.campaigns || []); setAdvertisements(result.advertisements || []);
    const rewardResponse = await fetch("/api/admin/reward-ledger");
    const rewardResult = await rewardResponse.json().catch(() => ({}));
    if (rewardResponse.ok) {
      setRewards(rewardResult.rewards || []);
      setSelectedRewardIds([]);
    }
    const withdrawalResponse = await fetch("/api/admin/withdrawals");
    const withdrawalResult = await withdrawalResponse.json().catch(() => ({}));
    if (withdrawalResponse.ok) setWithdrawals(withdrawalResult.withdrawals || []);
  };
  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(initialLoad);
  }, []);

  const createCampaign = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const response = await fetch("/api/admin/reward-campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return setMessage(result.error || "تعذر إنشاء الحملة");
    setDraft({ advertisement_id: "", name: "", reward_mode: "points", budget: "0", max_recipients: "", per_user_limit: "1", action_type: "referral", reward_points: "1", reward_amount: "0", required_seconds: "" }); await load();
  };

  const changeStatus = async (id: number, status: string) => {
    const response = await fetch("/api/admin/reward-campaigns", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    if (!response.ok) return setMessage("تعذر تغيير حالة الحملة");
    await load();
  };

  const changeRewardStatus = async (id: number, status: string) => {
    const response = await fetch("/api/admin/reward-ledger", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return setMessage(result.error || "تعذر تحديث المكافأة");
    setMessage("");
    await load();
  };

  const pendingRewards = rewards.filter((reward) => reward.status === "pending");
  const allPendingRewardsSelected = pendingRewards.length > 0 && pendingRewards.every((reward) => selectedRewardIds.includes(reward.id));

  const toggleRewardSelection = (id: number) => {
    setSelectedRewardIds((current) => current.includes(id) ? current.filter((rewardId) => rewardId !== id) : [...current, id]);
  };

  const toggleAllPendingRewards = () => {
    setSelectedRewardIds(allPendingRewardsSelected ? [] : pendingRewards.map((reward) => reward.id));
  };

  const approveSelectedRewards = async () => {
    if (!selectedRewardIds.length) return;
    setMessage("");
    const results = await Promise.all(selectedRewardIds.map(async (id) => {
      const response = await fetch("/api/admin/reward-ledger", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: "approved" }) });
      const result = await response.json().catch(() => ({}));
      return { ok: response.ok, error: result.error as string | undefined };
    }));
    const failed = results.find((result) => !result.ok);
    if (failed) setMessage(failed.error || "تعذر اعتماد بعض المكافآت");
    else setMessage(`تم اعتماد ${selectedRewardIds.length} مكافأة`);
    await load();
  };

  const changeWithdrawalStatus = async (id: number, status: string) => {
    const response = await fetch("/api/admin/withdrawals", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return setMessage(result.error || "تعذر تحديث طلب السحب");
    await load();
  };

  return (
    <section className="reward-campaign-manager rounded-2xl border border-[#e0e1d9] bg-[#fffdf9] p-5">
      <div className="mb-4"><p className="text-sm font-semibold text-[#c48738]">مراجعة حملات المعلنين</p><h2 className="font-display text-xl font-bold text-[#173f3a]">حملات المكافآت</h2><p className="mt-1 text-xs leading-5 text-[#72807a]">ينشئ المعلن حملته مع إعلانه، ودور الإدارة مراجعتها وتفعيلها أو إيقافها فقط.</p></div>
      <form onSubmit={createCampaign} className="grid gap-2 rounded-xl bg-[#f7faf6] p-3 sm:grid-cols-[1fr_1.2fr_120px_120px_120px_120px_120px_120px_auto]"><select required value={draft.advertisement_id} onChange={(event) => setDraft({ ...draft, advertisement_id: event.target.value })} className="h-10 rounded-lg border border-[#dedfd8] bg-white px-2 text-xs"><option value="">اختر الإعلان</option>{advertisements.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select><input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="اسم الحملة" className="h-10 rounded-lg border border-[#dedfd8] bg-white px-2 text-xs" /><select value={draft.reward_mode} onChange={(event) => setDraft({ ...draft, reward_mode: event.target.value })} className="h-10 rounded-lg border border-[#dedfd8] bg-white px-2 text-xs"><option value="points">نقاط</option><option value="discount">خصم</option><option value="gift">هدية</option><option value="cash">نقدي معلق</option></select><select value={draft.action_type} onChange={(event) => setDraft({ ...draft, action_type: event.target.value })} className="h-10 rounded-lg border border-[#dedfd8] bg-white px-2 text-xs"><option value="referral">إحالة</option><option value="view">مشاهدة</option><option value="like">إعجاب</option><option value="share">مشاركة</option></select><input required type="number" min="0" value={draft.reward_points} onChange={(event) => setDraft({ ...draft, reward_points: event.target.value })} placeholder="النقاط" className="h-10 rounded-lg border border-[#dedfd8] bg-white px-2 text-xs" /><input required type="number" min="0" step="0.01" value={draft.reward_amount} onChange={(event) => setDraft({ ...draft, reward_amount: event.target.value })} placeholder="المبلغ" className="h-10 rounded-lg border border-[#dedfd8] bg-white px-2 text-xs" /><input required type="number" min="0" step="1" value={draft.budget} onChange={(event) => setDraft({ ...draft, budget: event.target.value })} placeholder="الميزانية" className="h-10 rounded-lg border border-[#dedfd8] bg-white px-2 text-xs" /><input type="number" min="1" value={draft.max_recipients} onChange={(event) => setDraft({ ...draft, max_recipients: event.target.value })} placeholder="عدد المستفيدين" className="h-10 rounded-lg border border-[#dedfd8] bg-white px-2 text-xs" /><button className="h-10 rounded-lg bg-[#173f3a] px-3 text-xs font-bold text-white">إنشاء</button></form>
      <div className="mt-4 grid gap-2">{campaigns.map((campaign) => <div key={campaign.id} className="rounded-xl border border-[#e7e7df] bg-white p-3"><div className="grid gap-2 sm:grid-cols-[1fr_110px_110px_150px_auto]"><div><p className="text-sm font-bold text-[#173f3a]">{campaign.name}</p><p className="text-xs text-[#72807a]">{campaign.advertisements?.title || `إعلان #${campaign.advertisement_id}`} | ميزانية {campaign.budget}</p></div><span className="grid place-items-center text-xs font-bold text-[#c48738]">{campaign.reward_mode}</span><span className="grid place-items-center text-xs font-bold text-[#596963]">{campaign.status}</span><span className="grid place-items-center text-xs text-[#72807a]">حد المستفيدين: {campaign.max_recipients || "مفتوح"}</span><select value={campaign.status} onChange={(event) => void changeStatus(campaign.id, event.target.value)} className="h-9 rounded-lg border border-[#dedfd8] px-2 text-xs"><option value="draft">مسودة</option><option value="active">تفعيل</option><option value="paused">إيقاف مؤقت</option><option value="completed">مكتملة</option><option value="closed">إغلاق</option></select></div>{campaign.stats && <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#eef0ea] pt-3 text-center text-xs sm:grid-cols-3 lg:grid-cols-6"><span><strong className="block text-[#173f3a]">{campaign.stats.participant_count}</strong><span className="text-[#72807a]">الأشخاص</span></span><span><strong className="block text-[#173f3a]">{campaign.stats.interaction_count}</strong><span className="text-[#72807a]">تفاعل مؤهل</span></span><span><strong className="block text-[#c48738]">{campaign.stats.current_entitlement} جنيه</strong><span className="text-[#72807a]">المستحق الحالي</span></span><span><strong className="block text-[#596963]">{campaign.stats.pending_amount} جنيه / {campaign.stats.pending_points} نقطة</strong><span className="text-[#72807a]">معلّق</span></span><span><strong className="block text-[#39704f]">{campaign.stats.approved_amount} جنيه / {campaign.stats.approved_points} نقطة</strong><span className="text-[#72807a]">معتمد</span></span>{campaign.stats.estimated_share !== null && <span><strong className="block text-[#a9584d]">{campaign.stats.estimated_share} جنيه</strong><span className="text-[#72807a]">النصيب التقديري للتفاعل</span></span>}</div>}</div>)}{!campaigns.length && <p className="py-6 text-center text-sm text-[#89918c]">لا توجد حملات مكافآت.</p>}</div>
      <div className="mt-5 rounded-xl border border-[#e7e7df] bg-[#f7faf6] p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 font-bold text-[#173f3a]">
            <input type="checkbox" checked={allPendingRewardsSelected} onChange={toggleAllPendingRewards} disabled={!pendingRewards.length} className="size-4 accent-[#39704f]" />
            تحديد الكل
          </label>
          <button type="button" onClick={() => void approveSelectedRewards()} disabled={!selectedRewardIds.length} className="h-9 rounded-lg bg-[#39704f] px-4 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-45">اعتماد المحدد ({selectedRewardIds.length})</button>
        </div>
        <div className="mt-3 max-h-[45rem] overflow-y-auto overscroll-contain pl-1">
          <div className="grid gap-2">
            {pendingRewards.map((reward) => (
              <div key={reward.id} className="grid min-h-16 gap-2 rounded-lg bg-white p-3 text-xs sm:grid-cols-[28px_1fr_100px_100px_auto_auto] sm:items-center">
                <input type="checkbox" checked={selectedRewardIds.includes(reward.id)} onChange={() => toggleRewardSelection(reward.id)} aria-label={`تحديد مكافأة ${reward.market_users?.display_name || "المستخدم"}`} className="size-4 accent-[#39704f]" />
                <div><strong>{reward.market_users?.display_name || "مستخدم"}</strong><span className="mr-2 text-[#72807a]">{reward.market_users?.phone || ""}</span><p className="mt-1 text-[#72807a]">{reward.reason || "مكافأة حملة"}</p></div>
                <span className="grid place-items-center font-bold">{reward.points} نقطة</span>
                <span className="grid place-items-center font-bold text-[#c48738]">{reward.amount} جنيه</span>
                <button type="button" onClick={() => void changeRewardStatus(reward.id, "approved")} className="h-9 rounded-lg bg-[#39704f] px-3 font-bold text-white">اعتماد</button>
                <button type="button" onClick={() => void changeRewardStatus(reward.id, "rejected")} className="h-9 rounded-lg bg-[#a9584d] px-3 font-bold text-white">رفض</button>
              </div>
            ))}
            {!pendingRewards.length && <p className="py-4 text-center text-xs text-[#89918c]">لا توجد مكافآت معلقة.</p>}
          </div>
        </div>
      </div>
      <div className="mt-5 rounded-xl border border-[#e7e7df] bg-[#f7faf6] p-3"><h3 className="font-bold text-[#173f3a]">طلبات سحب الأرباح</h3><div className="mt-2 grid gap-2">{withdrawals.map((withdrawal) => <div key={withdrawal.id} className="grid gap-2 rounded-lg bg-white p-3 text-xs sm:grid-cols-[1fr_110px_130px_110px_auto]"><div><strong>{withdrawal.market_users?.display_name || "مستخدم"}</strong><span className="mr-2 text-[#72807a]">{withdrawal.market_users?.phone || ""}</span><p className="mt-1 text-[#72807a]">{new Date(withdrawal.created_at).toLocaleString("ar-EG")}</p></div><span className="grid place-items-center font-bold text-[#c48738]">{withdrawal.amount} جنيه</span><span className="grid place-items-center font-bold">{withdrawal.wallet_number}</span><span className="grid place-items-center font-bold text-[#596963]">{withdrawal.status === "pending" ? "قيد المراجعة" : withdrawal.status === "approved" ? "معتمد" : withdrawal.status === "paid" ? "تم الإرسال" : "مرفوض"}</span><div className="flex gap-1">{withdrawal.status === "pending" && <button onClick={() => void changeWithdrawalStatus(withdrawal.id, "approved")} className="h-9 rounded-lg bg-[#39704f] px-3 font-bold text-white">اعتماد</button>}{withdrawal.status === "approved" && <button onClick={() => void changeWithdrawalStatus(withdrawal.id, "paid")} className="h-9 rounded-lg bg-[#173f3a] px-3 font-bold text-white">تم الإرسال</button>}{["pending", "approved"].includes(withdrawal.status) && <button onClick={() => void changeWithdrawalStatus(withdrawal.id, "rejected")} className="h-9 rounded-lg bg-[#a9584d] px-3 font-bold text-white">رفض</button>}</div></div>)}{!withdrawals.length && <p className="py-4 text-center text-xs text-[#89918c]">لا توجد طلبات سحب.</p>}</div></div>
      {message && <p className="mt-3 text-center text-sm font-bold text-[#a9584d]">{message}</p>}
    </section>
  );
}

function SellersManager() {
  const [offers, setOffers] = useState<SellerOffer[]>([]);
  const [traders, setTraders] = useState<MarketTrader[]>([]);
  const [selectedTraders, setSelectedTraders] = useState<Record<number, number[]>>({});
  const [stats, setStats] = useState({ visitor_count: 0, submission_count: 0 });
  const [statusFilter, setStatusFilter] = useState("الكل");
  const [message, setMessage] = useState("");

  const load = async () => {
    const response = await fetch("/api/admin/sellers");
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return setMessage(result.error || "تعذر تحميل عروض البائعين");
    setOffers(result.offers || []);
    setTraders(result.traders || []);
    setStats(result.stats || { visitor_count: 0, submission_count: 0 });
  };

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(initialLoad);
  }, []);

  const updateStatus = async (id: number, status: SellerOffer["status"]) => {
    const response = await fetch("/api/admin/sellers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, trader_ids: selectedTraders[id] || [] }),
    });
    if (!response.ok) return setMessage("تعذر تحديث حالة العرض");
    setOffers((current) => current.map((offer) => offer.id === id ? { ...offer, status } : offer));
  };

  const visibleOffers = offers.filter((offer) => statusFilter === "الكل" || offer.status === statusFilter);

  return (
    <section className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#d8dfd6] bg-[#fffdf9] p-4"><p className="text-xs font-bold text-[#89918c]">زوار صفحة البيع</p><strong className="mt-1 block font-display text-3xl text-[#173f3a]">{stats.visitor_count}</strong></div>
        <div className="rounded-2xl border border-[#d8dfd6] bg-[#fffdf9] p-4"><p className="text-xs font-bold text-[#89918c]">العروض المرسلة</p><strong className="mt-1 block font-display text-3xl text-[#c48738]">{stats.submission_count}</strong></div>
        <div className="rounded-2xl border border-[#d8dfd6] bg-[#fffdf9] p-4"><p className="text-xs font-bold text-[#89918c]">العروض الجديدة</p><strong className="mt-1 block font-display text-3xl text-[#39704f]">{offers.filter((offer) => offer.status === "جديد").length}</strong></div>
      </div>
      <div className="rounded-2xl border border-[#e0e1d9] bg-[#fffdf9] p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-sm font-semibold text-[#c48738]">توريد وشراء</p><h2 className="font-display text-2xl font-bold text-[#173f3a]">البائعون</h2></div>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="select-with-arrow h-10 rounded-xl border border-[#dedfd8] bg-white px-3 text-sm outline-none focus:border-[#173f3a]"><option>الكل</option><option>جديد</option><option>قيد المراجعة</option><option>تم التواصل</option><option>مهتم وجار التواصل</option><option>تم الشراء</option><option>مرفوض</option></select>
        </div>
        <div className="grid gap-3">
          {visibleOffers.map((offer) => (
            <article key={offer.id} className="grid gap-3 rounded-xl border border-[#e7e7df] bg-white p-4 lg:grid-cols-[1fr_1fr_1fr_160px] lg:items-center">
              <div><h3 className="font-bold text-[#173f3a]">{offer.item_name} <span className="text-sm text-[#c48738]">× {offer.quantity}</span></h3><p className="mt-1 text-sm font-semibold text-[#596963]">{offer.seller_name}</p><p className="text-xs text-[#89918c]">{offer.phone} | {offer.address}</p></div>
              <div className="text-sm text-[#596963]"><p>العمر/الوزن: <strong>{offer.age_or_weight || "-"}</strong></p><p>السعر: <strong className="text-[#c48738]">{offer.price} جنيه</strong></p><p className="text-xs text-[#89918c]">{formatOrderDate(offer.created_at)}</p></div>
              <div>{offer.image_url ? <a href={offer.image_url} target="_blank" rel="noreferrer" className="text-sm font-bold text-[#173f3a] underline">عرض صورة المنتج</a> : <span className="text-xs text-[#89918c]">بدون صورة</span>}</div>
              <div><select value={offer.status} onChange={(event) => void updateStatus(offer.id, event.target.value as SellerOffer["status"])} className="select-with-arrow h-10 w-full rounded-xl border border-[#dedfd8] bg-[#fff0d4] px-2 text-xs font-bold text-[#a66c20] outline-none"><option>جديد</option><option>قيد المراجعة</option><option>تم التواصل</option><option>مهتم وجار التواصل</option><option>تم الشراء</option><option>مرفوض</option></select><textarea defaultValue={offer.admin_note || ""} onBlur={(event) => { if (event.target.value !== (offer.admin_note || "")) void fetch("/api/admin/sellers", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: offer.id, status: offer.status, note: event.target.value }) }); }} placeholder="ملاحظة للبائع" className="mt-2 min-h-16 w-full rounded-lg border border-[#dedfd8] p-2 text-xs outline-none" />{offer.visibility !== "admin_only" && traders.length > 0 && <div className="mt-2 rounded-lg bg-[#f7faf6] p-2 text-xs"><p className="mb-1 font-bold text-[#173f3a]">إرسال لتجار</p><label className="mb-1 flex items-center gap-2 font-bold"><input type="checkbox" checked={(selectedTraders[offer.id] || []).length === traders.length} onChange={(event) => setSelectedTraders((current) => ({ ...current, [offer.id]: event.target.checked ? traders.map((trader) => trader.id) : [] }))} /> تحديد الكل</label>{traders.map((trader) => <label key={trader.id} className="flex items-center gap-2"><input type="checkbox" checked={(selectedTraders[offer.id] || []).includes(trader.id)} onChange={(event) => setSelectedTraders((current) => ({ ...current, [offer.id]: event.target.checked ? [...(current[offer.id] || []), trader.id] : (current[offer.id] || []).filter((id) => id !== trader.id) }))} /> {trader.display_name}</label>)}<button type="button" onClick={() => void updateStatus(offer.id, offer.status)} className="mt-2 h-8 w-full rounded-lg bg-[#173f3a] text-[11px] font-bold text-white">حفظ وإرسال العرض</button></div>}</div>
            </article>
          ))}
          {!visibleOffers.length && <p className="rounded-xl border border-dashed border-[#dedfd8] py-10 text-center text-sm text-[#89918c]">لا توجد عروض بهذا الفلتر.</p>}
        </div>
        {message && <p className="mt-4 text-center text-sm font-semibold text-[#a9584d]">{message}</p>}
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
          كل كام حالة &quot;تم&quot; يستحق الموظف مكافأة
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
        <label className="flex items-center gap-3 rounded-xl border border-[#dedfd8] bg-[#f7f7f2] p-3 text-sm font-semibold sm:col-span-2">
          <input
            type="checkbox"
            checked={draft.show_target_to_staff !== false}
            onChange={(event) => setDraft({ ...draft, show_target_to_staff: event.target.checked })}
            className="size-4 accent-[#173f3a]"
          />
          إظهار نتائج التارجيت للموظفين
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
