/**
 * Producción (Railway): regenera en el volumen las imágenes cuyo archivo no existe,
 * descargando el original desde ProductImage.sourceUrl (sitio antiguo) y creando las variantes webp
 * con el MISMO path que ya está en la base de datos. Reanudable y seguro de repetir.
 *
 *   pnpm tsx scripts/rehydrate-images.ts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { IMAGE_VARIANTS, renderVariants, variantKey } from "../src/lib/media";
import { objectExists, putObject } from "../src/lib/storage";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const CONCURRENCY = Number(process.env.REHYDRATE_CONCURRENCY || 4);

async function fetchBuffer(url: string) {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (res.ok) return Buffer.from(await res.arrayBuffer());
    } catch {}
    await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
  }
  throw new Error(`no se pudo descargar ${url}`);
}

async function main() {
  const images = await db.productImage.findMany({
    where: { sourceUrl: { not: null } },
    select: { id: true, path: true, sourceUrl: true, product: { select: { stock: true } } },
    orderBy: { product: { stock: "desc" } },
  });
  const pending: typeof images = [];
  for (const i of images) if (!(await objectExists(variantKey(i.path, "medium")))) pending.push(i);
  console.log(`imágenes: ${images.length} · faltantes: ${pending.length}`);
  let done = 0;
  let failed = 0;
  const queue = [...pending];
  async function worker() {
    while (queue.length) {
      const img = queue.shift()!;
      try {
        const buf = await fetchBuffer(img.sourceUrl!);
        const { variants } = await renderVariants(buf);
        for (const v of Object.keys(IMAGE_VARIANTS) as (keyof typeof IMAGE_VARIANTS)[]) await putObject(variantKey(img.path, v), variants[v]);
      } catch (e) {
        failed++;
        console.error("fallo", img.path, String(e).slice(0, 100));
      }
      if (++done % 200 === 0) console.log(`${done}/${pending.length} (fallos ${failed})`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log("listo:", done, "fallos:", failed);
}
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
