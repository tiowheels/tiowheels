/**
 * Mide el stock inflado por los pedidos que se cancelaron (devolviendo stock)
 * y después se reactivaron sin volver a descontarlo.
 *
 * Huella: al cancelar también se resta el contador de "vendidos"; al reactivar
 * no se vuelve a sumar. Comparando ese contador con las ventas reales sale la
 * cantidad exacta de unidades que quedaron de más en el stock.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import ExcelJS from "exceljs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const APLICAR = process.argv.includes("--aplicar");
const SALIDA = process.argv.find((a) => a.startsWith("--excel="))?.split("=")[1];

async function main() {
  const legado = JSON.parse(readFileSync("data/legacy/products_v3.json", "utf8")) as { id: number; total_sales: number }[];
  const basePorLegacy = new Map(legado.map((p) => [p.id, p.total_sales ?? 0]));

  // Ventas propias (no las migradas) que hoy siguen vigentes
  const vendidas = await db.$queryRaw<{ productId: string; unidades: bigint }[]>`
    SELECT i."productId", sum(i."quantity")::bigint AS unidades
      FROM "OrderItem" i JOIN "Order" o ON o."id" = i."orderId"
     WHERE i."productId" IS NOT NULL
       AND o."channel" IN ('WEB','MANUAL')
       AND o."status" NOT IN ('CANCELLED','REFUNDED')
     GROUP BY i."productId"`;
  const vendidasPorId = new Map(vendidas.map((v) => [v.productId, Number(v.unidades)]));

  const productos = await db.product.findMany({ select: { id: true, legacyId: true, name: true, stock: true, totalSales: true } });
  const afectados: { id: string; name: string; stock: number; sobra: number }[] = [];

  for (const p of productos) {
    const base = p.legacyId ? basePorLegacy.get(p.legacyId) ?? 0 : 0;
    const propias = vendidasPorId.get(p.id) ?? 0;
    const esperado = base + propias;          // lo que debería marcar el contador
    const sobra = esperado - p.totalSales;    // unidades que se devolvieron y nunca se volvieron a descontar
    if (sobra > 0) afectados.push({ id: p.id, name: p.name, stock: p.stock, sobra });
  }

  const unidades = afectados.reduce((a, x) => a + x.sobra, 0);
  console.log(`productos con stock inflado: ${afectados.length} · unidades de más: ${unidades}`);
  for (const a of afectados.slice(0, 40)) console.log(`  ${a.name}: stock ${a.stock} → ${a.stock - a.sobra} (sobran ${a.sobra})`);
  if (afectados.length > 40) console.log(`  … y ${afectados.length - 40} más`);

  const quedanNegativos = afectados.filter((a) => a.stock - a.sobra < 0);
  if (quedanNegativos.length) {
    console.log(`\nOJO: ${quedanNegativos.length} quedarían en negativo, o sea se vendieron sin stock:`);
    for (const a of quedanNegativos) console.log(`  ${a.name}: ${a.stock} → ${a.stock - a.sobra}`);
  }

  if (SALIDA) {
    // Pedidos que se cancelaron solos y después revivieron: el resto los canceló alguien a mano y no deja rastro
    const reactivados = await db.order.findMany({
      where: { adminNote: { contains: "Cancelado automáticamente" }, status: { notIn: ["CANCELLED", "REFUNDED"] } },
      orderBy: { number: "asc" },
      select: { number: true, status: true, createdAt: true, updatedAt: true, total: true, firstName: true, lastName: true, items: { select: { name: true, quantity: true } } },
    });

    const libro = new ExcelJS.Workbook();
    libro.creator = "Tío Wheels";
    const hoja = libro.addWorksheet("Stock a corregir", { views: [{ state: "frozen", ySplit: 1 }] });
    hoja.columns = [
      { header: "Producto", key: "nombre", width: 46 },
      { header: "Stock actual", key: "actual", width: 13 },
      { header: "Unidades de más", key: "sobra", width: 16 },
      { header: "Stock que corresponde", key: "correcto", width: 21 },
      { header: "¿Se vendió sin stock?", key: "negativo", width: 21 },
    ];
    for (const a of afectados.sort((x, y) => y.sobra - x.sobra || x.name.localeCompare(y.name, "es"))) {
      hoja.addRow({ nombre: a.name, actual: a.stock, sobra: a.sobra, correcto: a.stock - a.sobra, negativo: a.stock - a.sobra < 0 ? `Sí, faltan ${Math.abs(a.stock - a.sobra)}` : "" });
    }

    const hoja2 = libro.addWorksheet("Pedidos que revivieron", { views: [{ state: "frozen", ySplit: 1 }] });
    hoja2.columns = [
      { header: "Pedido", key: "n", width: 10 },
      { header: "Estado hoy", key: "estado", width: 14 },
      { header: "Cliente", key: "cliente", width: 28 },
      { header: "Creado", key: "creado", width: 12 },
      { header: "Reactivado", key: "reactivado", width: 18 },
      { header: "Autos", key: "autos", width: 8 },
      { header: "Detalle", key: "detalle", width: 70 },
    ];
    const fecha = (d: Date) => new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Santiago" }).format(d);
    for (const o of reactivados) {
      hoja2.addRow({
        n: o.number,
        estado: o.status,
        cliente: [o.firstName, o.lastName].filter(Boolean).join(" "),
        creado: fecha(o.createdAt),
        reactivado: fecha(o.updatedAt),
        autos: o.items.reduce((a, i) => a + i.quantity, 0),
        detalle: o.items.map((i) => `${i.quantity}x ${i.name}`).join(" · "),
      });
    }

    for (const h of [hoja, hoja2]) {
      const c = h.getRow(1);
      c.font = { bold: true };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFB0D800" } };
      h.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: h.columns.length } };
    }
    await libro.xlsx.writeFile(SALIDA);
    console.log(`\nPlanilla escrita en ${SALIDA}`);
  }

  if (!APLICAR) return console.log("\n(simulación: no se escribió nada en la base; agrega --aplicar para corregir)");

  for (const a of afectados) {
    await db.product.update({ where: { id: a.id }, data: { stock: { decrement: a.sobra }, totalSales: { increment: a.sobra } } });
  }
  console.log(`\nCorregidos ${afectados.length} productos (${unidades} unidades).`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
