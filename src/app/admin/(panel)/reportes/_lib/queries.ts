/**
 * Consultas agregadas de los reportes. Todo se resuelve en Postgres (SQL crudo parametrizado)
 * para no traer miles de pedidos a memoria. Solo se usan desde el servidor.
 */
import { Prisma } from "@/generated/prisma/client";
import type { OrderChannel, PaymentMethod } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { bucketKeys, bucketStart, type Bucket, type ReportRange } from "./range";

/** Un pedido cuenta como venta en estos estados. */
const SALE = Prisma.sql`o."status" IN ('PAID','PROCESSING','SHIPPED','COMPLETED')`;
/** `createdAt` guarda UTC: hay que llevarlo a hora de Chile antes de truncar por día. */
const LOCAL = Prisma.sql`(o."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Santiago')`;

const inRange = (from: Date, to: Date) => Prisma.sql`o."createdAt" >= ${from} AND o."createdAt" < ${to}`;
const num = (v: unknown) => Number(v ?? 0);

/* ------------------------------------------------------------ 1. resumen */

export type Totals = { orders: number; total: number; units: number; ticket: number };
export type SalesSummary = {
  all: Totals;
  web: Totals;
  manual: Totals;
  byChannel: { channel: OrderChannel; orders: number; total: number; units: number }[];
};

const EMPTY: Totals = { orders: 0, total: 0, units: 0, ticket: 0 };
const sum = (rows: { orders: number; total: number; units: number }[]): Totals => {
  const t = rows.reduce((a, r) => ({ orders: a.orders + r.orders, total: a.total + r.total, units: a.units + r.units }), { orders: 0, total: 0, units: 0 });
  return { ...t, ticket: t.orders ? Math.round(t.total / t.orders) : 0 };
};

/** LEGACY_WEB cuenta como web y LEGACY_APP como manual. */
const WEB_CHANNELS: OrderChannel[] = ["WEB", "LEGACY_WEB"];

export async function getSalesSummary(from: Date, to: Date): Promise<SalesSummary> {
  const rows = await db.$queryRaw<{ channel: OrderChannel; orders: number; total: bigint; units: bigint }[]>`
    SELECT o."channel" AS channel,
           count(*)::int AS orders,
           coalesce(sum(o."total"), 0)::bigint AS total,
           coalesce(sum(u.units), 0)::bigint AS units
    FROM "Order" o
    LEFT JOIN LATERAL (SELECT sum(i."quantity") AS units FROM "OrderItem" i WHERE i."orderId" = o."id") u ON true
    WHERE ${inRange(from, to)} AND ${SALE}
    GROUP BY 1`;
  const byChannel = rows.map((r) => ({ channel: r.channel, orders: num(r.orders), total: num(r.total), units: num(r.units) }));
  if (!byChannel.length) return { all: EMPTY, web: EMPTY, manual: EMPTY, byChannel };
  return {
    all: sum(byChannel),
    web: sum(byChannel.filter((r) => WEB_CHANNELS.includes(r.channel))),
    manual: sum(byChannel.filter((r) => !WEB_CHANNELS.includes(r.channel))),
    byChannel: byChannel.sort((a, b) => b.total - a.total),
  };
}

export type PaymentRow = { method: PaymentMethod; orders: number; total: number };

export async function getByPaymentMethod(from: Date, to: Date): Promise<PaymentRow[]> {
  const rows = await db.$queryRaw<{ method: PaymentMethod; orders: number; total: bigint }[]>`
    SELECT o."paymentMethod" AS method, count(*)::int AS orders, coalesce(sum(o."total"), 0)::bigint AS total
    FROM "Order" o
    WHERE ${inRange(from, to)} AND ${SALE}
    GROUP BY 1 ORDER BY 3 DESC`;
  return rows.map((r) => ({ method: r.method, orders: num(r.orders), total: num(r.total) }));
}

/* ------------------------------------------------- 2. ventas en el tiempo */

export type SeriesPoint = { key: string; total: number; orders: number; units: number };

export async function getSeries(range: ReportRange): Promise<SeriesPoint[]> {
  const bucket: Bucket = range.bucket;
  const rows = await db.$queryRaw<{ key: string; total: bigint; orders: number; units: bigint }[]>`
    SELECT to_char(date_trunc(${bucket}::text, ${LOCAL}), 'YYYY-MM-DD') AS key,
           coalesce(sum(o."total"), 0)::bigint AS total,
           count(*)::int AS orders,
           coalesce(sum(u.units), 0)::bigint AS units
    FROM "Order" o
    LEFT JOIN LATERAL (SELECT sum(i."quantity") AS units FROM "OrderItem" i WHERE i."orderId" = o."id") u ON true
    WHERE ${inRange(range.from, range.to)} AND ${SALE}
    GROUP BY 1 ORDER BY 1`;
  const byKey = new Map(rows.map((r) => [r.key, { key: r.key, total: num(r.total), orders: num(r.orders), units: num(r.units) }]));
  // Sin inicio real (rango "todo" o solo "hasta") arrancamos en el primer bucket con datos.
  const first = range.openStart ? (rows[0]?.key ?? range.hasta) : range.desde;
  return bucketKeys(bucketStart(first, bucket), range.hasta, bucket).map((key) => byKey.get(key) ?? { key, total: 0, orders: 0, units: 0 });
}

/* -------------------------------------------------- 3. productos vendidos */

export type ProductRow = { id: string; name: string; brand: string | null; stock: number; price: number; image: string | null; units: number; revenue: number };

async function productRows(range: ReportRange, order: Prisma.Sql, limit: number, extra: Prisma.Sql = Prisma.empty) {
  const rows = await db.$queryRaw<{ id: string; name: string; brand: string | null; stock: number; price: number; image: string | null; units: number; revenue: bigint }[]>`
    SELECT p."id", p."name", p."brand", p."stock", p."price",
           (SELECT pi."path" FROM "ProductImage" pi WHERE pi."productId" = p."id" ORDER BY pi."position" ASC LIMIT 1) AS image,
           sum(i."quantity")::int AS units,
           coalesce(sum(i."total"), 0)::bigint AS revenue
    FROM "OrderItem" i
    JOIN "Order" o ON o."id" = i."orderId"
    JOIN "Product" p ON p."id" = i."productId"
    WHERE ${inRange(range.from, range.to)} AND ${SALE} ${extra}
    GROUP BY p."id"
    ORDER BY ${order}
    LIMIT ${limit}`;
  return rows.map((r) => ({ ...r, units: num(r.units), revenue: num(r.revenue) })) satisfies ProductRow[];
}

export const getTopByUnits = (range: ReportRange, limit = 20) => productRows(range, Prisma.sql`units DESC, revenue DESC`, limit);
export const getTopByRevenue = (range: ReportRange, limit = 20) => productRows(range, Prisma.sql`revenue DESC, units DESC`, limit);
/** Los más vendidos que hoy están en cero: candidatos a reponer. */
export const getSoldOut = (range: ReportRange, limit = 20) => productRows(range, Prisma.sql`units DESC, revenue DESC`, limit, Prisma.sql`AND p."stock" <= 0 AND p."status" <> 'ARCHIVED'`);

/** Unidades vendidas de ítems que ya no apuntan a un producto del catálogo (productos borrados). */
export async function getUnlinkedUnits(range: ReportRange) {
  const rows = await db.$queryRaw<{ units: bigint }[]>`
    SELECT coalesce(sum(i."quantity"), 0)::bigint AS units
    FROM "OrderItem" i JOIN "Order" o ON o."id" = i."orderId"
    WHERE ${inRange(range.from, range.to)} AND ${SALE} AND i."productId" IS NULL`;
  return num(rows[0]?.units);
}

/* ----------------------------------------------- 4. categorías y marcas */

export type GroupRow = { key: string; name: string; units: number; revenue: number; orders: number };

/** Hay categorías con el mismo nombre bajo padres distintos: se muestran como "Padre › Hijo". */
export async function getByCategory(range: ReportRange, limit = 100): Promise<GroupRow[]> {
  const rows = await db.$queryRaw<{ key: string; name: string; units: bigint; revenue: bigint; orders: number }[]>`
    SELECT c."id" AS key,
           coalesce(pa."name" || ' › ', '') || c."name" AS name,
           coalesce(sum(i."quantity"), 0)::bigint AS units,
           coalesce(sum(i."total"), 0)::bigint AS revenue,
           count(DISTINCT o."id")::int AS orders
    FROM "OrderItem" i
    JOIN "Order" o ON o."id" = i."orderId"
    JOIN "_CategoryToProduct" cp ON cp."B" = i."productId"
    JOIN "Category" c ON c."id" = cp."A"
    LEFT JOIN "Category" pa ON pa."id" = c."parentId"
    WHERE ${inRange(range.from, range.to)} AND ${SALE}
    GROUP BY c."id", pa."name"
    ORDER BY revenue DESC, units DESC
    LIMIT ${limit}`;
  return rows.map((r) => ({ key: r.key, name: r.name, units: num(r.units), revenue: num(r.revenue), orders: num(r.orders) }));
}

export async function getByBrand(range: ReportRange, limit = 100): Promise<GroupRow[]> {
  const rows = await db.$queryRaw<{ name: string; units: bigint; revenue: bigint; orders: number }[]>`
    SELECT coalesce(nullif(trim(p."brand"), ''), 'Sin marca') AS name,
           coalesce(sum(i."quantity"), 0)::bigint AS units,
           coalesce(sum(i."total"), 0)::bigint AS revenue,
           count(DISTINCT o."id")::int AS orders
    FROM "OrderItem" i
    JOIN "Order" o ON o."id" = i."orderId"
    JOIN "Product" p ON p."id" = i."productId"
    WHERE ${inRange(range.from, range.to)} AND ${SALE}
    GROUP BY 1
    ORDER BY revenue DESC, units DESC
    LIMIT ${limit}`;
  return rows.map((r) => ({ key: r.name, name: r.name, units: num(r.units), revenue: num(r.revenue), orders: num(r.orders) }));
}

/* ------------------------------------------- 5. checkouts sin completar */

export type AbandonedRow = {
  id: string;
  number: number;
  createdAt: Date;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  paymentMethod: PaymentMethod;
  total: number;
  items: number;
  products: string | null;
};

const ABANDONED = Prisma.sql`o."status" = 'PENDING' AND o."paymentStatus" = 'UNPAID'`;

export async function getAbandoned(range: ReportRange, limit = 100): Promise<AbandonedRow[]> {
  const rows = await db.$queryRaw<(Omit<AbandonedRow, "total" | "items"> & { total: number; items: number })[]>`
    SELECT o."id", o."number", o."createdAt", o."firstName", o."lastName", o."email", o."phone",
           o."paymentMethod", o."total",
           (SELECT count(*) FROM "OrderItem" i WHERE i."orderId" = o."id")::int AS items,
           (SELECT string_agg(i."name" || ' ×' || i."quantity", ', ' ORDER BY i."name") FROM "OrderItem" i WHERE i."orderId" = o."id") AS products
    FROM "Order" o
    WHERE ${inRange(range.from, range.to)} AND ${ABANDONED}
    ORDER BY o."createdAt" DESC
    LIMIT ${limit}`;
  return rows.map((r) => ({ ...r, total: num(r.total), items: num(r.items) }));
}

/** Cabecera de la sección: cuántos hay, cuánto suman y la conversión del periodo. */
export async function getAbandonedSummary(range: ReportRange) {
  const rows = await db.$queryRaw<{ count: number; total: bigint }[]>`
    SELECT count(*)::int AS count, coalesce(sum(o."total"), 0)::bigint AS total
    FROM "Order" o WHERE ${inRange(range.from, range.to)} AND ${ABANDONED}`;
  const count = num(rows[0]?.count);
  const total = num(rows[0]?.total);
  const paidRows = await db.$queryRaw<{ count: number }[]>`
    SELECT count(*)::int AS count FROM "Order" o WHERE ${inRange(range.from, range.to)} AND ${SALE}`;
  const paid = num(paidRows[0]?.count);
  const base = paid + count;
  return { count, total, paid, conversion: base ? paid / base : null };
}

/* ------------------------------------------------------------ 6. clientes */

/** Un cliente es su `userId`; si el pedido no tiene cuenta, su correo en minúsculas. */
const CUSTOMER_KEY = Prisma.sql`coalesce(o."userId", nullif(lower(trim(o."email")), ''), 'pedido:' || o."id")`;

export type CustomerRow = { key: string; userId: string | null; name: string; email: string | null; phone: string | null; orders: number; total: number };

export async function getTopCustomers(range: ReportRange, limit = 20): Promise<CustomerRow[]> {
  const rows = await db.$queryRaw<{ key: string; userId: string | null; name: string; email: string | null; phone: string | null; orders: number; total: bigint }[]>`
    SELECT ${CUSTOMER_KEY} AS key,
           (array_agg(o."userId") FILTER (WHERE o."userId" IS NOT NULL))[1] AS "userId",
           trim((array_agg(o."firstName" ORDER BY o."createdAt" DESC))[1] || ' ' || coalesce((array_agg(o."lastName" ORDER BY o."createdAt" DESC))[1], '')) AS name,
           (array_agg(o."email" ORDER BY o."createdAt" DESC))[1] AS email,
           (array_agg(o."phone" ORDER BY o."createdAt" DESC) FILTER (WHERE o."phone" IS NOT NULL))[1] AS phone,
           count(*)::int AS orders,
           coalesce(sum(o."total"), 0)::bigint AS total
    FROM "Order" o
    WHERE ${inRange(range.from, range.to)} AND ${SALE}
    GROUP BY 1
    ORDER BY total DESC, orders DESC
    LIMIT ${limit}`;
  return rows.map((r) => ({ ...r, orders: num(r.orders), total: num(r.total) }));
}

/** Clientes nuevos (sin compras antes del rango) vs recurrentes. */
export async function getCustomerMix(range: ReportRange) {
  const rows = await db.$queryRaw<{ nuevos: number; recurrentes: number }[]>`
    WITH periodo AS (
      SELECT ${CUSTOMER_KEY} AS key FROM "Order" o
      WHERE ${inRange(range.from, range.to)} AND ${SALE}
      GROUP BY 1
    ), previos AS (
      SELECT DISTINCT ${CUSTOMER_KEY} AS key FROM "Order" o
      WHERE o."createdAt" < ${range.from} AND ${SALE}
    )
    SELECT count(*) FILTER (WHERE pr."key" IS NULL)::int AS nuevos,
           count(*) FILTER (WHERE pr."key" IS NOT NULL)::int AS recurrentes
    FROM periodo p LEFT JOIN previos pr ON pr."key" = p."key"`;
  return { nuevos: num(rows[0]?.nuevos), recurrentes: num(rows[0]?.recurrentes) };
}

/* ---------------------------------------------------------- 7. inventario */

export async function getInventory() {
  const rows = await db.$queryRaw<{ products: number; units: bigint; value: bigint; lastUnit: number; outOfStock: number; active: number }[]>`
    SELECT count(*)::int AS products,
           coalesce(sum(greatest(p."stock", 0)), 0)::bigint AS units,
           coalesce(sum(p."price"::bigint * greatest(p."stock", 0)), 0)::bigint AS value,
           count(*) FILTER (WHERE p."stock" = 1)::int AS "lastUnit",
           count(*) FILTER (WHERE p."stock" <= 0)::int AS "outOfStock",
           count(*) FILTER (WHERE p."status" = 'ACTIVE')::int AS active
    FROM "Product" p
    WHERE p."status" <> 'ARCHIVED'`;
  const r = rows[0];
  return { products: num(r?.products), units: num(r?.units), value: num(r?.value), lastUnit: num(r?.lastUnit), outOfStock: num(r?.outOfStock), active: num(r?.active) };
}

export type InventoryRow = { id: string; name: string; brand: string | null; status: string; price: number; stock: number; value: number; sold: number };

/** Detalle de inventario producto a producto (para el CSV), con lo vendido en el rango. */
export async function getInventoryRows(range: ReportRange, limit = 20000): Promise<InventoryRow[]> {
  const rows = await db.$queryRaw<{ id: string; name: string; brand: string | null; status: string; price: number; stock: number; value: bigint; sold: bigint }[]>`
    SELECT p."id", p."name", p."brand", p."status"::text AS status, p."price", p."stock",
           (p."price"::bigint * greatest(p."stock", 0)) AS value,
           coalesce(v.sold, 0)::bigint AS sold
    FROM "Product" p
    LEFT JOIN LATERAL (
      SELECT sum(i."quantity") AS sold
      FROM "OrderItem" i JOIN "Order" o ON o."id" = i."orderId"
      WHERE i."productId" = p."id" AND ${inRange(range.from, range.to)} AND ${SALE}
    ) v ON true
    WHERE p."status" <> 'ARCHIVED'
    ORDER BY value DESC, p."name" ASC
    LIMIT ${limit}`;
  return rows.map((r) => ({ ...r, value: num(r.value), sold: num(r.sold) }));
}

/** Productos con una sola unidad (los primeros por venta reciente). */
export async function getLastUnitProducts(limit = 12): Promise<ProductRow[]> {
  const rows = await db.$queryRaw<{ id: string; name: string; brand: string | null; stock: number; price: number; image: string | null }[]>`
    SELECT p."id", p."name", p."brand", p."stock", p."price",
           (SELECT pi."path" FROM "ProductImage" pi WHERE pi."productId" = p."id" ORDER BY pi."position" ASC LIMIT 1) AS image
    FROM "Product" p
    WHERE p."stock" = 1 AND p."status" = 'ACTIVE'
    ORDER BY p."totalSales" DESC, p."updatedAt" DESC
    LIMIT ${limit}`;
  return rows.map((r) => ({ ...r, units: 0, revenue: 0 }));
}
