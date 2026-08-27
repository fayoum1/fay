import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "rashefa_admin_session";

function sessionToken(role: "admin" | "staff") {
  const pin = role === "admin" ? process.env.ADMIN_PIN : process.env.STAFF_PIN;
  return pin ? `${role}.${createHmac("sha256", pin).update("admin-session").digest("hex")}` : null;
}

function sessionRole(request: NextRequest): "admin" | "staff" | null {
  const received = request.cookies.get(COOKIE_NAME)?.value;
  if (!received) return null;
  for (const role of ["admin", "staff"] as const) { const expected = sessionToken(role); if (expected && received.length === expected.length && timingSafeEqual(Buffer.from(received), Buffer.from(expected))) return role; }
  return null;
}

export async function GET(request: NextRequest) {
  const role = sessionRole(request);
  return NextResponse.json({ authenticated: Boolean(role), role });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({ pin: "", role: "admin" }));
  const { pin } = body;
  const role = body.role === "staff" ? "staff" : "admin";
  const configuredPin = role === "admin" ? process.env.ADMIN_PIN : process.env.STAFF_PIN;
  if (!configuredPin || typeof pin !== "string" || pin !== configuredPin) return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
  const response = NextResponse.json({ authenticated: true, role });
  response.cookies.set(COOKIE_NAME, sessionToken(role)!, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 8, path: "/" });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(COOKIE_NAME, "", { httpOnly: true, expires: new Date(0), path: "/" });
  return response;
}