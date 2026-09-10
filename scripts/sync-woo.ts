/**
 * Sincroniza la tienda nueva con lo que va pasando en el WooCommerce antiguo.
 * Se conecta a la API REST de tiowheels.cl y trae categorías, etiquetas, productos,
 * clientes y pedidos. Es idempotente: se puede correr las veces que haga falta,
 * incluida la pasada final justo antes de cambiar el DNS.
 *
 * Qué toca y qué NO:
 *   - Pedidos y clientes: crea los que faltan. De los que ya existen solo actualiza el estado.
 *   - Productos ya migrados: actualiza únicamente precio, stock, estado y ventas.
 *     El nombre, la descripción, las fotos y las categorías NO se tocan, para no pisar
 *     lo que Cristóbal edite en el panel nuevo.
 *   - Productos nuevos del sitio antiguo: se crean completos y se bajan sus fotos.
 *
 *   pnpm tsx scripts/sync-woo.ts                  # todo
 *   pnpm tsx scripts/sync-woo.ts --desde=2026-09-07   # solo lo modificado desde esa fecha
 *   pnpm tsx scripts/sync-woo.ts --solo=pedidos,clientes
 *   pnpm tsx scripts/sync-woo.ts --dry            # solo informa, no escribe
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { OrderChannel, OrderStatus, PaymentMethod, PaymentStatus, ShippingMethod } from "../src/generated/prisma/enums";
import { normalizeText, stripHtml, slugify } from "../src/lib/format";
import { storeProductImage } from "../src/lib/media";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const BASE = process.env.WOO_URL ?? "https://tiowheels.cl";
const CK = process.env.WOO_KEY ?? "";
const CS = process.env.WOO_SECRET ?? "";

const args = process.argv.slice(2);
const arg = (n: string) => args.find((a) => a.startsWith(`--${n}=`))?.split("=").slice(1).join("=");
const DRY = args.includes("--dry");
const DESDE = arg("desde");
const SOLO = (arg("solo") ?? "categorias,etiquetas,productos,clientes,pedidos").split(",").map((s) => s.trim());
const hace = (paso: string) => SOLO.includes(paso);

const decode = (s: string) => stripHtml(s ?? "");
const num = (v: unknown) => Math.round(Number(v ?? 0)) || 0;

/* ---------- API ---------- */

type Pagina<T> = { items: T[]; total: number; paginas: number };

async function traerPagina<T>(recurso: string, params: Record<string, string>): Promise<Pagina<T>> {
  const url = new URL(`${BASE}/wp-json/wc/v3/${recurso}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const auth = Buffer.from(`${CK}:${CS}`).toString("base64");
  for (let intento = 1; intento <= 4; intento++) {
    const r = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
    if (r.ok) {
      return { items: (await r.json()) as T[], total: Number(r.headers.get("x-wp-total") ?? 0), paginas: Number(r.headers.get("x-wp-totalpages") ?? 0) };
    }
    if (r.status === 401 || r.status === 403) throw new Error(`${recurso}: credenciales rechazadas (${r.status})`);
    if (intento === 4) throw new Error(`${recurso}: ${r.status} ${(await r.text()).slice(0, 200)}`);
    await new Promise((res) => setTimeout(res, 1500 * intento));
  }
  throw new Error("inalcanzable");
}

/** Recorre todas las páginas de un recurso. */
async function* traerTodo<T>(recurso: string, params: Record<string, string> = {}, porPagina = 100) {
  let page = 1;
  let paginas = 1;
  do {
    const r = await traerPagina<T>(recurso, { ...params, per_page: String(porPagina), page: String(page) });
    paginas = r.paginas || 1;
    if (page === 1) console.log(`  ${recurso}: ${r.total} en ${paginas} páginas`);
    yield r.items;
    page++;
  } while (page <= paginas);
}

/* ---------- Tipos de WooCommerce ---------- */

type WcCat = { id: number; name: string; slug: string; parent: number; description: string; image?: { src: string } | null };
type WcTag = { id: number; name: string; slug: string };
type WcProduct = {
  id: number; name: string; slug: string; date_created: string; description: string; short_description: string;
  price: string; regular_price: string; sale_price: string; stock_quantity: number | null; stock_status: string;
  total_sales: number; featured: boolean; status: string; categories: { id: number }[]; tags: { id: number }[];
  images: { id: number; src: string; alt: string }[];
};
type WcCustomer = { id: number; email: string; first_name: string; last_name: string; role: string; date_created: string;
  billing: { first_name: string; last_name: string; address_1: string; address_2: string; city: string; state: string; phone: string } };
type WcOrder = {
  id: number; status: string; created_via: string; date_created: string; date_paid: string | null; customer_id: number;
  payment_method: string; total: string; shipping_total: string; discount_total: string;
  billing: { first_name: string; last_name: string; address_1: string; address_2: string; city: string; state: string; email: string; phone: string };
  shipping_lines: { method_id: string; method_title: string; total: string }[];
  line_items: { product_id: number; name: string; quantity: number; price: number; total: string }[];
  customer_note: string; meta_data: { key: string; value: unknown }[];
};

const resumen: Record<string, number> = {};
const suma = (k: string, n = 1) => (resumen[k] = (resumen[k] ?? 0) + n);

/* ---------- Categorías y etiquetas ---------- */

async function syncCategorias() {
  const todas: WcCat[] = [];
  for await (const lote of traerTodo<WcCat>("products/categories")) todas.push(...lote);
  const previas = await db.category.findMany({ where: { legacyId: { not: null } }, select: { id: true, legacyId: true } });
  const byLegacy = new Map<number, string>(previas.map((c) => [c.legacyId!, c.id]));
  const ordenadas = [...todas].sort((a, b) => (a.parent === 0 ? -1 : 1) - (b.parent === 0 ? -1 : 1));
  for (const c of ordenadas) {
    if (c.slug === "uncategorized") continue;
    if (byLegacy.has(c.id)) continue;
    if (DRY) {
      suma("categorías nuevas");
      continue;
    }
    const row = await db.category.create({
      data: { legacyId: c.id, slug: c.slug, name: decode(c.name), description: c.description ? decode(c.description) : null, parentId: c.parent ? byLegacy.get(c.parent) ?? null : null, imageUrl: c.image?.src ?? null },
    });
    byLegacy.set(c.id, row.id);
    suma("categorías nuevas");
  }
  return byLegacy;
}

async function syncEtiquetas() {
  const previas = await db.tag.findMany({ where: { legacyId: { not: null } }, select: { id: true, legacyId: true } });
  const byLegacy = new Map<number, string>(previas.map((t) => [t.legacyId!, t.id]));
  for await (const lote of traerTodo<WcTag>("products/tags")) {
    for (const t of lote) {
      if (byLegacy.has(t.id)) continue;
      if (DRY) {
        suma("etiquetas nuevas");
        continue;
      }
      const row = await db.tag.create({ data: { legacyId: t.id, slug: t.slug, name: decode(t.name) } });
      byLegacy.set(t.id, row.id);
      suma("etiquetas nuevas");
    }
  }
  return byLegacy;
}

/* ---------- Productos ---------- */

async function bajarImagenes(productId: string, imagenes: { src: string; alt: string }[], nombre: string) {
  let position = 0;
  for (const img of imagenes.slice(0, 12)) {
    try {
      const r = await fetch(img.src);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const buf = Buffer.from(await r.arrayBuffer());
      const stored = await storeProductImage(buf, productId, position);
      await db.productImage.create({ data: { productId, path: stored.path, width: stored.width, height: stored.height, position, alt: img.alt || nombre, sourceUrl: img.src } });
      position++;
      suma("fotos bajadas");
    } catch (e) {
      console.warn("    foto no bajada", img.src, e instanceof Error ? e.message : e);
    }
  }
}

async function syncProductos(catMap: Map<number, string>, tagMap: Map<number, string>) {
  const previos = await db.product.findMany({ where: { legacyId: { not: null } }, select: { id: true, legacyId: true, price: true, compareAtPrice: true, stock: true, status: true } });
  const porLegacy = new Map(previos.map((p) => [p.legacyId!, p]));
  const slugsUsados = new Set((await db.product.findMany({ select: { slug: true } })).map((p) => p.slug));
  const nombreCat = new Map((await db.category.findMany({ select: { id: true, name: true } })).map((c) => [c.id, c.name]));
  console.log(`  ya migrados: ${porLegacy.size} productos`);
  const params: Record<string, string> = { status: "any", orderby: "id", order: "asc" };
  if (DESDE) params.modified_after = `${DESDE}T00:00:00`;
  for await (const lote of traerTodo<WcProduct>("products", params)) {
    for (const p of lote) {
      const stock = p.stock_quantity ?? (p.stock_status === "instock" ? 1 : 0);
      const precio = num(p.price) || num(p.regular_price);
      const antes = num(p.regular_price) > precio ? num(p.regular_price) : null;
      const estado = p.status === "publish" ? "ACTIVE" : p.status === "draft" ? "DRAFT" : "ARCHIVED";
      const existente = porLegacy.get(p.id);

      if (existente) {
        const cambia = existente.price !== precio || existente.stock !== stock || existente.status !== estado || (existente.compareAtPrice ?? null) !== antes;
        if (!cambia) continue;
        if (!DRY) {
          await db.product.update({
            where: { id: existente.id },
            // solo lo operativo: lo editado en el panel nuevo se respeta
            data: { price: precio, compareAtPrice: antes, stock, status: estado, totalSales: p.total_sales ?? 0 },
          });
        }
        suma("productos actualizados");
        continue;
      }

      // Producto nuevo del sitio antiguo: se crea completo
      if (DRY) {
        suma("productos nuevos");
        continue;
      }
      const nombre = decode(p.name);
      const descripcion = decode(p.description) || decode(p.short_description) || null;
      const catIds = p.categories.map((c) => catMap.get(c.id)).filter((v): v is string => Boolean(v));
      const tagIds = p.tags.map((t) => tagMap.get(t.id)).filter((v): v is string => Boolean(v));
      const nombresCat = catIds.map((id) => nombreCat.get(id)).filter((v): v is string => Boolean(v));
      const creado = await db.product.create({
        data: {
          legacyId: p.id,
          name: nombre,
          slug: slugLibre(p.slug || slugify(nombre), slugsUsados),
          description: descripcion,
          price: precio,
          compareAtPrice: antes,
          stock,
          status: estado,
          featured: p.featured,
          totalSales: p.total_sales ?? 0,
          listedAt: new Date(),
          createdAt: p.date_created ? new Date(p.date_created) : undefined,
          searchText: normalizeText([nombre, descripcion ?? "", ...nombresCat].join(" ")),
          categories: { connect: catIds.map((id) => ({ id })) },
          tags: { connect: tagIds.map((id) => ({ id })) },
        },
        select: { id: true },
      });
      suma("productos nuevos");
      await bajarImagenes(creado.id, p.images.map((i) => ({ src: i.src, alt: i.alt })), nombre);
    }
    process.stdout.write(".");
  }
  console.log();
}

function slugLibre(base: string, usados: Set<string>) {
  const limpio = slugify(base) || "producto";
  for (let i = 0; i < 200; i++) {
    const s = i === 0 ? limpio : `${limpio}-${i + 1}`;
    if (!usados.has(s)) {
      usados.add(s);
      return s;
    }
  }
  const s = `${limpio}-${Date.now()}`;
  usados.add(s);
  return s;
}

/* ---------- Clientes ---------- */

async function syncClientes() {
  const previos = await db.user.findMany({ select: { id: true, email: true, legacyId: true } });
  const porEmail = new Map(previos.map((u) => [u.email.toLowerCase(), u.id]));
  const byLegacy = new Map<number, string>(previos.filter((u) => u.legacyId).map((u) => [u.legacyId!, u.id]));
  console.log(`  ya migrados: ${previos.length} usuarios`);
  for await (const lote of traerTodo<WcCustomer>("customers", { role: "all", orderby: "id", order: "asc" })) {
    for (const c of lote) {
      if (!c.email || c.role === "administrator") continue;
      const email = c.email.trim().toLowerCase();
      const existente = porEmail.get(email);
      if (existente) {
        byLegacy.set(c.id, existente);
        continue;
      }
      if (DRY) {
        suma("clientes nuevos");
        continue;
      }
      const row = await db.user.create({
        data: {
          legacyId: c.id,
          email,
          name: (c.first_name || c.billing?.first_name || "").trim() || null,
          lastName: (c.last_name || c.billing?.last_name || "").trim() || null,
          phone: c.billing?.phone || null,
          address1: c.billing?.address_1 || null,
          address2: c.billing?.address_2 || null,
          city: c.billing?.city || null,
          region: c.billing?.state || null,
          role: "CUSTOMER",
          createdAt: new Date(c.date_created),
        },
        select: { id: true },
      });
      byLegacy.set(c.id, row.id);
      porEmail.set(email, row.id);
      suma("clientes nuevos");
    }
    process.stdout.write(".");
  }
  console.log();
  return byLegacy;
}

/* ---------- Pedidos ---------- */

const ESTADO: Record<string, OrderStatus> = {
  completed: "COMPLETED",
  processing: "PROCESSING",
  "on-hold": "PENDING",
  pending: "PENDING",
  cancelled: "CANCELLED",
  refunded: "REFUNDED",
  failed: "CANCELLED",
};

async function syncPedidos(userMap: Map<number, string>) {
  const previos = await db.order.findMany({ where: { legacyId: { not: null } }, select: { id: true, legacyId: true, status: true } });
  const porLegacyPedido = new Map(previos.map((o) => [o.legacyId!, o]));
  const prods = await db.product.findMany({ where: { legacyId: { not: null } }, select: { id: true, legacyId: true } });
  const prodPorLegacy = new Map(prods.map((p) => [p.legacyId!, p.id]));
  console.log(`  ya migrados: ${porLegacyPedido.size} pedidos`);
  const params: Record<string, string> = { status: "any", orderby: "id", order: "asc" };
  if (DESDE) params.after = `${DESDE}T00:00:00`;
  for await (const lote of traerTodo<WcOrder>("orders", params)) {
    for (const o of lote) {
      const status = ESTADO[o.status] ?? "PENDING";
      const paymentStatus: PaymentStatus = status === "COMPLETED" || status === "PROCESSING" ? "PAID" : status === "REFUNDED" ? "REFUNDED" : "UNPAID";
      const existente = porLegacyPedido.get(o.id);
      if (existente) {
        if (existente.status !== status) {
          if (!DRY) await db.order.update({ where: { id: existente.id }, data: { status, paymentStatus } });
          suma("pedidos con estado actualizado");
        }
        continue;
      }
      if (DRY) {
        suma("pedidos nuevos");
        continue;
      }

      const esApp = o.created_via === "rest-api";
      const channel: OrderChannel = esApp ? "LEGACY_APP" : "LEGACY_WEB";
      const paymentMethod: PaymentMethod = o.payment_method === "transbank_webpay_plus_rest" ? "WEBPAY_LEGACY" : o.payment_method === "bacs" ? "TRANSFER" : "OTHER";
      const ship = o.shipping_lines[0];
      const shippingMethod: ShippingMethod = !ship ? "NONE" : /retiro/i.test(ship.method_title) ? "PICKUP" : "DELIVERY_COD";
      const rut = o.meta_data.find((m) => m.key === "rut_")?.value;
      const webpay = o.meta_data.filter((m) => ["transactionStatus", "authorizationCode", "cardNumber", "paymentType", "amount", "transactionDate", "buyOrder"].includes(m.key));
      const total = num(o.total);

      await db.order.create({
        data: {
          legacyId: o.id,
          number: o.id,
          userId: o.customer_id ? userMap.get(o.customer_id) ?? null : null,
          status,
          channel,
          paymentMethod,
          paymentStatus,
          subtotal: o.line_items.reduce((s, li) => s + num(li.total), 0),
          shippingCost: num(o.shipping_total),
          discount: num(o.discount_total),
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
          adminNote: esApp ? "Venta registrada desde la app móvil de WooCommerce" : null,
          paidAt: o.date_paid ? new Date(o.date_paid) : paymentStatus === "PAID" ? new Date(o.date_created) : null,
          createdAt: new Date(o.date_created),
          items: {
            create: o.line_items.map((li) => ({
              productId: prodPorLegacy.get(li.product_id) ?? null,
              name: decode(li.name),
              price: num(li.price),
              quantity: li.quantity,
              total: num(li.total),
            })),
          },
          payments: webpay.length
            ? { create: { provider: "WEBPAY_LEGACY", amount: total, status: "paid", raw: Object.fromEntries(webpay.map((m) => [m.key, m.value])) as object } }
            : undefined,
        },
      });
      suma("pedidos nuevos");
    }
    process.stdout.write(".");
  }
  console.log();
}

/* ---------- Main ---------- */

async function main() {
  if (!CK || !CS) throw new Error("Faltan WOO_KEY y WOO_SECRET en el entorno");
  const destino = (process.env.DATABASE_URL ?? "").replace(/:\/\/([^:]+):[^@]+@/, "://$1:***@");
  console.log(`Sincronizando ${BASE} → ${destino}`);
  console.log(`Pasos: ${SOLO.join(", ")}${DESDE ? ` · desde ${DESDE}` : ""}${DRY ? " · SIMULACIÓN (no escribe)" : ""}\n`);

  const catMap = hace("categorias") ? await syncCategorias() : new Map<number, string>();
  const tagMap = hace("etiquetas") ? await syncEtiquetas() : new Map<number, string>();
  if (hace("productos")) await syncProductos(catMap, tagMap);
  const userMap = hace("clientes") ? await syncClientes() : new Map<number, string>();
  if (hace("pedidos")) await syncPedidos(userMap);

  if (!DRY && hace("pedidos")) {
    const max = await db.order.aggregate({ _max: { number: true } });
    const siguiente = Math.max(40000, (max._max.number ?? 0) + 1);
    await db.$executeRawUnsafe(`ALTER SEQUENCE "Order_number_seq" RESTART WITH ${siguiente}`);
    console.log("siguiente número de pedido:", siguiente);
  }

  console.log("\nResumen:");
  const filas = Object.entries(resumen);
  if (!filas.length) console.log("  sin cambios");
  for (const [k, v] of filas) console.log(`  ${k}: ${v}`);
}

main()
  .catch((e) => {
    console.error("\nERROR:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
