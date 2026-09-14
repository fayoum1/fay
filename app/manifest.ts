import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let name = "الفيوم للأعلاف والدواجن";

  if (url && key) {
    try {
      const response = await fetch(`${url}/rest/v1/site_settings?id=eq.1&select=name,logo_url`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cache: "no-store",
      });
      const data = await response.json();
      if (data[0]?.name) name = data[0].name;
    } catch {
      // Use the local icon when Supabase is unavailable.
    }
  }

  return {
    name,
    short_name: "الفيوم للأعلاف",
    description: "تطبيق إدارة الطلبات والأصناف",
    lang: "ar",
    dir: "rtl",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f6f2",
    theme_color: "#173f3a",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
