import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const COOKIE_NAME = "rashefa_admin_session";

export type Role = "admin" | "staff";
export type SessionIdentity = { role: Role; employeeId?: number; staffName?: string };

function database() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
}

async function passwordForRole(role: Role) {
  const fallback = role === "admin" ? process.env.ADMIN_PIN : process.env.STAFF_PIN;
  const client = database();
  if (!client) return fallback || null;
  const { data } = await client.from("site_settings").select("admin_password_hash, staff_password_hash").eq("id", 1).maybeSingle();
  return (role === "admin" ? data?.admin_password_hash : data?.staff_password_hash) || fallback || null;
}

async function adminPasswordHash() {
  const client = database();
  if (!client) return process.env.ADMIN_PIN || null;
  const { data } = await client.from("site_settings").select("admin_password_hash").eq("id", 1).maybeSingle();
  return data?.admin_password_hash || process.env.ADMIN_PIN || null;
}

function tokenForCredential(role: Role, id: number | undefined, credential: string) {
  return `${role}.${id || 1}.${createHmac("sha256", credential).update("admin-session").digest("hex")}`;
}

export async function verifyPassword(role: Role, password: string) {
  const configured = role === "admin" ? await adminPasswordHash() : null;
  if (!configured) return false;
  if (!configured.includes(":")) return password === configured;
  const [salt, expectedHex] = configured.split(":");
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export async function authenticatePassword(role: Role, password: string) {
  if (role === "admin") {
    if (!(await verifyPassword(role, password))) return null;
    return { role, token: tokenForCredential(role, undefined, await adminPasswordHash() as string) } satisfies SessionIdentity & { token: string };
  }
  const client = database();
  if (!client) return process.env.STAFF_PIN === password ? { role, employeeId: 0, staffName: "" } : null;
  const { data: employees } = await client.from("employees").select("id, name, password_hash").eq("active", true);
  for (const employee of employees || []) {
    if (verifyStoredPassword(password, employee.password_hash)) {
      return { role, employeeId: employee.id, staffName: employee.name, token: tokenForCredential(role, employee.id, employee.password_hash) } satisfies SessionIdentity & { token: string };
    }
  }
  return null;
}

function verifyStoredPassword(password: string, configured: string) {
  if (!configured.includes(":")) return password === configured;
  const [salt, expectedHex] = configured.split(":");
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function getSessionIdentity(request: NextRequest): Promise<SessionIdentity | null> {
  const received = request.cookies.get(COOKIE_NAME)?.value;
  if (!received) return null;
  const [role, id, signature] = received.split(".");
  if (role === "admin") {
    const password = await adminPasswordHash();
    if (password && signature === createHmac("sha256", password).update("admin-session").digest("hex")) return { role: "admin" };
  }
  if (role === "staff" && Number.isInteger(Number(id))) {
    const client = database();
    const { data: employee } = client ? await client.from("employees").select("id, name, password_hash").eq("id", Number(id)).eq("active", true).maybeSingle() : { data: null };
    if (employee && signature === createHmac("sha256", employee.password_hash).update("admin-session").digest("hex")) return { role: "staff", employeeId: employee.id, staffName: employee.name };
  }
  return null;
}

export async function getAdminRole(request: NextRequest): Promise<Role | null> {
  return (await getSessionIdentity(request))?.role || null;
}
