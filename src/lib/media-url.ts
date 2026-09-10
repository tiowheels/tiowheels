/** Versión sin dependencias de Node (usable en componentes cliente). */
export const IMAGE_VARIANTS = { thumb: 400, medium: 900, large: 1600 } as const;
export type ImageVariant = keyof typeof IMAGE_VARIANTS;

/**
 * Base pública de las imágenes. Con Cloudflare R2 es el dominio del bucket
 * (NEXT_PUBLIC_MEDIA_BASE_URL, ej. https://media.tiowheels.cl); sin ella se sirven desde /media.
 */
const BASE = (process.env.NEXT_PUBLIC_MEDIA_BASE_URL || "/media").replace(/\/$/, "");

/**
 * Versión de los archivos de imagen. Se sirven con caché de un año, así que al reemplazar el
 * contenido de una imagen existente hay que subir este número para que los navegadores y el CDN
 * vuelvan a pedirla. (v2 = reparación de las fotos cruzadas en la migración, 2026-09-09.)
 */
const MEDIA_VERSION = "2";

export function mediaUrl(basePath: string | null | undefined, variant: ImageVariant = "medium") {
  if (!basePath) return "/placeholder-product.svg";
  const dot = basePath.lastIndexOf(".");
  const stem = dot > 0 ? basePath.slice(0, dot) : basePath;
  const ext = dot > 0 ? basePath.slice(dot) : ".webp";
  return `${BASE}/${stem}-${variant}${ext}?v=${MEDIA_VERSION}`;
}
