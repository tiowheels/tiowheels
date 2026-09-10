/**
 * Envía un correo de prueba con la plantilla real de "compra confirmada".
 * Usa un pedido verdadero como muestra, pero reemplaza los datos personales
 * del cliente por datos de prueba, así no se filtra información de nadie.
 *
 *   pnpm tsx --require ./scripts/_no-server-only.cjs scripts/enviar-correo-prueba.ts correo@dominio.cl
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { orderEmailHtml, orderEmailText, orderInclude, getStoreSettings } from "../src/lib/orders";
import { sendMail } from "../src/lib/mail";
import { SITE } from "../src/lib/site";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const DESTINO = process.argv[2];
const MIN_ITEMS = Number(process.argv[3] ?? 3);

async function main() {
  if (!DESTINO) throw new Error("uso: scripts/enviar-correo-prueba.ts correo@dominio.cl [mínimo de ítems]");
  const candidatos = await db.order.findMany({ where: { paymentStatus: "PAID" }, orderBy: { createdAt: "desc" }, take: 60, include: orderInclude });
  const base = candidatos.find((o) => o.items.length >= MIN_ITEMS) ?? candidatos[0];
  if (!base) throw new Error("no hay pedidos pagados en la base");
  const pedido = { ...base, firstName: "Cristóbal", lastName: "Díaz", email: DESTINO, phone: "+56 9 4432 9903", address1: "Av. Prueba 123", address2: "Depto 45", city: "Santiago", region: "Región Metropolitana", rut: null };
  const store = await getStoreSettings();
  const r = await sendMail({
    to: DESTINO,
    subject: `¡Pago confirmado! Pedido #${pedido.number} · ${SITE.name}`,
    html: orderEmailHtml(pedido, store, { forStore: false }),
    text: orderEmailText(pedido, store),
  });
  console.log("destino:", DESTINO);
  console.log("desde:", process.env.SMTP_FROM, "· servidor:", process.env.SMTP_HOST);
  console.log("enlaces apuntan a:", SITE.url);
  console.log(`muestra: pedido #${pedido.number} · ${pedido.items.length} ítems · total ${pedido.total}`);
  console.log("ítems:", pedido.items.map((i) => `${i.quantity}x ${i.name}`).join(" · "));
  console.log("resultado:", JSON.stringify(r));
}
main().catch((e) => { console.error("ERROR:", e instanceof Error ? e.message : e); process.exit(1); }).finally(() => db.$disconnect());
