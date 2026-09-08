import "server-only";
import { headers } from "next/headers";

/**
 * Limitador de intentos en memoria (ventana deslizante). Suficiente para una instancia
 * (Railway). Si el sitio escala a varias instancias, reemplazar por Redis.
 */
type Bucket = { hits: number[]; };
const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, b] of buckets) {
    if (!b.hits.length || b.hits[b.hits.length - 1] < now - 3_600_000) buckets.delete(k);
  }
}

export type LimitResult = { ok: true } | { ok: false; retryAfterSec: number };

/** Registra un intento y dice si se superó el límite de `max` intentos en `windowSec`. */
export function rateLimit(key: string, max: number, windowSec: number): LimitResult {
  const now = Date.now();
  sweep(now);
  const windowMs = windowSec * 1000;
  const b = buckets.get(key) ?? { hits: [] };
  b.hits = b.hits.filter((t) => t > now - windowMs);
  if (b.hits.length >= max) {
    buckets.set(key, b);
    const retryAfterSec = Math.max(1, Math.ceil((b.hits[0] + windowMs - now) / 1000));
    return { ok: false, retryAfterSec };
  }
  b.hits.push(now);
  buckets.set(key, b);
  return { ok: true };
}

/** IP del cliente (Railway/proxies ponen x-forwarded-for). */
export async function clientIp() {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return h.get("x-real-ip") ?? "local";
}

export function retryMessage(r: { retryAfterSec: number }) {
  const m = Math.ceil(r.retryAfterSec / 60);
  return `Demasiados intentos. Espera ${r.retryAfterSec < 90 ? `${r.retryAfterSec} segundos` : `${m} minutos`} y vuelve a intentarlo.`;
}
