/**
 * Almacenamiento de archivos de medios: Cloudflare R2 (API S3) en producción, disco local en desarrollo.
 * Se elige por variables de entorno: si existen R2_BUCKET + credenciales, se usa R2.
 *
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
 *   NEXT_PUBLIC_MEDIA_BASE_URL  → dominio público del bucket (ej. https://media.tiowheels.cl o https://pub-xxxx.r2.dev)
 */
import path from "node:path";
import { mkdir, writeFile, unlink, stat } from "node:fs/promises";
import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

export const STORAGE_DIR = path.resolve(/* turbopackIgnore: true */ process.env.STORAGE_DIR || "./storage");
export const MEDIA_DIR = path.join(STORAGE_DIR, "media");

export function r2Configured() {
  return Boolean(process.env.R2_BUCKET && process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY);
}

let client: S3Client | null = null;
export function r2() {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! },
    });
  }
  return client;
}

const MIME: Record<string, string> = { ".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml", ".gif": "image/gif", ".pdf": "application/pdf" };

export function contentTypeFor(key: string) {
  return MIME[path.extname(key).toLowerCase()] ?? "application/octet-stream";
}

/** Guarda un archivo (clave relativa, ej. products/abc/0-xyz-thumb.webp). */
export async function putObject(key: string, body: Buffer) {
  if (r2Configured()) {
    await r2().send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key, Body: body, ContentType: contentTypeFor(key), CacheControl: "public, max-age=31536000, immutable" }));
    return;
  }
  const abs = path.join(MEDIA_DIR, key);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, body);
}

export async function deleteObject(key: string) {
  if (r2Configured()) {
    await r2().send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key })).catch(() => {});
    return;
  }
  const abs = path.join(MEDIA_DIR, key);
  try {
    await stat(abs);
    await unlink(abs);
  } catch {
    /* no existe */
  }
}

export async function objectExists(key: string) {
  if (r2Configured()) {
    try {
      await r2().send(new HeadObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key }));
      return true;
    } catch {
      return false;
    }
  }
  try {
    await stat(path.join(MEDIA_DIR, key));
    return true;
  } catch {
    return false;
  }
}

/** Lista todas las claves con un prefijo (R2). Útil para sincronizaciones. */
export async function listKeys(prefix = "") {
  const keys = new Set<string>();
  let token: string | undefined;
  do {
    const res = await r2().send(new ListObjectsV2Command({ Bucket: process.env.R2_BUCKET, Prefix: prefix, ContinuationToken: token, MaxKeys: 1000 }));
    for (const o of res.Contents ?? []) if (o.Key) keys.add(o.Key);
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return keys;
}
