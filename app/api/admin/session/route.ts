import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authenticatePassword, getSessionIdentity } from "@/lib/admin-auth";

const COOKIE_NAME = "rashefa_admin_session";

function database() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
}

export async function GET(request: NextRequest) {
  const identity = await getSessionIdentity(request);
  let lastSeenAt: string | null = null;
  if (identity?.role === "staff" && identity.employeeId) {
    lastSeenAt = new Date().toISOString();
    const client = database();
    if (client) {
      const { data } = await client.from("employees").update({ last_seen_at: lastSeenAt }).eq("id", identity.employeeId).select("last_seen_at").maybeSingle();
      lastSeenAt = data?.last_seen_at || lastSeenAt;
    }
  }
  return NextResponse.json({ authenticated: Boolean(identity), ...identity, lastSeenAt });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({ pin: "", role: "admin" }));
  const { pin } = body;
  const role = body.role === "staff" ? "staff" : "admin";
  if (typeof pin !== "string") return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
  const identity = await authenticatePassword(role, pin);
  if (!identity) return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
  if (!identity.token) return NextResponse.json({ error: "Session is not configured" }, { status: 503 });
  let lastSeenAt: string | null = null;
  if (role === "staff" && identity.employeeId) {
    lastSeenAt = new Date().toISOString();
    const client = database();
    if (client) {
      const { data } = await client.from("employees").update({ last_seen_at: lastSeenAt }).eq("id", identity.employeeId).select("last_seen_at").maybeSingle();
      lastSeenAt = data?.last_seen_at || lastSeenAt;
    }
  }
  const response = NextResponse.json({ authenticated: true, role, employeeId: identity.employeeId, staffName: identity.staffName, orderRegions: identity.orderRegions, orderRegionMode: identity.orderRegionMode, lastSeenAt });
  response.cookies.set(COOKIE_NAME, identity.token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 8, path: "/" });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(COOKIE_NAME, "", { httpOnly: true, expires: new Date(0), path: "/" });
  return response;
}