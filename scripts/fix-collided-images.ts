/**
 * Repara las imágenes que quedaron cruzadas en la migración.
 *
 * Causa: la descarga inicial guardó los archivos por NOMBRE (img_7503-compressed.jpeg) en una
 * carpeta plana, pero WooCommerce repite el mismo nombre en carpetas de meses distintos
 * (2025/08/, 2026/05/, 2026/08/…). Los productos que compartían nombre se pisaron entre sí y
 * varios quedaron mostrando la foto de otro auto.
 *
 * Solución: para cada ProductImage cuyo nombre de archivo colisiona, se descarga su `sourceUrl`
 * real, se regeneran las 3 variantes webp y se sobrescriben en R2 con la MISMA clave, así no hay
 * que tocar la base de datos ni cambiar ninguna URL.
 *
 * Reanudable: guarda los ids ya procesados en storage/fix-images.done
 *
 *   pnpm tsx scripts/fix-collided-images.ts            # repara las colisiones
 *   pnpm tsx scripts/fix-collided-images.ts --all      # regenera TODAS las imágenes
 *   pnpm tsx scripts/fix-collided-images.ts --verify   # solo informa, no sube nada
 */
import "dotenv/config";
import path from "node:path";
import { appendFileSync, existsSync, readFileSync, mkdirSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { IMAGE_VARIANTS, renderVariants, variantKey } from "../src/lib/media";
import { putObject, r2Configured } from "../src/lib/storage";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const ROOT = path.resolve(__dirname, "..");
const DONE_FILE = path.join(ROOT, "storage", "fix-images.done");
const CONCURRENCY = Number(process.env.FIX_CONCURRENCY || 10);
const ALL = process.argv.includes("--all");
const VERIFY = process.argv.includes("--verify");

const basename = (url: string) => url.split("/").pop() ?? url;

async function fetchBuffer(url: string) {
  let lastErr: unknown;
  for (let i = 0; i < 4; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(60_000) });
      if (res.ok) return Buffer.from(await res.arrayBuffer());
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
    await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

async function main() {
  if (!r2Configured() && !VERIFY) throw new Error("R2 no configurado (revisa las variables R2_* en .env)");

  const images = await db.productImage.findMany({
    where: { sourceUrl: { not: null } },
    select: { id: true, path: true, sourceUrl: true, product: { select: { stock: true, name: true } } },
    orderBy: [{ product: { stock: "desc" } }, { position: "asc" }],
  });

  // Nombres de archivo que aparecen con más de una URL distinta → son los que se pisaron
  const urlsByName = new Map<string, Set<string>>();
  for (const img of images) {
    const n = basename(img.sourceUrl!);
    const set = urlsByName.get(n) ?? new Set<string>();
    set.add(img.sourceUrl!);
    urlsByName.set(n, set);
  }
  const collided = new Set([...urlsByName.entries()].filter(([, urls]) => urls.size > 1).map(([n]) => n));

  const target = ALL ? images : images.filter((i) => collided.has(basename(i.sourceUrl!)));
  const productosAfectados = new Set(target.map((i) => i.product.name)).size;
  console.log(`imágenes totales: ${images.length}`);
  console.log(`nombres de archivo repetidos: ${collided.size}`);
  console.log(`imágenes a regenerar: ${target.length} (productos distintos: ${productosAfectados})`);
  if (VERIFY) return;

  mkdirSync(path.dirname(DONE_FILE), { recursive: true });
  const done = new Set(existsSync(DONE_FILE) ? readFileSync(DONE_FILE, "utf8").split("\n").filter(Boolean) : []);
  const queue = target.filter((i) => !done.has(i.id));
  console.log(`ya procesadas antes: ${done.size} · pendientes ahora: ${queue.length}`);

  let ok = 0;
  let failed = 0;
  let bytes = 0;
  const t0 = Date.now();
  const fails: string[] = [];

  async function worker() {
    while (queue.length) {
      const img = queue.shift()!;
      try {
        const buf = await fetchBuffer(img.sourceUrl!);
        const { variants } = await renderVariants(buf);
        for (const v of Object.keys(IMAGE_VARIANTS) as (keyof typeof IMAGE_VARIANTS)[]) {
          await putObject(variantKey(img.path, v), variants[v]);
          bytes += variants[v].length;
        }
        appendFileSync(DONE_FILE, img.id + "\n");
        ok++;
      } catch (e) {
        failed++;
        fails.push(`${img.sourceUrl} :: ${String(e).slice(0, 90)}`);
      }
      const total = ok + failed;
      if (total % 250 === 0) {
        const s = (Date.now() - t0) / 1000;
        const rest = queue.length;
        console.log(`${total} listas · ${(bytes / 1e6).toFixed(0)} MB · ${(total / s).toFixed(1)} img/s · fallos ${failed} · quedan ${rest} (~${Math.round(rest / Math.max(total / s, 0.1) / 60)} min)`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`\nlisto: ${ok} regeneradas · ${failed} fallos · ${(bytes / 1e9).toFixed(2)} GB subidos`);
  if (fails.length) console.log("fallos:\n" + fails.slice(0, 20).join("\n"));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
