import { createClient } from "@supabase/supabase-js";

export async function getSiteLogoDataUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  try {
    const database = createClient(url, key, { auth: { persistSession: false } });
    const { data } = await database.from("site_settings").select("logo_url").eq("id", 1).maybeSingle();
    if (!data?.logo_url) return null;
    const response = await fetch(data.logo_url, { cache: "no-store" });
    if (!response.ok) return null;
    const type = response.headers.get("content-type") || "image/png";
    const bytes = Buffer.from(await response.arrayBuffer()).toString("base64");
    return `data:${type};base64,${bytes}`;
  } catch {
    return null;
  }
}
