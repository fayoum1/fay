"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Suspense } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock3,
  Coins,
  Eye,
  Heart,
  Home,
  ImagePlus,
  LogIn,
  LogOut,
  Menu,
  X,
  Megaphone,
  MousePointerClick,
  Smartphone,
  Store,
  Users,
  WalletCards,
} from "lucide-react";

type RewardRow = {
  id: number;
  campaign_id: number;
  status: string;
  points: number | null;
  amount: number | null;
  reason?: string | null;
  created_at: string;
};

type SaleItem = { id: number; name: string; category: string };
type SaleStats = { visitor_count: number; submission_count: number };
type MarketUser = {
  display_name: string;
  phone: string;
  role: string;
  account_type?: "ordinary" | "market";
  receive_offers: boolean;
  referral_code?: string | null;
  profile_image_url?: string | null;
  wallet_number?: string | null;
};
type Withdrawal = {
  id: number;
  amount: number;
  wallet_number: string;
  status: "pending" | "approved" | "paid" | "rejected";
  admin_note?: string | null;
  created_at: string;
};
type Offer = {
  id: number;
  item_name: string;
  quantity: number;
  price: number;
  image_url?: string | null;
  status: string;
  admin_note?: string | null;
  visibility: string;
  created_at: string;
};
type Ad = {
  id: number;
  advertiser_name: string;
  title: string;
  description?: string | null;
  media_type: string;
  image_url?: string | null;
  video_url?: string | null;
  target_url?: string | null;
  whatsapp?: string | null;
  is_owner?: boolean;
  stats?: {
    views: number;
    clicks: number;
    likes: number;
    referrals: number;
  };
  reward_campaigns?: Array<{
    id: number;
    name: string;
    reward_mode: string;
    budget: number;
    status: string;
    stats: {
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
  }>;
};
type AdPackage = {
  id: number;
  name: string;
  duration_days: number;
  price: number;
};

const roleLabels: Record<string, string> = {
  farm_owner: "صاحب مزرعة",
  trader: "تاجر",
  supplier: "مورد",
};

function getMediaDimensions(file: File) {
  return new Promise<{ width: number; height: number } | null>((resolve) => {
    const url = URL.createObjectURL(file);
    const element = file.type.startsWith("video/")
      ? document.createElement("video")
      : document.createElement("img");
    element.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: (element as HTMLImageElement).naturalWidth,
        height: (element as HTMLImageElement).naturalHeight,
      });
    };
    if (element instanceof HTMLVideoElement)
      element.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve({ width: element.videoWidth, height: element.videoHeight });
      };
    element.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    element.src = url;
  });
}

function PublicAdGallery({ advertisements }: { advertisements: Ad[] }) {
  return (
    <section className="mt-6 rounded-2xl border border-[#e0e1d9] bg-[#f7faf6] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-[#173f3a]">
          الإعلانات المقبولة
        </h2>
        <span className="text-xs text-[#89918c]">إعلانات ممولة</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {advertisements.map((advertisement) => (
          <Link
            href={`/ads/${advertisement.id}`}
            key={advertisement.id}
            className="overflow-hidden rounded-xl border border-[#e7e7df] bg-white"
          >
            {advertisement.media_type === "video" && advertisement.video_url ? (
              <video
                src={advertisement.video_url}
                muted
                playsInline
                className="h-36 w-full object-cover"
              />
            ) : (
              advertisement.image_url && (
                <img
                  src={advertisement.image_url}
                  alt=""
                  className="h-36 w-full object-cover"
                />
              )
            )}
            <div className="p-3">
              <p className="font-bold text-[#173f3a]">{advertisement.title}</p>
              <p className="mt-1 text-sm leading-6 text-[#72807a]">
                {advertisement.description}
              </p>
              <span className="mt-2 inline-block text-xs font-bold text-[#c48738]">
                عرض ملف المعلن
              </span>
            </div>
          </Link>
        ))}
        {!advertisements.length && (
          <p className="py-8 text-center text-sm text-[#89918c]">
            لا توجد إعلانات مقبولة حاليًا.
          </p>
        )}
      </div>
    </section>
  );
}

function MobileMenu({
  open,
  onClose,
  user,
  onLogout,
  onAccount,
  onProfileImage,
}: {
  open: boolean;
  onClose: () => void;
  user: MarketUser | null;
  onLogout: () => void;
  onAccount: (type: "ordinary" | "market") => void;
  onProfileImage: (file: File) => void;
}) {
  if (!open) return null;
  return (
    <div className="absolute left-3 right-3 top-14 z-50 rounded-xl border border-[#dedfd8] bg-white p-2 text-right shadow-xl sm:hidden">
      <div className="mb-2 flex items-center justify-between border-b border-[#eef0ea] px-2 pb-2">
        <strong className="text-sm text-[#173f3a]">القائمة</strong>
        <button type="button" onClick={onClose} aria-label="إغلاق القائمة">
          <X size={18} />
        </button>
      </div>
      <Link
        href="/"
        onClick={onClose}
        className="flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-bold text-[#173f3a] hover:bg-[#f7faf6]"
      >
        <Home size={17} /> الرئيسية
      </Link>
      {user ? (
        <>
          <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm font-bold text-[#173f3a] hover:bg-[#f7faf6]">
            <ImagePlus size={17} /> تغيير صورة البروفايل
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  onProfileImage(file);
                  onClose();
                }
              }}
            />
          </label>
          <button
            type="button"
            onClick={onLogout}
            className="flex h-10 w-full items-center gap-2 rounded-lg px-3 text-sm font-bold text-[#a9584d] hover:bg-[#fff5f5]"
          >
            <LogOut size={17} /> خروج
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => onAccount("ordinary")}
            className="flex h-10 w-full items-center gap-2 rounded-lg px-3 text-sm font-bold text-[#173f3a] hover:bg-[#f7faf6]"
          >
            <LogIn size={17} /> حساب المكافآت
          </button>
          <button
            type="button"
            onClick={() => onAccount("market")}
            className="flex h-10 w-full items-center gap-2 rounded-lg px-3 text-sm font-bold text-[#173f3a] hover:bg-[#f7faf6]"
          >
            <Store size={17} /> حساب السوق
          </button>
        </>
      )}
    </div>
  );
}

function SellPageContent() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"offer" | "ads">("ads");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [createMode, setCreateMode] = useState<"offer" | "ad" | null>(null);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [stats, setStats] = useState<SaleStats>({
    visitor_count: 0,
    submission_count: 0,
  });
  const [user, setUser] = useState<MarketUser | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [rewardSummary, setRewardSummary] = useState({
    points: 0,
    amount: 0,
    pending: 0,
    pending_points: 0,
    pending_amount: 0,
    available_balance: 0,
    minimum_withdrawal: 500,
  });
  const [rewards, setRewards] = useState<RewardRow[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [walletNumber, setWalletNumber] = useState("");
  const [showWallet, setShowWallet] = useState(false);
  const [walletFeedback, setWalletFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [advertisements, setAdvertisements] = useState<Ad[]>([]);
  const [packages, setPackages] = useState<AdPackage[]>([]);
  const [authMode, setAuthMode] = useState<"register" | "login">("register");
  const [accountType, setAccountType] = useState<"ordinary" | "market">(
    "ordinary",
  );
  const [auth, setAuth] = useState({
    display_name: "",
    phone: "",
    password: "",
    role: "supplier",
    receive_offers: false,
  });
  const [form, setForm] = useState({
    seller_name: "",
    phone: "",
    address: "",
    item_name: "",
    quantity: "",
    age_or_weight: "",
    price: "",
    visibility: "admin_only",
  });
  const [customItemName, setCustomItemName] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [adForm, setAdForm] = useState({
    title: "",
    description: "",
    media_type: "text",
    target_url: "",
    whatsapp: "",
    package_id: "",
    reward_enabled: false,
    reward_mode: "points",
    payout_mode: "pool",
    action_type: "referral",
    reward_points: "1",
    reward_amount: "0",
    reward_budget: "0",
    product_price: "",
    max_recipients: "",
    required_seconds: "30",
  });
  const [adImage, setAdImage] = useState<File | null>(null);
  const [adPreviewUrl, setAdPreviewUrl] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (searchParams.get("account") !== "ordinary") return;
    const applyAccountMode = window.setTimeout(() => {
      setAccountType("ordinary");
      setTab("offer");
      setAuthMode(searchParams.get("mode") === "login" ? "login" : "register");
    }, 0);
    return () => window.clearTimeout(applyAccountMode);
  }, [searchParams]);

  useEffect(() => {
    Promise.all([
      fetch("/api/sellers/public").then((response) =>
        response.ok ? response.json() : null,
      ),
      fetch("/api/advertisements").then((response) =>
        response.ok ? response.json() : null,
      ),
      fetch("/api/sellers/account").then((response) =>
        response.ok ? response.json() : null,
      ),
    ])
      .then(([sellerData, adData, accountData]) => {
        if (sellerData) {
          setItems(sellerData.items || []);
          setStats(
            sellerData.stats || { visitor_count: 0, submission_count: 0 },
          );
        }
        if (adData) {
          setAdvertisements(adData.advertisements || []);
          setPackages(adData.packages || []);
          setAdForm((current) => ({
            ...current,
            package_id: String(adData.packages?.[0]?.id || ""),
          }));
        }
        if (accountData?.user) {
          setUser(accountData.user);
          setOffers(accountData.offers || []);
          setRewardSummary(
            accountData.reward_summary || { points: 0, amount: 0, pending: 0, pending_points: 0, pending_amount: 0, available_balance: 0, minimum_withdrawal: 500 },
          );
          setRewards(accountData.rewards || []);
          setWithdrawals(accountData.withdrawals || []);
          setWalletNumber(accountData.user.wallet_number || "");
        }
      })
      .catch(() => setError("تعذر تحميل بيانات الصفحة"));
    fetch("/api/sellers/visitors", { method: "POST" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data && typeof data.count === "number")
          setStats((current) => ({ ...current, visitor_count: data.count }));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!adImage) {
      const clearPreview = window.setTimeout(() => setAdPreviewUrl(""), 0);
      return () => window.clearTimeout(clearPreview);
    }
    const url = URL.createObjectURL(adImage);
    const showPreview = window.setTimeout(() => setAdPreviewUrl(url), 0);
    return () => {
      window.clearTimeout(showPreview);
      URL.revokeObjectURL(url);
    };
  }, [adImage]);

  const update = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const updateAuth = (key: keyof typeof auth, value: string | boolean) =>
    setAuth((current) => ({ ...current, [key]: value }));

  const submitAuth = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    const response = await fetch("/api/sellers/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: authMode,
        account_type: accountType,
        ...auth,
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setError(result.error || "تعذر تسجيل الحساب");
    else {
      setUser(result.user);
      setTab(result.user.account_type === "ordinary" ? "ads" : "offer");
      setCreateMode(null);
      setMessage(
        authMode === "register"
          ? "تم إنشاء حسابك. احتفظ بكلمة السر لمتابعة المكافآت."
          : "تم تسجيل الدخول",
      );
      const account = await fetch("/api/sellers/account").then((item) =>
        item.json(),
      );
      setOffers(account.offers || []);
      setRewardSummary(
        account.reward_summary || { points: 0, amount: 0, pending: 0, pending_points: 0, pending_amount: 0, available_balance: 0, minimum_withdrawal: 500 },
      );
      setRewards(account.rewards || []);
      setWithdrawals(account.withdrawals || []);
      setWalletNumber(account.user?.wallet_number || "");
    }
    setSaving(false);
  };

  const submitOffer = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    const body = new FormData();
    Object.entries(form).forEach(([key, value]) =>
      body.append(
        key,
        key === "item_name" && value === "أخرى" ? customItemName : value,
      ),
    );
    if (image) body.append("image", image);
    const response = await fetch("/api/sellers/public", {
      method: "POST",
      body,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setError(result.error || "تعذر إرسال العرض");
    else {
      setMessage("تم إرسال العرض للمراجعة. يمكنك متابعة حالته من نفس الحساب.");
      const account = await fetch("/api/sellers/account").then((item) =>
        item.json(),
      );
      setOffers(account.offers || []);
      setForm({
        seller_name: user?.display_name || "",
        phone: user?.phone || "",
        address: "",
        item_name: "",
        quantity: "",
        age_or_weight: "",
        price: "",
        visibility: "admin_only",
      });
      setCustomItemName("");
      setImage(null);
    }
    setSaving(false);
  };

  const submitAd = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    const body = new FormData();
    Object.entries(adForm).forEach(([key, value]) =>
      body.append(key, String(value)),
    );
    if (adForm.reward_mode === "discount") {
      const discountBudget =
        Number(adForm.product_price || 0) *
        (Number(adForm.reward_amount || 0) / 100) *
        Number(adForm.max_recipients || 0);
      body.set("reward_budget", discountBudget.toFixed(2));
    }
    if (adImage) body.append("media", adImage);
    const response = await fetch("/api/advertisements", {
      method: "POST",
      body,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setError(result.error || "تعذر إرسال الإعلان");
    else {
      setMessage("تم إرسال الإعلان للمراجعة. سيظهر بعد موافقة الإدارة.");
      setAdForm((current) => ({
        ...current,
        title: "",
        description: "",
        target_url: "",
        whatsapp: "",
        reward_enabled: false,
      }));
      setAdImage(null);
    }
    setSaving(false);
  };

  const logout = async () => {
    await fetch("/api/sellers/account", { method: "DELETE" });
    setUser(null);
    setOffers([]);
    setMessage("تم تسجيل الخروج");
  };
  const updateProfileImage = async (file: File) => {
    setSaving(true);
    setMessage("");
    setError("");
    const body = new FormData();
    body.append("profile_image", file);
    try {
      const response = await fetch("/api/sellers/account", {
        method: "PATCH",
        body,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error || "تعذر تحديث الصورة");
        return;
      }
      setUser((current) =>
        current
          ? { ...current, profile_image_url: result.profile_image_url }
          : current,
      );
      setMessage("تم تحديث صورة البروفايل");
    } finally {
      setSaving(false);
    }
  };
  const submitWallet = async (action: "save_wallet" | "withdraw") => {
    setSaving(true);
    setMessage("");
    setError("");
    setWalletFeedback(null);
    try {
      const response = await fetch("/api/sellers/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, wallet_number: walletNumber }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const feedback = result.error || "تعذر تنفيذ الطلب";
        setError(feedback);
        setWalletFeedback({ type: "error", text: feedback });
        return;
      }
      const accountResponse = await fetch("/api/sellers/account");
      const account = await accountResponse.json().catch(() => ({}));
      if (accountResponse.ok) {
        setUser(account.user);
        setRewardSummary(account.reward_summary);
        setRewards(account.rewards || []);
        setWithdrawals(account.withdrawals || []);
        setWalletNumber(account.user?.wallet_number || walletNumber);
      }
      const feedback = action === "withdraw" ? "تم إرسال طلب سحب كامل الرصيد للمراجعة." : "تم حفظ رقم المحفظة بنجاح.";
      setMessage(feedback);
      setWalletFeedback({ type: "success", text: feedback });
    } finally {
      setSaving(false);
    }
  };
  const inputClass =
    "h-11 rounded-xl border border-[#dedfd8] bg-white px-3 outline-none focus:border-[#173f3a]";
  const ownedAdvertisements = advertisements.filter(
    (advertisement) => advertisement.is_owner,
  );

  if (!user && tab === "ads") {
    return (
      <main
        className="min-h-screen bg-[#f7f6f2] px-4 py-6 text-[#202a27] sm:px-6 sm:py-10"
        dir="rtl"
      >
        <div className="mx-auto max-w-5xl">
          <header className="relative mb-5 grid gap-3">
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="hidden h-10 items-center gap-2 rounded-xl border border-[#dedfd8] bg-white px-3 text-sm font-bold text-[#173f3a] sm:inline-flex"
              >
                <Home size={17} /> الرئيسية
              </Link>
              <button
                type="button"
                onClick={() => setMobileMenuOpen((current) => !current)}
                className="grid size-10 place-items-center rounded-xl border border-[#dedfd8] bg-white text-[#173f3a] sm:hidden"
                aria-label="فتح القائمة"
              >
                <Menu size={18} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setAccountType("ordinary");
                  setTab("offer");
                }}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#dedfd8] bg-white px-3 text-sm font-bold text-[#173f3a]"
              >
                <LogIn size={16} /> حساب المكافآت
              </button>
              <button
                type="button"
                onClick={() => {
                  setAccountType("market");
                  setTab("offer");
                }}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#dedfd8] bg-white px-3 text-sm font-bold text-[#173f3a]"
              >
                <Store size={16} /> حساب السوق
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 rounded-xl border border-[#e0e1d9] bg-white p-2 text-center text-xs font-bold text-[#72807a]">
              <span>
                <Users className="mx-auto mb-1 text-[#173f3a]" size={15} />
                {stats.visitor_count} زائر
              </span>
              <span>
                <Store className="mx-auto mb-1 text-[#c48738]" size={15} />
                {stats.submission_count} عرض
              </span>
              <span>
                <Megaphone className="mx-auto mb-1 text-[#39704f]" size={15} />
                {advertisements.length} إعلان
              </span>
            </div>
            <MobileMenu
              open={mobileMenuOpen}
              onClose={() => setMobileMenuOpen(false)}
              user={user}
              onLogout={() => void logout()}
              onAccount={(type) => {
                setAccountType(type);
                setTab("offer");
                setMobileMenuOpen(false);
              }}
              onProfileImage={(file) => void updateProfileImage(file)}
            />
          </header>
          <section className="rounded-3xl border border-[#e0e1d9] bg-[#fffdf9] p-5 shadow-[0_16px_40px_#173f3a0c] sm:p-8">
            <div className="mb-5">
              <p className="text-sm font-bold text-[#c48738]">
                الإعلانات العامة
              </p>
              <h1 className="font-display text-3xl font-extrabold text-[#173f3a]">
                اكتشف الإعلانات والحملات
              </h1>
              <p className="mt-1 text-sm text-[#72807a]">
                تصفح الإعلانات بحرية، وسجل حسابًا إذا أردت جمع النقاط أو متابعة
                المكافآت.
              </p>
            </div>
            <PublicAdGallery advertisements={advertisements} />
            <button
              type="button"
              onClick={() => setTab("offer")}
              className="mx-auto mt-5 flex h-11 items-center gap-2 rounded-xl border border-[#dedfd8] bg-white px-5 text-sm font-bold text-[#173f3a]"
            >
              <LogIn size={16} /> تسجيل الدخول / حساب المكافآت
            </button>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen bg-[#f7f6f2] px-4 py-6 text-[#202a27] sm:px-6 sm:py-10"
      dir="rtl"
    >
      {adPreviewUrl && (
        <div className="fixed bottom-4 left-4 z-40 w-56 rounded-xl border border-[#d8dfd6] bg-white p-2 shadow-xl sm:w-64">
          <p className="mb-1 text-xs font-bold text-[#173f3a]">
            معاينة الإعلان
          </p>
          <div className="relative mx-auto aspect-[9/16] max-h-[48vh] w-full overflow-hidden rounded-lg bg-[#18201e]">
            {adForm.media_type === "video" ? (
              <>
                <video src={adPreviewUrl} muted autoPlay loop playsInline aria-hidden="true" className="absolute inset-0 size-full scale-110 object-cover opacity-45 blur-xl" />
                <video src={adPreviewUrl} controls playsInline className="relative z-10 size-full object-contain" />
              </>
            ) : (
              <>
                <img src={adPreviewUrl} alt="" aria-hidden="true" className="absolute inset-0 size-full scale-110 object-cover opacity-45 blur-xl" />
                <img src={adPreviewUrl} alt="معاينة الإعلان" className="relative z-10 size-full object-contain" />
              </>
            )}
          </div>
        </div>
      )}
      <div className="mx-auto max-w-5xl">
        <header className={`relative ${user ? "mb-3" : "mb-5 grid gap-3"}`}>
          <div className="relative flex items-center gap-2">
            <Link
              href="/"
              className="hidden h-10 items-center gap-2 rounded-xl border border-[#dedfd8] bg-white px-3 text-sm font-bold text-[#173f3a] sm:inline-flex"
            >
              <Home size={17} /> الرئيسية
            </Link>
            {user && (
              <button
                type="button"
                onClick={() => void logout()}
                className="hidden h-10 items-center gap-2 rounded-xl border border-[#efcaca] bg-white px-3 text-sm font-bold text-[#a9584d] sm:inline-flex"
              >
                <LogOut size={17} /> خروج
              </button>
            )}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((current) => !current)}
              className="absolute left-0 top-0 grid size-10 place-items-center rounded-xl border border-[#dedfd8] bg-white text-[#173f3a] sm:hidden"
              aria-label="فتح القائمة"
            >
              <Menu size={18} />
            </button>
            {!user && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setAccountType("ordinary");
                    setTab("offer");
                  }}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#dedfd8] bg-white px-3 text-sm font-bold text-[#173f3a]"
                >
                  <LogIn size={16} /> حساب المكافآت
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAccountType("market");
                    setTab("offer");
                  }}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#dedfd8] bg-white px-3 text-sm font-bold text-[#173f3a]"
                >
                  <Store size={16} /> حساب السوق
                </button>
              </>
            )}
          </div>
          <div className="text-left text-xs text-[#72807a] hidden">
            <div className="flex items-center justify-end gap-3">
              <span className="inline-flex items-center gap-1">
                <Users size={14} /> {stats.visitor_count} زائر
              </span>
              <span className="inline-flex items-center gap-1">
                <Store size={14} /> {stats.submission_count} عرض
              </span>
            </div>
          </div>
          {!user && (
            <div className="grid grid-cols-3 gap-2 rounded-xl border border-[#e0e1d9] bg-white p-2 text-center text-xs font-bold text-[#72807a]">
              <span>
                <Users className="mx-auto mb-1 text-[#173f3a]" size={15} />
                {stats.visitor_count} زائر
              </span>
              <span>
                <Store className="mx-auto mb-1 text-[#c48738]" size={15} />
                {stats.submission_count} عرض
              </span>
              <span>
                <Megaphone className="mx-auto mb-1 text-[#39704f]" size={15} />
                {advertisements.length} إعلان
              </span>
            </div>
          )}
          <MobileMenu
            open={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
            user={user}
            onLogout={() => void logout()}
            onAccount={(type) => {
              setAccountType(type);
              setTab("offer");
              setMobileMenuOpen(false);
            }}
            onProfileImage={(file) => void updateProfileImage(file)}
          />
        </header>
        {accountType === "market" && (
          <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl bg-[#eef0ea] p-1 sm:hidden">
            <button
              onClick={() => setTab("ads")}
              className={`h-10 rounded-lg text-xs font-bold ${tab === "ads" ? "bg-white text-[#173f3a] shadow-sm" : "text-[#72807a]"}`}
            >
              <Megaphone className="ml-1 inline" size={14} /> الإعلانات
            </button>
            <button
              onClick={() => setTab("offer")}
              className={`h-10 rounded-lg text-xs font-bold ${tab === "offer" ? "bg-white text-[#173f3a] shadow-sm" : "text-[#72807a]"}`}
            >
              <Store className="ml-1 inline" size={14} /> عرض البيع
            </button>
          </div>
        )}
        {!user && (
          <div className="mb-3 rounded-xl border border-[#dedfd8] bg-white p-2 text-center text-xs font-bold text-[#596963] max-sm:border-[#efcaca] max-sm:bg-[#fff5f5] max-sm:text-[#a9584d] max-sm:font-extrabold">
            {accountType === "ordinary"
              ? "أنت على وشك إنشاء حساب مكافآت للنقاط والإحالات"
              : "أنت على وشك إنشاء حساب سوق لإضافة عروض البيع"}
          </div>
        )}
        <section className="rounded-3xl border border-[#e0e1d9] bg-[#fffdf9] p-5 shadow-[0_16px_40px_#173f3a0c] sm:p-8">
          {!user && (
            <div className="mb-6 flex items-start gap-3">
              <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#e4eee5] text-[#173f3a]">
                <Store size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-[#c48738] max-sm:text-[#a9584d] max-sm:font-extrabold">
                  {accountType === "ordinary"
                    ? "حساب المكافآت"
                    : "سوق التوريد والإعلانات"}
                </p>
                <h1 className="font-display text-3xl font-extrabold text-[#173f3a] max-sm:text-black max-sm:font-black">
                  {accountType === "ordinary"
                    ? "تابع مكافآتك وتفاعلاتك"
                    : "اعرض منتجك أو أعلن عن نشاطك"}
                </h1>
                <p className="mt-1 text-sm font-medium leading-6 text-[#72807a] max-sm:text-black max-sm:font-bold">
                  {accountType === "ordinary"
                    ? "شاهد نقاطك ومكافآتك وتفاعلاتك داخل الموقع."
                    : "عروض البيع خاصة وتراجعها الإدارة، أما الإعلان العام فلا يظهر إلا بعد الموافقة."}
                </p>
              </div>
            </div>
          )}
          {accountType === "market" && (
            <div className="mb-6 hidden grid-cols-2 gap-2 rounded-xl bg-[#eef0ea] p-1 sm:grid">
              <button
                onClick={() => {
                  setTab("ads");
                  setMessage("");
                  setError("");
                }}
                className={`order-1 h-11 rounded-lg text-sm font-bold ${tab === "ads" ? "bg-white text-[#173f3a] shadow-sm" : "text-[#72807a]"}`}
              >
                <Megaphone className="ml-2 inline" size={16} />
                الإعلانات العامة
              </button>
              <button
                onClick={() => {
                  setTab("offer");
                  setMessage("");
                  setError("");
                }}
                className={`order-2 h-11 rounded-lg text-sm font-bold ${tab === "offer" ? "bg-white text-[#173f3a] shadow-sm" : "text-[#72807a]"}`}
              >
                <Store className="ml-2 inline" size={16} />
                عرض بيع خاص
              </button>
            </div>
          )}
          {!user ? (
            <form
              onSubmit={submitAuth}
              className="mx-auto max-w-xl rounded-2xl border border-[#e0e1d9] bg-[#f7faf6] p-5"
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-xl font-bold text-[#173f3a]">
                    {authMode === "register"
                      ? "إنشاء حساب متابعة"
                      : "تسجيل الدخول"}
                  </h2>
                  <p className="mt-1 text-xs text-[#72807a]">
                    {accountType === "ordinary"
                      ? "أدخل اسمك ورقم هاتفك وكلمة السر لمتابعة النقاط والمكافآت."
                      : "أدخل بيانات النشاط لمتابعة عروض البيع وإعلاناتك."}
                  </p>
                </div>
                <LogIn className="text-[#c48738]" />
              </div>
              {authMode === "register" && (
                <>
                  <input
                    required
                    value={auth.display_name}
                    onChange={(event) =>
                      updateAuth("display_name", event.target.value)
                    }
                    placeholder="الاسم أو اسم النشاط"
                    className={`${inputClass} mb-2 w-full`}
                  />
                  {accountType === "market" && (
                    <>
                      <select
                        value={auth.role}
                        onChange={(event) =>
                          updateAuth("role", event.target.value)
                        }
                        className={`${inputClass} mb-2 w-full`}
                      >
                        <option value="farm_owner">صاحب مزرعة</option>
                        <option value="trader">تاجر</option>
                        <option value="supplier">مورد</option>
                      </select>
                      {auth.role === "trader" && (
                        <label className="mb-2 flex items-center gap-2 text-sm text-[#596963]">
                          <input
                            type="checkbox"
                            checked={auth.receive_offers}
                            onChange={(event) =>
                              updateAuth("receive_offers", event.target.checked)
                            }
                          />{" "}
                          أوافق على استقبال عروض من إدارة الموقع
                        </label>
                      )}
                    </>
                  )}
                </>
              )}
              <input
                required
                value={auth.phone}
                onChange={(event) => updateAuth("phone", event.target.value)}
                placeholder="رقم الواتساب"
                inputMode="tel"
                className={`${inputClass} mb-2 w-full`}
              />
              <input
                required
                minLength={4}
                type="password"
                value={auth.password}
                onChange={(event) => updateAuth("password", event.target.value)}
                placeholder="كلمة السر"
                className={`${inputClass} mb-3 w-full`}
              />
              <button
                disabled={saving}
                className="h-11 w-full rounded-xl bg-[#173f3a] font-bold text-white disabled:opacity-60"
              >
                {saving
                  ? "جار المعالجة..."
                  : authMode === "register"
                    ? "إنشاء الحساب"
                    : "دخول"}
              </button>
              <button
                type="button"
                onClick={() =>
                  setAuthMode(authMode === "register" ? "login" : "register")
                }
                className="mt-3 w-full text-sm font-bold text-[#c48738]"
              >
                {authMode === "register"
                  ? "لدي حساب بالفعل"
                  : "إنشاء حساب جديد"}
              </button>
            </form>
          ) : (
            <>
              <section className="mb-5 -mx-5 overflow-hidden border-b border-[#d8dfd6] bg-transparent sm:-mx-8">
                <div className="flex flex-wrap items-center gap-4 border-b border-[#e7e7df] bg-[#f7faf6] p-4">
                  <label className="size-16 shrink-0 cursor-pointer rounded-xl outline-none ring-[#c48738] transition hover:ring-2 focus-within:ring-2" title="اضغط لتغيير صورة البروفايل">
                    {user.profile_image_url ? (
                      <img
                        src={user.profile_image_url}
                        alt="صورة البروفايل"
                        className="size-16 rounded-xl object-cover"
                      />
                    ) : (
                      <span className="grid size-16 place-items-center rounded-xl bg-[#173f3a] text-2xl font-black text-[#f4c95d]">
                        {user.display_name.trim().charAt(0) || "م"}
                      </span>
                    )}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      disabled={saving}
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void updateProfileImage(file);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[#c48738]">
                      {user.account_type === "ordinary"
                        ? "حساب المكافآت"
                        : "ملف السوق"}
                    </p>
                    <Link
                      href={`/market-profile?referral_code=${encodeURIComponent(user.referral_code || "")}`}
                      className="block truncate font-display text-xl font-black text-[#173f3a] hover:underline"
                    >
                      {user.display_name}
                    </Link>
                    <p className="mt-1 text-xs font-bold text-[#596963]">
                      {user.account_type === "ordinary"
                        ? user.phone
                        : `${roleLabels[user.role] || user.role} · ${user.phone}`}
                    </p>
                    {user.referral_code && (
                      <p className="mt-1 text-[11px] text-[#39704f]">
                        كود المشاركة: {user.referral_code}
                      </p>
                    )}
                  </div>
                </div>
                <div className={`${user.account_type === "ordinary" ? "hidden" : "grid"} grid-cols-3 divide-x divide-x-reverse divide-[#e7e7df] text-center`}>
                  <div className="p-3">
                    <strong className="block text-xl font-black text-[#173f3a]">
                      {user.account_type === "ordinary"
                        ? rewardSummary.points
                        : offers.length}
                    </strong>
                    <span className="text-[11px] font-bold text-[#72807a]">
                      {user.account_type === "ordinary" ? "نقاط" : "عروض البيع"}
                    </span>
                  </div>
                  <div className="p-3">
                    <strong className="block text-xl font-black text-[#c48738]">
                      {user.account_type === "ordinary"
                        ? rewardSummary.pending
                        : rewardSummary.points}
                    </strong>
                    <span className="text-[11px] font-bold text-[#72807a]">
                      {user.account_type === "ordinary" ? "مكافآت قيد المراجعة" : "النقاط"}
                    </span>
                  </div>
                  <div className="p-3">
                    <strong className="block text-xl font-black text-[#39704f]">
                      {rewardSummary.amount}
                    </strong>
                    <span className="text-[11px] font-bold text-[#72807a]">
                      المعتمد جنيه
                    </span>
                  </div>
                </div>
              </section>
              {user.account_type === "ordinary" ? (
                <section className="grid gap-4">
                  <div className="overflow-hidden rounded-xl bg-[#173f3a] text-white shadow-[0_14px_34px_rgba(23,63,58,0.18)]">
                    <div className="flex items-start justify-between gap-4 px-5 pb-5 pt-6 sm:px-6">
                      <div>
                        <div className="mb-3 flex items-center gap-2 text-xs font-bold text-[#b9d2c8]">
                          <WalletCards size={16} /> الرصيد المتاح
                        </div>
                        <div className="flex items-end gap-2">
                          <strong className="font-display text-4xl font-black tabular-nums sm:text-5xl">
                            {rewardSummary.available_balance}
                          </strong>
                          <span className="pb-1 text-sm font-bold text-[#d8e7e1]">جنيه</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowWallet((current) => !current)}
                        className="grid size-11 shrink-0 place-items-center rounded-lg border border-white/20 bg-white/10 text-white transition hover:bg-white/15"
                        aria-label={showWallet ? "إغلاق المحفظة" : "فتح المحفظة"}
                        title={showWallet ? "إغلاق المحفظة" : "فتح المحفظة"}
                      >
                        {showWallet ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </button>
                    </div>
                    <div className="border-t border-white/15 px-5 py-3 sm:px-6">
                      <div className="mb-2 flex justify-between text-[11px] font-bold text-[#d8e7e1]">
                        <span>الحد الأدنى للسحب</span>
                        <span>{rewardSummary.minimum_withdrawal} جنيه</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
                        <div
                          className="h-full rounded-full bg-[#f0bd65]"
                          style={{ width: `${Math.min(100, (rewardSummary.available_balance / rewardSummary.minimum_withdrawal) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <div className="flex min-h-24 items-center gap-3 rounded-lg border border-[#dce3db] bg-white p-4">
                      <span className="hidden size-10 shrink-0 place-items-center rounded-lg bg-[#e7f0e9] text-[#39704f] sm:grid"><Coins size={20} /></span>
                      <div><strong className="block text-2xl font-black tabular-nums text-[#173f3a]">{rewardSummary.points}</strong><span className="text-xs font-bold text-[#72807a]">نقاط معتمدة</span></div>
                    </div>
                    <div className="flex min-h-24 items-center gap-3 rounded-lg border border-[#eadfc9] bg-[#fffaf0] p-4">
                      <span className="hidden size-10 shrink-0 place-items-center rounded-lg bg-[#f7e8ca] text-[#a66c20] sm:grid"><Clock3 size={20} /></span>
                      <div><strong className="block text-2xl font-black tabular-nums text-[#8a5a1f]">{rewardSummary.pending}</strong><span className="text-xs font-bold text-[#7d715d]">قيد المراجعة</span></div>
                    </div>
                    <div className="col-span-2 flex min-h-24 items-center gap-3 rounded-lg border border-[#dce3db] bg-white p-4 sm:col-span-1">
                      <span className="hidden size-10 shrink-0 place-items-center rounded-lg bg-[#eef0ea] text-[#173f3a] sm:grid"><BadgeCheck size={20} /></span>
                      <div><strong className="block text-2xl font-black tabular-nums text-[#173f3a]">{rewardSummary.amount}</strong><span className="text-xs font-bold text-[#72807a]">جنيه معتمد</span></div>
                    </div>
                  </div>

                  {showWallet && (
                    <section className="overflow-hidden rounded-xl border border-[#dce3db] bg-white">
                      <header className="flex items-center gap-3 border-b border-[#e8ece6] bg-[#f7faf6] px-4 py-4 sm:px-5">
                        <span className="grid size-10 place-items-center rounded-lg bg-[#173f3a] text-white"><Smartphone size={19} /></span>
                        <div>
                          <h2 className="font-display text-lg font-bold text-[#173f3a]">المحفظة والسحب</h2>
                          <p className="text-xs text-[#72807a]">احفظ رقم محفظتك ثم اطلب تحويل كامل الرصيد المتاح.</p>
                        </div>
                      </header>
                      <div className="grid gap-3 p-4 sm:p-5">
                        <label className="grid gap-1.5 text-xs font-bold text-[#596963]">
                          رقم المحفظة الإلكترونية
                          <input value={walletNumber} onChange={(event) => setWalletNumber(event.target.value)} inputMode="tel" placeholder="فودافون أو اتصالات أو أورنج أو WE" className={inputClass} />
                        </label>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <button type="button" disabled={saving} onClick={() => void submitWallet("save_wallet")} className="h-11 rounded-lg border border-[#cfd8cf] bg-white px-4 text-sm font-bold text-[#173f3a] disabled:opacity-50">حفظ رقم المحفظة</button>
                          <button type="button" disabled={saving || rewardSummary.available_balance < rewardSummary.minimum_withdrawal} onClick={() => void submitWallet("withdraw")} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#39704f] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"><Banknote size={17} /> طلب سحب الرصيد</button>
                        </div>
                        {rewardSummary.available_balance < rewardSummary.minimum_withdrawal && (
                          <p className="text-xs leading-5 text-[#8a6a3c]">يتبقى {Math.max(0, rewardSummary.minimum_withdrawal - rewardSummary.available_balance)} جنيه للوصول إلى الحد الأدنى للسحب.</p>
                        )}
                        {walletFeedback && (
                          <p role="status" className={`rounded-lg px-3 py-2 text-sm font-bold ${walletFeedback.type === "success" ? "bg-[#eaf5ed] text-[#39704f]" : "bg-[#fbeceb] text-[#a9584d]"}`}>{walletFeedback.text}</p>
                        )}
                      </div>
                      {!!withdrawals.length && (
                        <div className="border-t border-[#e8ece6] px-4 py-4 sm:px-5">
                          <h3 className="mb-3 text-xs font-black text-[#173f3a]">طلبات السحب السابقة</h3>
                          <div className="grid gap-2">
                            {withdrawals.map((withdrawal) => (
                              <div key={withdrawal.id} className="flex items-center justify-between gap-3 rounded-lg bg-[#f7f8f5] px-3 py-2.5 text-xs">
                                <div><strong className="block text-sm text-[#173f3a]">{withdrawal.amount} جنيه</strong><span className="text-[#89918c]">{withdrawal.wallet_number}</span></div>
                                <span className={`shrink-0 rounded-md px-2 py-1 font-bold ${withdrawal.status === "paid" ? "bg-[#e5f2e9] text-[#39704f]" : withdrawal.status === "rejected" ? "bg-[#f8e9e6] text-[#a9584d]" : "bg-[#fff0d7] text-[#96631f]"}`}>{withdrawal.status === "pending" ? "قيد المراجعة" : withdrawal.status === "approved" ? "جار الإرسال" : withdrawal.status === "paid" ? "تم الإرسال" : "مرفوض"}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </section>
                  )}

                  <section className="overflow-hidden rounded-xl border border-[#dce3db] bg-white">
                    <header className="flex items-center justify-between gap-3 border-b border-[#e8ece6] px-4 py-4 sm:px-5">
                      <div className="flex items-center gap-3">
                        <span className="grid size-10 place-items-center rounded-lg bg-[#eef0ea] text-[#173f3a]"><Clock3 size={19} /></span>
                        <div><h2 className="font-display text-lg font-bold text-[#173f3a]">سجل المكافآت</h2><p className="text-xs text-[#72807a]">آخر التفاعلات وحالة اعتمادها</p></div>
                      </div>
                      <span className="text-xs font-bold text-[#89918c]">{rewards.length} تفاعل</span>
                    </header>
                    <div className="divide-y divide-[#edf0eb]">
                      {rewards.map((reward) => (
                        <article key={reward.id} className="p-4 sm:px-5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-[#173f3a]">{reward.reason || "تفاعل مع إعلان"}</p>
                              <p className="mt-1 text-[11px] text-[#89918c]">{new Date(reward.created_at).toLocaleString("ar-EG")}</p>
                            </div>
                            <span className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-bold ${reward.status === "approved" ? "bg-[#e5f2e9] text-[#39704f]" : reward.status === "pending" ? "bg-[#fff0d7] text-[#96631f]" : "bg-[#f8e9e6] text-[#a9584d]"}`}>{reward.status === "approved" ? "معتمد" : reward.status === "pending" ? "قيد المراجعة" : "مرفوض"}</span>
                          </div>
                          <div className="mt-3 flex items-center gap-4 text-xs font-bold">
                            <span className="inline-flex items-center gap-1.5 text-[#173f3a]"><Coins size={14} /> {reward.status === "approved" ? `${reward.points || 0} نقطة` : "النقاط بعد الاعتماد"}</span>
                            <span className="inline-flex items-center gap-1.5 text-[#a66c20]"><Banknote size={14} /> {reward.status === "approved" ? `${reward.amount || 0} جنيه` : "القيمة بعد الاعتماد"}</span>
                          </div>
                        </article>
                      ))}
                      {!rewards.length && (
                        <div className="grid place-items-center px-4 py-12 text-center">
                          <span className="mb-3 grid size-12 place-items-center rounded-full bg-[#eef0ea] text-[#72807a]"><Clock3 size={22} /></span>
                          <p className="text-sm font-bold text-[#596963]">لا توجد مكافآت حتى الآن</p>
                          <p className="mt-1 text-xs text-[#89918c]">ستظهر هنا التفاعلات المؤهلة بعد مشاركتك في الحملات.</p>
                        </div>
                      )}
                    </div>
                  </section>
                </section>
              ) : createMode === null ? (
                <section className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setCreateMode("offer")}
                    className="h-14 rounded-xl bg-[#173f3a] text-sm font-bold text-white"
                  >
                    <Store className="ml-2 inline" size={18} />
                    إنشاء عرض بيع
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateMode("ad")}
                    className="h-14 rounded-xl bg-[#c48738] text-sm font-bold text-white"
                  >
                    <Megaphone className="ml-2 inline" size={18} />
                    إنشاء إعلان
                  </button>
                </section>
              ) : createMode === "offer" ? (
                <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
                  <form onSubmit={submitOffer} className="grid gap-4">
                    <h2 className="font-display text-xl font-bold text-[#173f3a]">
                      إضافة عرض بيع خاص
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <input
                        required
                        value={form.seller_name}
                        onChange={(event) =>
                          update("seller_name", event.target.value)
                        }
                        placeholder="اسم البائع أو الشركة"
                        className={inputClass}
                      />
                      <input
                        required
                        value={form.phone}
                        onChange={(event) =>
                          update("phone", event.target.value)
                        }
                        placeholder="رقم واتساب للتواصل"
                        className={inputClass}
                      />
                    </div>
                    <input
                      required
                      value={form.address}
                      onChange={(event) =>
                        update("address", event.target.value)
                      }
                      placeholder="العنوان"
                      className={inputClass}
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <select
                        required
                        value={form.item_name}
                        onChange={(event) =>
                          update("item_name", event.target.value)
                        }
                        className={inputClass}
                      >
                        <option value="">اختر الصنف</option>
                        {items.map((item) => (
                          <option key={item.id} value={item.name}>
                            {item.name}
                          </option>
                        ))}
                        <option value="أخرى">أخرى</option>
                      </select>
                      <input
                        required
                        type="number"
                        min="1"
                        value={form.quantity}
                        onChange={(event) =>
                          update("quantity", event.target.value)
                        }
                        placeholder="العدد"
                        className={inputClass}
                      />
                    </div>
                    {form.item_name === "أخرى" && (
                      <input
                        required
                        value={customItemName}
                        onChange={(event) =>
                          setCustomItemName(event.target.value)
                        }
                        placeholder="اسم الصنف"
                        className={inputClass}
                      />
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <input
                        value={form.age_or_weight}
                        onChange={(event) =>
                          update("age_or_weight", event.target.value)
                        }
                        placeholder="العمر أو الوزن"
                        className={inputClass}
                      />
                      <input
                        required
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.price}
                        onChange={(event) =>
                          update("price", event.target.value)
                        }
                        placeholder="السعر"
                        className={inputClass}
                      />
                    </div>
                    <select
                      value={form.visibility}
                      onChange={(event) =>
                        update("visibility", event.target.value)
                      }
                      className={inputClass}
                    >
                      <option value="admin_only">
                        عرضه على إدارة الموقع فقط
                      </option>
                      <option value="selected_traders">
                        إرساله لتجار يحددهم الأدمن
                      </option>
                      <option value="all_traders">
                        إتاحته لكل التجار المسجلين
                      </option>
                    </select>
                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#cfd8cf] bg-[#f7faf6] p-3 text-sm font-bold text-[#56816c]">
                      <ImagePlus size={20} />
                      <span className="min-w-0 flex-1 truncate">
                        {image ? image.name : "إضافة صورة المنتج (اختياري)"}
                      </span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(event) =>
                          setImage(event.target.files?.[0] || null)
                        }
                        className="sr-only"
                      />
                    </label>
                    <button
                      disabled={saving}
                      className="h-12 rounded-xl bg-[#173f3a] font-bold text-white disabled:opacity-60"
                    >
                      {saving ? "جار الإرسال..." : "إرسال العرض للمراجعة"}
                    </button>
                  </form>
                  <aside className="rounded-2xl border border-[#e0e1d9] bg-[#fbfbf8] p-4">
                    <h2 className="font-bold text-[#173f3a]">حالة عروضك</h2>
                    <div className="mt-3 grid gap-2">
                      {offers.length ? (
                        offers.map((offer) => (
                          <div
                            key={offer.id}
                            className="rounded-xl border border-[#e7e7df] bg-white p-3"
                          >
                            <div className="flex justify-between gap-2 text-sm font-bold">
                              <span>
                                {offer.item_name} × {offer.quantity}
                              </span>
                              <span className="text-[#c48738]">
                                {offer.status}
                              </span>
                            </div>
                            {offer.admin_note && (
                              <p className="mt-2 text-xs leading-5 text-[#a9584d]">
                                ملاحظة الإدارة: {offer.admin_note}
                              </p>
                            )}
                            <p className="mt-1 text-[11px] text-[#89918c]">
                              {offer.visibility === "admin_only"
                                ? "خاص بالإدارة"
                                : "موجه للتجار"}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="py-8 text-center text-sm text-[#89918c]">
                          لا توجد عروض بعد.
                        </p>
                      )}
                    </div>
                  </aside>
                </div>
              ) : (
                <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
                  <form onSubmit={submitAd} className="grid gap-4">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="font-display text-xl font-bold text-[#173f3a]">
                        إرسال إعلان للمراجعة
                      </h2>
                      <button
                        type="button"
                        onClick={() => setCreateMode(null)}
                        className="h-9 rounded-lg border border-[#dedfd8] bg-white px-3 text-xs font-bold text-[#596963]"
                      >
                        العودة إلى حساب السوق
                      </button>
                    </div>
                    <label className="grid gap-1 text-sm font-bold text-[#596963]">
                      عنوان الإعلان{" "}
                      <span className="text-xs font-normal text-[#89918c]">
                        اسم قصير واضح يظهر للزوار
                      </span>
                      <input
                        required
                        value={adForm.title}
                        onChange={(event) =>
                          setAdForm({ ...adForm, title: event.target.value })
                        }
                        placeholder="مثال: خصم على الأعلاف"
                        className={inputClass}
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-bold text-[#596963]">
                      وصف الإعلان{" "}
                      <span className="text-xs font-normal text-[#89918c]">
                        اكتب التفاصيل أو العرض الذي سيقرأه الزائر
                      </span>
                      <textarea
                        required
                        value={adForm.description}
                        onChange={(event) =>
                          setAdForm({
                            ...adForm,
                            description: event.target.value,
                          })
                        }
                        placeholder="اكتب وصفًا مختصرًا ومفيدًا"
                        className="min-h-28 rounded-xl border border-[#dedfd8] bg-white p-3 outline-none"
                      />
                    </label>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="grid gap-1 text-sm font-bold text-[#596963]">
                        نوع الإعلان{" "}
                        <select
                          value={adForm.media_type}
                          onChange={(event) =>
                            setAdForm({
                              ...adForm,
                              media_type: event.target.value,
                            })
                          }
                          className={inputClass}
                        >
                          <option value="text">إعلان نصي</option>
                          <option value="image">صورة</option>
                          <option value="text_image">نص مع صورة</option>
                          <option value="video">فيديو قصير</option>
                        </select>
                      </label>
                      <label className="flex items-center gap-2 rounded-xl border border-[#e7d7b8] bg-[#fff9ed] p-3 text-sm font-bold text-[#8a611f]">
                        <input
                          type="checkbox"
                          checked={adForm.reward_enabled}
                          onChange={(event) =>
                            setAdForm({
                              ...adForm,
                              reward_enabled: event.target.checked,
                            })
                          }
                        />{" "}
                        تفعيل حملة مكافآت اختيارية لهذا الإعلان
                      </label>
                      {adForm.reward_enabled && (
                        <div className="grid min-w-0 gap-3 rounded-xl border border-[#e7d7b8] bg-[#fffdf7] p-3 sm:col-span-2">
                          <p className="text-xs font-bold text-[#8a611f]">
                            الحملة تبدأ بعد موافقة الإدارة
                          </p>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="grid gap-1 text-sm font-bold text-[#596963]">
                              نوع التفاعل
                              <span className="text-xs font-normal text-[#89918c]">
                                ما الذي يفعله الزائر ليستحق المكافأة؟
                              </span>
                              <select
                                value={adForm.action_type}
                                onChange={(event) =>
                                  setAdForm({
                                    ...adForm,
                                    action_type: event.target.value,
                                  })
                                }
                                className={inputClass}
                              >
                                <option value="referral">
                                  إحالة زائر جديد
                                </option>
                                <option value="view">مشاهدة فيديو</option>
                                <option value="like">إعجاب داخل الموقع</option>
                                <option value="share">مشاركة</option>
                              </select>
                            </label>
                            <label className="grid gap-1 text-sm font-bold text-[#596963]">
                              نوع المكافأة
                              <span className="text-xs font-normal text-[#89918c]">
                                اختر ما سيحصل عليه المستفيد
                              </span>
                              <select
                                value={adForm.reward_mode}
                                onChange={(event) => {
                                  const rewardMode = event.target.value;
                                  setAdForm({
                                    ...adForm,
                                    reward_mode: rewardMode,
                                    reward_points:
                                      rewardMode === "points"
                                        ? adForm.reward_points === "0"
                                          ? "1"
                                          : adForm.reward_points
                                        : "0",
                                    reward_amount:
                                      rewardMode === "cash"
                                        ? adForm.reward_amount
                                        : "0",
                                  });
                                }}
                                className={inputClass}
                              >
                                <option value="points">نقاط</option>
                                <option value="discount">خصم</option>
                                <option value="gift">هدية</option>
                                <option value="cash">مكافأة نقدية معلقة</option>
                              </select>
                            </label>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {adForm.reward_mode === "points" && (
                            <label className="grid gap-1 text-sm font-bold text-[#596963]">
                              النقاط لكل مستفيد
                              <span className="text-xs font-normal text-[#89918c]">
                                اكتب عدد النقاط عند اختيار النقاط
                              </span>
                              <input
                                type="number"
                                min="0"
                                value={adForm.reward_points}
                                onChange={(event) =>
                                  setAdForm({
                                    ...adForm,
                                    reward_points: event.target.value,
                                  })
                                }
                                placeholder="مثال: 20"
                                className={inputClass}
                              />
                            </label>
                            )}
                            {adForm.reward_mode === "cash" && (
                              <label className="grid gap-1 text-sm font-bold text-[#596963]">
                                طريقة توزيع المبلغ
                                <span className="text-xs font-normal text-[#89918c]">
                                  ثابت لكل مستفيد أو تقسيم الميزانية عند النهاية
                                </span>
                                <select
                                  value={adForm.payout_mode}
                                  onChange={(event) =>
                                    setAdForm({ ...adForm, payout_mode: event.target.value })
                                  }
                                  className={inputClass}
                                >
                                  <option value="pool">تقسيم الميزانية بالتساوي</option>
                                  <option value="fixed">مبلغ ثابت لكل مستفيد</option>
                                </select>
                              </label>
                            )}
                            {adForm.reward_mode === "cash" && adForm.payout_mode === "fixed" && (
                            <label className="grid gap-1 text-sm font-bold text-[#596963]">
                              المبلغ لكل مستفيد
                              <span className="text-xs font-normal text-[#89918c]">
                                مبلغ نقدي معلق حتى اعتماد الإدارة
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={adForm.reward_amount}
                                onChange={(event) =>
                                  setAdForm({
                                    ...adForm,
                                    reward_amount: event.target.value,
                                  })
                                }
                                placeholder="مثال: 10"
                                className={inputClass}
                              />
                            </label>
                            )}
                            {adForm.reward_mode === "discount" && (
                              <label className="grid gap-1 text-sm font-bold text-[#596963]">
                                نسبة الخصم
                                <span className="text-xs font-normal text-[#89918c]">
                                  تظهر على بطاقة الإعلان للمستخدمين
                                </span>
                                <input
                                  type="number"
                                  min="1"
                                  max="100"
                                  step="1"
                                  value={adForm.reward_amount}
                                  onChange={(event) =>
                                    setAdForm({
                                      ...adForm,
                                      reward_amount: event.target.value,
                                    })
                                  }
                                  placeholder="مثال: 15"
                                  className={inputClass}
                                />
                              </label>
                            )}
                            {adForm.reward_mode === "discount" && (
                              <label className="grid gap-1 text-sm font-bold text-[#596963]">
                                سعر المنتج
                                <span className="text-xs font-normal text-[#89918c]">
                                  السعر قبل تطبيق الخصم بالجنيه
                                </span>
                                <input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  required
                                  value={adForm.product_price}
                                  onChange={(event) =>
                                    setAdForm({
                                      ...adForm,
                                      product_price: event.target.value,
                                    })
                                  }
                                  placeholder="مثال: 200"
                                  className={inputClass}
                                />
                              </label>
                            )}
                            <label className="grid gap-1 text-sm font-bold text-[#596963]">
                              إجمالي ميزانية المكافآت
                              <span className="text-xs font-normal text-[#89918c]">
                                {adForm.reward_mode === "discount"
                                  ? "السعر × نسبة الخصم × عدد المستفيدين"
                                  : "الحد المالي الكامل للحملة بالجنيه"}
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={
                                  adForm.reward_mode === "discount"
                                    ? (
                                        Number(adForm.product_price || 0) *
                                        (Number(adForm.reward_amount || 0) / 100) *
                                        Number(adForm.max_recipients || 0)
                                      ).toFixed(2)
                                    : adForm.reward_budget
                                }
                                onChange={(event) =>
                                  setAdForm({
                                    ...adForm,
                                    reward_budget: event.target.value,
                                  })
                                }
                                readOnly={adForm.reward_mode === "discount"}
                                placeholder="مثال: 1000"
                                className={`${inputClass} ${adForm.reward_mode === "discount" ? "bg-[#f1f3ee]" : ""}`}
                              />
                            </label>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="grid gap-1 text-sm font-bold text-[#596963]">
                              الحد الأقصى للمستفيدين
                              <span className="text-xs font-normal text-[#89918c]">
                                اتركه فارغًا للسماح بعدد غير محدد
                              </span>
                              <input
                                type="number"
                                min="1"
                                required={adForm.reward_mode === "discount"}
                                value={adForm.max_recipients}
                                onChange={(event) =>
                                  setAdForm({
                                    ...adForm,
                                    max_recipients: event.target.value,
                                  })
                                }
                                placeholder="مثال: 50"
                                className={inputClass}
                              />
                            </label>
                            {adForm.action_type === "view" && (
                              <label className="grid gap-1 text-sm font-bold text-[#596963]">
                                مدة مشاهدة الفيديو بالثواني
                                <span className="text-xs font-normal text-[#89918c]">
                                  مدة المشاهدة المطلوبة قبل استحقاق المكافأة
                                </span>
                                <input
                                  type="number"
                                  min="1"
                                  value={adForm.required_seconds}
                                  onChange={(event) =>
                                    setAdForm({
                                      ...adForm,
                                      required_seconds: event.target.value,
                                    })
                                  }
                                  placeholder="مثال: 30"
                                  className={inputClass}
                                />
                              </label>
                            )}
                          </div>
                        </div>
                      )}
                      <select
                        required
                        value={adForm.package_id}
                        onChange={(event) =>
                          setAdForm({
                            ...adForm,
                            package_id: event.target.value,
                          })
                        }
                        className={inputClass}
                      >
                        {packages.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} - {item.price} جنيه
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="grid gap-1 text-sm font-bold text-[#596963]">
                        رقم واتساب الإعلان
                        <span className="text-xs font-normal text-[#89918c]">
                          وسيلة التواصل التي ستظهر للمهتمين
                        </span>
                        <input
                          value={adForm.whatsapp}
                          onChange={(event) =>
                            setAdForm({
                              ...adForm,
                              whatsapp: event.target.value,
                            })
                          }
                          placeholder="مثال: 201001234567"
                          className={inputClass}
                        />
                      </label>
                      <label className="grid gap-1 text-sm font-bold text-[#596963]">
                        رابط الإعلان
                        <span className="text-xs font-normal text-[#89918c]">
                          رابط موقعك أو صفحة المنتج، وهذا الحقل اختياري
                        </span>
                        <input
                          value={adForm.target_url}
                          onChange={(event) =>
                            setAdForm({
                              ...adForm,
                              target_url: event.target.value,
                            })
                          }
                          placeholder="https://example.com"
                          className={inputClass}
                        />
                      </label>
                    </div>
                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#cfd8cf] bg-[#f7faf6] p-3 text-sm font-bold text-[#56816c]">
                      <ImagePlus size={20} />
                      <span className="min-w-0 flex-1 truncate">
                        {adImage
                          ? adImage.name
                          : adForm.media_type === "video"
                            ? "فيديو الإعلان (اختياري)"
                            : "صورة الإعلان (اختياري)"}
                      </span>
                      <input
                        type="file"
                        accept={
                          adForm.media_type === "video"
                            ? "video/mp4,video/webm,video/quicktime"
                            : "image/png,image/jpeg,image/webp"
                        }
                        onChange={(event) =>
                          setAdImage(event.target.files?.[0] || null)
                        }
                        className="sr-only"
                      />
                    </label>
                    <p className="text-xs leading-5 text-[#72807a]">
                      يفضل للصورة والفيديو نسبة 16:9 حتى يظهر الإعلان بشكل أفضل،
                      مثل 1280×720 للصورة أو 720×405 للفيديو. هذه مقاسات مقترحة
                      وليست إلزامية.
                    </p>
                    <button
                      disabled={saving}
                      className="h-12 rounded-xl bg-[#c48738] font-bold text-white disabled:opacity-60"
                    >
                      {saving ? "جار الإرسال..." : "إرسال الإعلان للمراجعة"}
                    </button>
                  </form>
                  <aside className="rounded-2xl border border-[#e0e1d9] bg-[#fbfbf8] p-4">
                    <h2 className="font-bold text-[#173f3a]">إعلاناتك المقبولة</h2>
                    <div className="mt-3 grid gap-2">
                      {ownedAdvertisements.map((ad) => (
                        <article
                          key={ad.id}
                          className="rounded-xl border border-[#e7e7df] bg-white p-3"
                        >
                          <p className="font-bold text-[#173f3a]">{ad.title}</p>
                          <p className="mt-1 text-xs leading-5 text-[#72807a]">
                            {ad.description}
                          </p>
                          {ad.stats && (
                            <div className="mt-3 grid grid-cols-4 gap-1 border-t border-[#eef0ea] pt-3 text-center text-[11px] font-bold text-[#596963]">
                              <span title="المشاهدات">
                                <Eye className="mx-auto mb-1 text-[#173f3a]" size={15} />
                                {ad.stats.views}
                              </span>
                              <span title="النقرات">
                                <MousePointerClick className="mx-auto mb-1 text-[#c48738]" size={15} />
                                {ad.stats.clicks}
                              </span>
                              <span title="الإعجابات">
                                <Heart className="mx-auto mb-1 text-[#a9584d]" size={15} />
                                {ad.stats.likes}
                              </span>
                              <span title="الإحالات">
                                <Users className="mx-auto mb-1 text-[#39704f]" size={15} />
                                {ad.stats.referrals}
                              </span>
                            </div>
                          )}
                          {ad.reward_campaigns?.map((campaign) => (
                            <div key={campaign.id} className="mt-3 border-t border-[#eef0ea] pt-3 text-xs">
                              <div className="flex items-center justify-between gap-2">
                                <strong className="text-[#173f3a]">{campaign.name}</strong>
                                <span className="text-[#72807a]">{campaign.status}</span>
                              </div>
                              <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg bg-[#f7faf6] p-2 text-center">
                                <span><strong className="block text-[#173f3a]">{campaign.stats.audience_count}</strong><span className="text-[#72807a]">أشخاص</span></span>
                                <span><strong className="block text-[#173f3a]">{campaign.stats.audience_interaction_count}</strong><span className="text-[#72807a]">كل التفاعلات</span></span>
                                <span><strong className="block text-[#173f3a]">{campaign.stats.interaction_count}</strong><span className="text-[#72807a]">تفاعل مؤهل للمكافأة</span></span>
                                <span><strong className="block text-[#c48738]">{campaign.stats.current_entitlement} جنيه</strong><span className="text-[#72807a]">المستحق الحالي</span></span>
                                {campaign.stats.estimated_share !== null && <span><strong className="block text-[#a9584d]">{campaign.stats.estimated_share} جنيه</strong><span className="text-[#72807a]">للتفاعل تقديريًا</span></span>}
                                <span><strong className="block text-[#596963]">{campaign.stats.pending_amount} جنيه / {campaign.stats.pending_points} نقطة</strong><span className="text-[#72807a]">معلّق</span></span>
                                <span><strong className="block text-[#39704f]">{campaign.stats.approved_amount} جنيه / {campaign.stats.approved_points} نقطة</strong><span className="text-[#72807a]">معتمد</span></span>
                              </div>
                            </div>
                          ))}
                        </article>
                      ))}
                      {!ownedAdvertisements.length && (
                        <p className="py-8 text-center text-sm text-[#89918c]">
                          لا توجد إعلانات مقبولة لك حاليًا.
                        </p>
                      )}
                    </div>
                  </aside>
                </div>
              )}
            </>
          )}
          {tab === "ads" && <PublicAdGallery advertisements={advertisements} />}
          {(message || error) && (
            <p
              className={`mt-5 rounded-xl px-3 py-2 text-sm font-bold ${error ? "bg-[#fff0ed] text-[#a9584d]" : "bg-[#e9f7ed] text-[#39704f]"}`}
            >
              {error || (
                <>
                  <CheckCircle2 className="ml-1 inline" size={17} />
                  {message}
                </>
              )}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

export default function SellPage() {
  return (
    <Suspense
      fallback={
        <main
          className="grid min-h-screen place-items-center bg-[#f7f6f2] text-sm text-[#72807a]"
          dir="rtl"
        >
          جار تحميل الصفحة...
        </main>
      }
    >
      <SellPageContent />
    </Suspense>
  );
}
