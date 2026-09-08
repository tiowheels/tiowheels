/**
 * Importa el catálogo, clientes y pedidos de WooCommerce (data/legacy/*.json) a la base de datos.
 * Idempotente: usa legacyId para no duplicar. Las imágenes se procesan aparte (process-images.ts).
 *
 *   pnpm tsx scripts/import-legacy.ts
 */
import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { OrderChannel, OrderStatus, PaymentMethod, PaymentStatus, ShippingMethod } from "../src/generated/prisma/enums";
import { normalizeText, stripHtml } from "../src/lib/format";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const ROOT = path.resolve(__dirname, "..");
const load = <T,>(f: string): T => JSON.parse(readFileSync(path.join(ROOT, "data/legacy", f), "utf8"));

type WcCat = { id: number; name: string; slug: string; parent: number; description: string; image?: { src: string } | null; count: number };
type WcTag = { id: number; name: string; slug: string };
type WcProduct = {
  id: number; name: string; slug: string; date_created: string; description: string; short_description: string;
  price: string; regular_price: string; stock_quantity: number | null; stock_status: string; total_sales: number;
  featured: boolean; status: string; categories: { id: number }[]; tags: { id: number }[];
  images: { id: number; src: string; alt: string }[];
};
type WcCustomer = { id: number; email: string; first_name: string; last_name: string; role: string; date_created: string;
  billing: { first_name: string; last_name: string; address_1: string; address_2: string; city: string; state: string; phone: string };
  meta_data: { key: string; value: unknown }[] };
type WcOrder = {
  id: number; status: string; created_via: string; date_created: string; date_paid: string | null; customer_id: number;
  payment_method: string; payment_method_title: string; total: string; shipping_total: string; discount_total: string;
  billing: { first_name: string; last_name: string; address_1: string; address_2: string; city: string; state: string; email: string; phone: string };
  shipping_lines: { method_id: string; method_title: string; total: string }[];
  line_items: { product_id: number; name: string; quantity: number; price: number; total: string }[];
  customer_note: string; meta_data: { key: string; value: unknown }[];
};

const decode = (s: string) => stripHtml(s);

/** Categorías "de origen": sus hijas son marcas de auto. */
const ORIGIN_SLUGS = new Set(["americanos", "europeos", "japoneses", "camionetas-y-jeeps"]);

async function importCategories(cats: WcCat[]) {
  const byLegacy = new Map<number, string>();
  // primero las raíz, luego hijas
  const sorted = [...cats].sort((a, b) => (a.parent === 0 ? -1 : 1) - (b.parent === 0 ? -1 : 1));
  for (const c of sorted) {
    if (c.slug === "uncategorized") continue;
    const parentId = c.parent ? byLegacy.get(c.parent) ?? null : null;
    const row = await db.category.upsert({
      where: { legacyId: c.id },
      create: { legacyId: c.id, slug: c.slug, name: decode(c.name), description: c.description ? decode(c.description) : null, parentId, imageUrl: c.image?.src ?? null },
      update: { slug: c.slug, name: decode(c.name), parentId, imageUrl: c.image?.src ?? null },
    });
    byLegacy.set(c.id, row.id);
  }
  console.log("categorías:", byLegacy.size);
  return byLegacy;
}

async function importTags(tags: WcTag[]) {
  const byLegacy = new Map<number, string>();
  for (const t of tags) {
    const row = await db.tag.upsert({
      where: { legacyId: t.id },
      create: { legacyId: t.id, slug: t.slug, name: decode(t.name) },
      update: { slug: t.slug, name: decode(t.name) },
    });
    byLegacy.set(t.id, row.id);
  }
  console.log("etiquetas:", byLegacy.size);
  return byLegacy;
}

async function importProducts(products: WcProduct[], cats: WcCat[], catMap: Map<number, string>, tagMap: Map<number, string>) {
  const catByLegacy = new Map(cats.map((c) => [c.id, c]));
  const imageMap: Record<string, { file: string; alt: string }[]> = {};
  const productIdByLegacy = new Map<number, string>();
  let n = 0;
  for (const p of products) {
    // marca = hija de una categoría de origen
    let brand: string | null = null;
    for (const { id } of p.categories) {
      const c = catByLegacy.get(id);
      if (c && c.parent && ORIGIN_SLUGS.has(catByLegacy.get(c.parent)?.slug ?? "")) {
        brand = decode(c.name).replace(/\s+(camionetas y jeeps|americanos)$/i, "").trim();
        break;
      }
    }
    const description = p.description ? decode(p.description) : null;
    const categoryNames = p.categories.map((c) => decode(catByLegacy.get(c.id)?.name ?? "")).join(" ");
    const searchText = normalizeText([p.name, brand ?? "", description ?? "", categoryNames].join(" "));
    const stock = Math.max(0, p.stock_quantity ?? (p.stock_status === "instock" ? 1 : 0));
    const row = await db.product.upsert({
      where: { legacyId: p.id },
      create: {
        legacyId: p.id,
        slug: p.slug,
        name: decode(p.name),
        description,
        price: Math.round(Number(p.price || p.regular_price || 0)),
        stock,
        status: p.status === "publish" ? "ACTIVE" : "DRAFT",
        featured: p.featured,
        brand,
        searchText,
        totalSales: p.total_sales ?? 0,
        createdAt: new Date(p.date_created),
        categories: { connect: p.categories.map((c) => catMap.get(c.id)).filter(Boolean).map((id) => ({ id: id! })) },
        tags: { connect: p.tags.map((t) => tagMap.get(t.id)).filter(Boolean).map((id) => ({ id: id! })) },
      },
      update: {
        name: decode(p.name),
        description,
        price: Math.round(Number(p.price || p.regular_price || 0)),
        stock,
        brand,
        searchText,
        totalSales: p.total_sales ?? 0,
        categories: { set: p.categories.map((c) => catMap.get(c.id)).filter(Boolean).map((id) => ({ id: id! })) },
        tags: { set: p.tags.map((t) => tagMap.get(t.id)).filter(Boolean).map((id) => ({ id: id! })) },
      },
    });
    productIdByLegacy.set(p.id, row.id);
    imageMap[row.id] = p.images.map((i) => ({ file: path.basename(new URL(i.src).pathname), alt: i.alt || decode(p.name) }));
    if (++n % 500 === 0) console.log("productos:", n);
  }
  writeFileSync(path.join(ROOT, "data/legacy/image-map.json"), JSON.stringify(imageMap));
  console.log("productos:", n, "→ image-map.json");
  return productIdByLegacy;
}

async function importCustomers(customers: WcCustomer[]) {
  const byLegacy = new Map<number, string>();
  let n = 0;
  for (const c of customers) {
    if (!c.email || c.role === "administrator") continue;
    const email = c.email.trim().toLowerCase();
    const shippingMeta = c.meta_data.find((m) => m.key === "shipping_method");
    const row = await db.user.upsert({
      where: { email },
      create: {
        legacyId: c.id,
        email,
        name: (c.first_name || c.billing.first_name || "").trim() || null,
        lastName: (c.last_name || c.billing.last_name || "").trim() || null,
        phone: c.billing.phone || null,
        address1: c.billing.address_1 || null,
        address2: c.billing.address_2 || null,
        city: c.billing.city || null,
        region: c.billing.state || null,
        role: "CUSTOMER",
        createdAt: new Date(c.date_created),
      },
      update: {},
    });
    void shippingMeta;
    byLegacy.set(c.id, row.id);
    n++;
  }
  console.log("clientes:", n);
  return byLegacy;
}

const STATUS: Record<string, OrderStatus> = {
  completed: "COMPLETED",
  processing: "PROCESSING",
  "on-hold": "PENDING",
  pending: "PENDING",
  cancelled: "CANCELLED",
  refunded: "REFUNDED",
  failed: "CANCELLED",
};

async function importOrders(orders: WcOrder[], productMap: Map<number, string>, userMap: Map<number, string>) {
  let n = 0;
  for (const o of orders) {
    const isApp = o.created_via === "rest-api";
    const channel: OrderChannel = isApp ? "LEGACY_APP" : "LEGACY_WEB";
    const paymentMethod: PaymentMethod = o.payment_method === "transbank_webpay_plus_rest" ? "WEBPAY_LEGACY" : o.payment_method === "bacs" ? "TRANSFER" : "OTHER";
    const status = STATUS[o.status] ?? "PENDING";
    const paymentStatus: PaymentStatus = status === "COMPLETED" || status === "PROCESSING" ? "PAID" : status === "REFUNDED" ? "REFUNDED" : "UNPAID";
    const ship = o.shipping_lines[0];
    const shippingMethod: ShippingMethod = !ship ? "NONE" : /retiro/i.test(ship.method_title) ? "PICKUP" : "DELIVERY_COD";
    const rut = o.meta_data.find((m) => m.key === "rut_")?.value;
    const webpay = o.meta_data.filter((m) => ["transactionStatus", "authorizationCode", "cardNumber", "paymentType", "amount", "transactionDate", "buyOrder"].includes(m.key));
    const total = Math.round(Number(o.total));
    const subtotal = o.line_items.reduce((s, li) => s + Math.round(Number(li.total)), 0);
    await db.order.upsert({
      where: { legacyId: o.id },
      create: {
        legacyId: o.id,
        number: o.id, // conserva el número de pedido de WooCommerce
        userId: o.customer_id ? userMap.get(o.customer_id) ?? null : null,
        status,
        channel,
        paymentMethod,
        paymentStatus,
        subtotal,
        shippingCost: Math.round(Number(o.shipping_total || 0)),
        discount: Math.round(Number(o.discount_total || 0)),
        total,
        firstName: (o.billing.first_name || "Cliente").trim(),
        lastName: o.billing.last_name?.trim() || null,
        email: o.billing.email?.trim().toLowerCase() || null,
        phone: o.billing.phone || null,
        rut: rut ? String(rut) : null,
        shippingMethod,
        address1: o.billing.address_1 || null,
        address2: o.billing.address_2 || null,
        city: o.billing.city || null,
        region: o.billing.state || null,
        customerNote: o.customer_note || null,
        adminNote: isApp ? "Venta registrada desde la app móvil de WooCommerce" : null,
        paidAt: o.date_paid ? new Date(o.date_paid) : paymentStatus === "PAID" ? new Date(o.date_created) : null,
        createdAt: new Date(o.date_created),
        items: {
          create: o.line_items.map((li) => ({
            productId: productMap.get(li.product_id) ?? null,
            name: decode(li.name),
            price: Math.round(Number(li.price)),
            quantity: li.quantity,
            total: Math.round(Number(li.total)),
          })),
        },
        payments: webpay.length
          ? {
              create: {
                provider: "WEBPAY_LEGACY",
                amount: total,
                status: "paid",
                raw: Object.fromEntries(webpay.map((m) => [m.key, m.value])) as object,
              },
            }
          : undefined,
      },
      update: { status, paymentStatus },
    });
    if (++n % 300 === 0) console.log("pedidos:", n);
  }
  console.log("pedidos:", n);
}

async function main() {
  const cats = load<WcCat[]>("categories.json");
  const tags = load<WcTag[]>("tags.json");
  const products = load<WcProduct[]>("products_v3.json");
  const customers = load<WcCustomer[]>("customers.json");
  const orders = load<WcOrder[]>("orders.json");

  const catMap = await importCategories(cats);
  const tagMap = await importTags(tags);
  const productMap = await importProducts(products, cats, catMap, tagMap);
  const userMap = await importCustomers(customers);
  await importOrders(orders, productMap, userMap);

  // Reajusta la secuencia de pedidos por encima del máximo importado
  const max = await db.order.aggregate({ _max: { number: true } });
  const next = Math.max(40000, (max._max.number ?? 0) + 1);
  await db.$executeRawUnsafe(`ALTER SEQUENCE "Order_number_seq" RESTART WITH ${next}`);
  console.log("siguiente número de pedido:", next);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
