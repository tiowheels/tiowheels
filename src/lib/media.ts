import path from "node:path";
import sharp from "sharp";
import { MEDIA_DIR, putObject, deleteObject } from "./storage";

/**
 * Imágenes de producto. Cada una se guarda en 3 variantes webp:
 *   thumb (400px), medium (900px), large (1600px).
 * El destino (Cloudflare R2 o disco local) lo decide `@/lib/storage` según las variables de entorno.
 * Las URLs públicas las construye `mediaUrl()` en `@/lib/media-url`.
 */

export { STORAGE_DIR, MEDIA_DIR } from "./storage";
export const IMAGE_VARIANTS = { thumb: 400, medium: 900, large: 1600 } as const;
export type ImageVariant = keyof typeof IMAGE_VARIANTS;

export { mediaUrl } from "./media-url";

const SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/;

/** Resuelve una ruta relativa dentro de MEDIA_DIR (solo modo disco). Rechaza cualquier segmento sospechoso. */
export function safeMediaPath(rel: string) {
  const parts = rel.split("/").filter(Boolean);
  if (!parts.length || parts.length > 8) throw new Error("Ruta inválida");
  for (const seg of parts) {
    if (seg === "." || seg === ".." || !SEGMENT.test(seg)) throw new Error("Ruta inválida");
  }
  const abs = path.resolve(MEDIA_DIR, ...parts);
  if (abs !== MEDIA_DIR && !abs.startsWith(MEDIA_DIR + path.sep)) throw new Error("Ruta inválida");
  return abs;
}

/** Clave de una variante a partir del path base guardado en la BD. */
export function variantKey(basePath: string, variant: ImageVariant) {
  const ext = path.extname(basePath);
  return `${basePath.slice(0, -ext.length)}-${variant}${ext}`;
}

/** Genera las 3 variantes webp de una imagen y devuelve los buffers. */
export async function renderVariants(input: Buffer | string) {
  const image = sharp(input, { failOn: "none" }).rotate();
  const meta = await image.metadata();
  const out = {} as Record<ImageVariant, Buffer>;
  for (const [variant, size] of Object.entries(IMAGE_VARIANTS) as [ImageVariant, number][]) {
    out[variant] = await image
      .clone()
      .resize({ width: size, height: size, fit: "inside", withoutEnlargement: true })
      .webp({ quality: variant === "thumb" ? 78 : 82 })
      .toBuffer();
  }
  return { variants: out, width: meta.width ?? 0, height: meta.height ?? 0 };
}

/**
 * Procesa una imagen (buffer o ruta) y sube las variantes al almacenamiento configurado.
 * Devuelve el path base que se guarda en ProductImage.path, más dimensiones originales.
 */
export async function storeProductImage(input: Buffer | string, productId: string, index: number): Promise<{ path: string; width: number; height: number }> {
  const stem = `${index}-${Date.now().toString(36)}`;
  const basePath = `products/${productId}/${stem}.webp`;
  const { variants, width, height } = await renderVariants(input);
  await Promise.all((Object.keys(variants) as ImageVariant[]).map((v) => putObject(variantKey(basePath, v), variants[v])));
  return { path: basePath, width, height };
}

export async function deleteProductImageFiles(basePath: string) {
  await Promise.all((Object.keys(IMAGE_VARIANTS) as ImageVariant[]).map((v) => deleteObject(variantKey(basePath, v))));
}
