import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";

const COOKIE_NAME = "rashefa_admin_session";

export function getAdminRole(request: NextRequest): "admin" | "staff" | null {
  const received = request.cookies.get(COOKIE_NAME)?.value;
  if (!received) return null;
  for (const role of ["admin", "staff"] as const) {
    const pin = role === "admin" ? process.env.ADMIN_PIN : process.env.STAFF_PIN;
    const expected = pin ? `${role}.${createHmac("sha256", pin).update("admin-session").digest("hex")}` : "";
    if (expected && received.length === expected.length && timingSafeEqual(Buffer.from(received), Buffer.from(expected))) return role;
  }
  return null;
}
