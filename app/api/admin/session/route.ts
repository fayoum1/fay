import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "rashefa_admin_session";

function sessionToken() {
  const pin = process.env.ADMIN_PIN;
  return pin ? createHmac("sha256", pin).update("admin-session").digest("hex") : null;
}

function validSession(request: NextRequest) {
  const expected = sessionToken();
  const received = request.cookies.get(COOKIE_NAME)?.value;
  if (!expected || !received || received.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ authenticated: validSession(request) }, { status: validSession(request) ? 200 : 401 });
}

export async function POST(request: NextRequest) {
  const { pin } = await request.json().catch(() => ({ pin: "" }));
  const configuredPin = process.env.ADMIN_PIN;
  if (!configuredPin || typeof pin !== "string" || pin !== configuredPin) return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(COOKIE_NAME, sessionToken()!, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 8, path: "/" });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(COOKIE_NAME, "", { httpOnly: true, expires: new Date(0), path: "/" });
  return response;
}