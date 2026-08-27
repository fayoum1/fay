import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminRole } from "@/lib/admin-auth";

function database() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && serviceKey ? createClient(url, serviceKey, { auth: { persistSession: false } }) : null;
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

async function itemData(request: NextRequest, client: ReturnType<typeof database>) {
  const form = await request.formData();
  const image = form.get("image");
  let image_url = String(form.get("image_url") || "") || undefined;
  if (image instanceof File && client) {
    if (!image.type.startsWith("image/") || image.size > 5 * 1024 * 1024) throw new Error("Invalid image");
    const path = `${Date.now()}-${image.name.replace(/[^a-zA-Z0-9._-]/g, "")}`;
    const upload = await client.storage.from("item-images").upload(path, image, { contentType: image.type, upsert: true });
    if (upload.error) throw new Error(upload.error.message);
    image_url = client.storage.from("item-images").getPublicUrl(path).data.publicUrl;
  }
  const allowedModes = ["fixed", "market", "exchange", "free", "discount"];
  const price_mode = allowedModes.includes(String(form.get("price_mode"))) ? String(form.get("price_mode")) : "fixed";
  const discount_percent = price_mode === "discount" ? Number(form.get("discount_percent")) : 0;
  if (price_mode === "discount" && (!Number.isFinite(discount_percent) || discount_percent < 0 || discount_percent > 100)) throw new Error("Invalid discount");
  return { id: form.get("id") ? Number(form.get("id")) : undefined, name: String(form.get("name") || ""), category: String(form.get("category") || "عام"), price: price_mode === "fixed" || price_mode === "discount" ? Number(form.get("price")) : 0, price_mode, discount_percent, emoji: String(form.get("emoji") || "☕"), image_url };
}

export async function POST(request: NextRequest) {
  if (getAdminRole(request) !== "admin") return unauthorized();
  const client = database();
  if (!client) return NextResponse.json({ error: "Supabase service key is not configured" }, { status: 503 });
  let body;
  try { body = await itemData(request, client); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid item" }, { status: 400 }); }
  const { data, error } = await client.from("items").insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  if (getAdminRole(request) !== "admin") return unauthorized();
  const client = database();
  if (!client) return NextResponse.json({ error: "Supabase service key is not configured" }, { status: 503 });
  let body;
  try { body = await itemData(request, client); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid item" }, { status: 400 }); }
  const update = { name: body.name, category: body.category, price: body.price, price_mode: body.price_mode, discount_percent: body.discount_percent, emoji: body.emoji, ...(body.image_url ? { image_url: body.image_url } : {}) };
  const { data, error } = await client.from("items").update(update).eq("id", body.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  if (getAdminRole(request) !== "admin") return unauthorized();
  const { id } = await request.json();
  const client = database();
  if (!client) return NextResponse.json({ error: "Supabase service key is not configured" }, { status: 503 });
  const { error } = await client.from("items").update({ active: false }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
