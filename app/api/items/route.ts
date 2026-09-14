import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const database = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await database.from("items").select("*").eq("active", true).order("updated_at", { ascending: false }).order("id", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const recentItems = (data || []).slice(0, 3);
  const remainingItems = (data || []).slice(3);
  const priceModeOrder: Record<string, number> = {
    fixed: 0,
    discount: 1,
    market: 2,
    exchange: 3,
    free: 4,
  };
  remainingItems.sort(
    (left, right) =>
      (priceModeOrder[left.price_mode] ?? Number.MAX_SAFE_INTEGER) -
        (priceModeOrder[right.price_mode] ?? Number.MAX_SAFE_INTEGER) ||
      new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime(),
  );
  return NextResponse.json([...recentItems, ...remainingItems]);
}
