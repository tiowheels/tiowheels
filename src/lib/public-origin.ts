import type { NextRequest } from "next/server";
import { SITE } from "@/lib/site";

const INTERNO = /^(0\.0\.0\.0|127\.0\.0\.1|localhost|\[::\])(:\d+)?$/i;

/**
 * Origen público para armar redirecciones absolutas.
 *
 * Dentro del contenedor de Railway, `req.nextUrl.origin` vale "http://0.0.0.0:8080":
 * es la dirección en la que escucha el servidor, no la que ve el cliente. Una
 * redirección armada con eso manda al navegador a una página que no existe.
 * En producción se usa siempre el dominio configurado; en desarrollo, el local.
 */
export function publicOrigin(req: NextRequest): string {
  if (process.env.NODE_ENV === "production") return SITE.url.replace(/\/$/, "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host && !INTERNO.test(host)) return `${req.headers.get("x-forwarded-proto") ?? "http"}://${host}`;
  return req.nextUrl.origin;
}
