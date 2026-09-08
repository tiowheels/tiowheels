import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";

/**
 * Control de acceso a la página pública de un pedido (/pedido/[id]).
 *
 * Quién puede ver el detalle completo:
 *  - el usuario logueado dueño del pedido (mismo userId o mismo email),
 *  - el navegador desde el que se hizo el pedido (cookie `tw_orders`),
 *  - quien haya verificado el email del comprador (cookie `tw_order_ok_<id>`).
 *
 * Las cookies van firmadas con HMAC (AUTH_SECRET) para que no baste con
 * conocer el id del pedido y fabricar la cookie a mano.
 */

export const ORDERS_COOKIE = "tw_orders";
const MAX_REMEMBERED = 20;
const MAX_AGE = 60 * 60 * 24 * 30; // 30 días

export function orderCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  };
}

export function verifiedCookieName(orderId: string) {
  return `tw_order_ok_${orderId}`;
}

/* ---------------- firma ---------------- */

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET no configurado");
  return s;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function seal(payload: string) {
  return `${payload}.${sign(payload)}`;
}

function unseal(value: string | undefined): string | null {
  if (!value) return null;
  const i = value.lastIndexOf(".");
  if (i <= 0) return null;
  const payload = value.slice(0, i);
  const sig = value.slice(i + 1);
  const expected = sign(payload);
  if (sig.length !== expected.length) return null;
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected)) ? payload : null;
  } catch {
    return null;
  }
}

/* ---------------- tw_orders ---------------- */

/** Ids de pedido recordados en la cookie (vacío si no hay o la firma no cuadra). */
export function parseOrdersCookie(value: string | undefined): string[] {
  const payload = unseal(value);
  if (!payload) return [];
  try {
    const ids = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return Array.isArray(ids) ? ids.filter((x): x is string => typeof x === "string" && x.length > 0) : [];
  } catch {
    return [];
  }
}

/** Valor de cookie resultante de agregar `orderId` a la lista actual (máx. 20, el más reciente primero). */
export function ordersCookieValue(current: string | undefined, orderId: string) {
  const ids = [orderId, ...parseOrdersCookie(current).filter((x) => x !== orderId)].slice(0, MAX_REMEMBERED);
  return seal(Buffer.from(JSON.stringify(ids), "utf8").toString("base64url"));
}

/** Recuerda el pedido en el navegador actual (Server Actions / Server Components). */
export async function rememberOrder(orderId: string) {
  const jar = await cookies();
  jar.set(ORDERS_COOKIE, ordersCookieValue(jar.get(ORDERS_COOKIE)?.value, orderId), orderCookieOptions());
}

/** Igual que `rememberOrder`, pero para Route Handlers (escribe en la respuesta). */
export function rememberOrderOnResponse(req: NextRequest, res: NextResponse, orderId: string) {
  res.cookies.set(ORDERS_COOKIE, ordersCookieValue(req.cookies.get(ORDERS_COOKIE)?.value, orderId), orderCookieOptions());
  return res;
}

/* ---------------- tw_order_ok_<id> ---------------- */

/** Marca el pedido como verificado por email en este navegador. */
export async function markOrderVerified(orderId: string) {
  const jar = await cookies();
  jar.set(verifiedCookieName(orderId), seal(orderId), orderCookieOptions());
}

/* ---------------- decisión ---------------- */

type OrderLike = { id: string; userId: string | null; email: string | null };
type UserLike = { id: string; email: string } | null | undefined;

/** ¿Puede este visitante ver el detalle completo del pedido? */
export async function canViewOrder(order: OrderLike, user: UserLike): Promise<boolean> {
  if (user) {
    if (order.userId && order.userId === user.id) return true;
    if (order.email && order.email.toLowerCase() === user.email.toLowerCase()) return true;
  }
  const jar = await cookies();
  if (parseOrdersCookie(jar.get(ORDERS_COOKIE)?.value).includes(order.id)) return true;
  if (unseal(jar.get(verifiedCookieName(order.id))?.value) === order.id) return true;
  return false;
}
