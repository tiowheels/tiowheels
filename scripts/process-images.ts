/**
 * Convierte las imágenes originales descargadas (storage/legacy-images) en variantes webp
 * dentro de storage/media/products/<productId>/ y crea las filas ProductImage.
 * Reanudable: salta productos que ya tienen imágenes. Primero los productos con stock.
 *
 *   pnpm tsx scripts/process-images.ts
 */
import "dotenv/config";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { storeProductImage } from "../src/lib/media";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "storage/legacy-images");
const map: Record<string, { file: string; alt: string }[]> = JSON.parse(readFileSync(path.join(ROOT, "data/legacy/image-map.json"), "utf8"));

async function main() {
  const products = await db.product.findMany({
    where: { images: { none: {} } },
    select: { id: true, stock: true },
    orderBy: [{ stock: "desc" }, { createdAt: "desc" }],
  });
  console.log("productos sin imágenes:", products.length);
  let done = 0;
  let missing = 0;
  const concurrency = Math.max(2, Math.min(6, os.cpus().length - 1));
  const queue = [...products];
  async function worker() {
    while (queue.length) {
      const p = queue.shift()!;
      const files = map[p.id] ?? [];
      let idx = 0;
      for (const f of files) {
        const abs = path.join(SRC, f.file);
        if (!existsSync(abs)) {
          missing++;
          continue;
        }
        try {
          const stored = await storeProductImage(abs, p.id, idx);
          await db.productImage.create({
            data: { productId: p.id, path: stored.path, alt: f.alt, position: idx, width: stored.width, height: stored.height },
          });
          idx++;
        } catch (e) {
          console.error("error", f.file, String(e).slice(0, 120));
        }
      }
      if (++done % 200 === 0) console.log(`procesados ${done}/${products.length} (faltantes: ${missing})`);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  console.log("listo. procesados:", done, "archivos faltantes:", missing);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
