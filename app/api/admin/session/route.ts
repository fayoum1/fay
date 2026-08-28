import { NextRequest, NextResponse } from "next/server";
import { authenticatePassword, getSessionIdentity } from "@/lib/admin-auth";

const COOKIE_NAME = "rashefa_admin_session";

export async function GET(request: NextRequest) {
  const identity = await getSessionIdentity(request);
  return NextResponse.json({ authenticated: Boolean(identity), ...identity });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({ pin: "", role: "admin" }));
  const { pin } = body;
  const role = body.role === "staff" ? "staff" : "admin";
  if (typeof pin !== "string") return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
  const identity = await authenticatePassword(role, pin);
  if (!identity) return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
  if (!identity.token) return NextResponse.json({ error: "Session is not configured" }, { status: 503 });
  const response = NextResponse.json({ authenticated: true, role, employeeId: identity.employeeId, staffName: identity.staffName });
  response.cookies.set(COOKIE_NAME, identity.token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 8, path: "/" });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(COOKIE_NAME, "", { httpOnly: true, expires: new Date(0), path: "/" });
  return response;
}