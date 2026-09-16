/**
 * Reengancha las líneas de pedido que quedaron sin producto.
 *
 * Al migrar desde WooCommerce, varias líneas no encontraron su producto y quedaron
 * sueltas: en la ficha del pedido salen sin foto y sin stock. Este script las une
 * cuando el nombre calza con un único producto del catálogo. Si el nombre se repite
 * en varios productos no adivina: esas quedan igual y el panel ofrece buscarlas.
 *
 *   pnpm tsx scripts/vincular-items.ts --dry     # solo informa
 *   pnpm tsx scripts/vincular-items.ts           # aplica
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const DRY = process.argv.includes("--dry");

async function main() {
  const filas = await db.$queryRaw<{ name: string; productId: string | null; candidatos: bigint }[]>`
    SELECT oi."name",
           (SELECT p."id" FROM "Product" p WHERE lower(p."name") = lower(oi."name") ORDER BY p."createdAt" ASC LIMIT 1) AS "productId",
           (SELECT count(*)::bigint FROM "Product" p WHERE lower(p."name") = lower(oi."name")) AS candidatos
      FROM "OrderItem" oi
     WHERE oi."productId" IS NULL
     GROUP BY oi."name"`;

  const unicos = filas.filter((f) => Number(f.candidatos) === 1 && f.productId);
  const ambiguos = filas.filter((f) => Number(f.candidatos) > 1);
  const huerfanos = filas.filter((f) => Number(f.candidatos) === 0);

  let enganchadas = 0;
  for (const f of unicos) {
    if (DRY) {
      enganchadas += await db.orderItem.count({ where: { productId: null, name: f.name } });
      continue;
    }
    const r = await db.orderItem.updateMany({ where: { productId: null, name: f.name }, data: { productId: f.productId! } });
    enganchadas += r.count;
  }

  const contar = async (nombres: string[]) => (nombres.length ? db.orderItem.count({ where: { productId: null, name: { in: nombres } } }) : 0);
  console.log(DRY ? "SIMULACIÓN (no escribe)" : "Aplicado");
  console.log(`  líneas enganchadas por nombre único: ${enganchadas}`);
  console.log(`  quedan ambiguas (el nombre se repite en varios productos): ${await contar(ambiguos.map((f) => f.name))}`);
  console.log(`  quedan sin producto con ese nombre: ${await contar(huerfanos.map((f) => f.name))}`);
  if (huerfanos.length) console.log("  ejemplos:", huerfanos.slice(0, 5).map((f) => f.name).join(" | "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
