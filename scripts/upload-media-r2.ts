/**
 * Sube storage/media (variantes webp ya generadas) a Cloudflare R2.
 * Reanudable: lista lo que ya existe en el bucket y solo sube lo que falta.
 * Al final verifica que cada ProductImage de la BD tenga sus 3 variantes en R2.
 *
 *   pnpm tsx scripts/upload-media-r2.ts            # sube todo
 *   pnpm tsx scripts/upload-media-r2.ts --verify   # solo verifica
 */
import "dotenv/config";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { MEDIA_DIR, listKeys, putObject, r2Configured } from "../src/lib/storage";
import { IMAGE_VARIANTS, variantKey } from "../src/lib/media";

const CONCURRENCY = Number(process.env.R2_UPLOAD_CONCURRENCY || 16);
const verifyOnly = process.argv.includes("--verify");

async function walk(dir: string, base = ""): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...(await walk(path.join(dir, e.name), rel)));
    else if (!e.name.startsWith(".")) out.push(rel);
  }
  return out;
}

async function main() {
  if (!r2Configured()) throw new Error("Faltan R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET en .env");
  console.log("listando bucket…");
  const existing = await listKeys("products/");
  console.log("en R2:", existing.size, "objetos");

  if (!verifyOnly) {
    const files = await walk(MEDIA_DIR);
    const pending = files.filter((f) => !existing.has(f));
    console.log("locales:", files.length, "· por subir:", pending.length);
    let done = 0;
    let failed = 0;
    let bytes = 0;
    const t0 = Date.now();
    const queue = [...pending];
    async function worker() {
      while (queue.length) {
        const key = queue.shift()!;
        const abs = path.join(MEDIA_DIR, key);
        try {
          const body = await readFile(abs);
          await putObject(key, body);
          bytes += (await stat(abs)).size;
          existing.add(key);
        } catch (e) {
          failed++;
          console.error("fallo", key, String(e).slice(0, 120));
          if (failed > 50) throw new Error("demasiados fallos, revisa credenciales/red");
        }
        if (++done % 500 === 0) {
          const s = (Date.now() - t0) / 1000;
          console.log(`${done}/${pending.length} · ${(bytes / 1e6).toFixed(0)} MB · ${(bytes / 1e6 / s).toFixed(1)} MB/s · fallos ${failed}`);
        }
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    console.log("subida terminada:", done, "archivos ·", (bytes / 1e9).toFixed(2), "GB · fallos", failed);
  }

  // Verificación contra la BD
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  const images = await db.productImage.findMany({ select: { path: true } });
  const missing: string[] = [];
  for (const img of images) {
    for (const v of Object.keys(IMAGE_VARIANTS) as (keyof typeof IMAGE_VARIANTS)[]) {
      const k = variantKey(img.path, v);
      if (!existing.has(k)) missing.push(k);
    }
  }
  await db.$disconnect();
  console.log(`verificación: ${images.length} imágenes en BD · ${missing.length} variantes faltantes en R2`);
  if (missing.length) console.log(missing.slice(0, 10).join("\n"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
