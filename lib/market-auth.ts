import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const MARKET_COOKIE = "market_user_session";

function database() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
}

export function normalizeMarketPhone(value: string) {
  return value.replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))).replace(/\D/g, "");
}

export function hashMarketPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

function verifyMarketPassword(password: string, stored: string) {
  const [salt, expectedHex] = stored.split(":");
  if (!salt || !expectedHex) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function tokenForUser(id: number, passwordHash: string) {
  return `${id}.${createHmac("sha256", passwordHash).update("market-session").digest("hex")}`;
}

async function ensureReferralCode(client: ReturnType<typeof database>, user: { id: number; referral_code?: string | null }) {
  if (!client || user.referral_code) return user.referral_code || null;
  const referralCode = randomBytes(8).toString("hex");
  const { error } = await client.from("market_users").update({ referral_code: referralCode }).eq("id", user.id).is("referral_code", null);
  return error ? null : referralCode;
}

export async function authenticateMarketUser(phone: string, password: string) {
  const client = database();
  if (!client) return null;
  const { data } = await client.from("market_users").select("id,display_name,phone,password_hash,role,account_type,receive_offers,referral_code,profile_image_url,wallet_number").eq("phone", phone).eq("active", true).maybeSingle();
  if (!data || !verifyMarketPassword(password, data.password_hash)) return null;
  data.referral_code = await ensureReferralCode(client, data);
  return { ...data, token: tokenForUser(data.id, data.password_hash) };
}

export async function getMarketUser(request: NextRequest) {
  const received = request.cookies.get(MARKET_COOKIE)?.value;
  if (!received) return null;
  const [idText, signature] = received.split(".");
  const id = Number(idText);
  if (!Number.isInteger(id) || !signature) return null;
  const client = database();
  if (!client) return null;
  const { data } = await client.from("market_users").select("id,display_name,phone,password_hash,role,account_type,receive_offers,referral_code,profile_image_url,wallet_number").eq("id", id).eq("active", true).maybeSingle();
  if (!data || signature !== createHmac("sha256", data.password_hash).update("market-session").digest("hex")) return null;
  data.referral_code = await ensureReferralCode(client, data);
  return data;
}

export function marketDatabase() {
  return database();
}