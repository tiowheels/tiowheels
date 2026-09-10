import "server-only";
import { cache } from "react";
import { db } from "./db";
import { Prisma } from "@/generated/prisma/client";
import { normalizeText } from "./format";

/* ---------- Tipos ---------- */

export const SORT_OPTIONS = [
  { value: "nuevo", label: "Más recientes" },
  { value: "vendidos", label: "Más vendidos" },
  { value: "precio-asc", label: "Precio: menor a mayor" },
  { value: "precio-desc", label: "Precio: mayor a menor" },
  { value: "nombre", label: "Nombre A–Z" },
] as const;
export type SortValue = (typeof SORT_OPTIONS)[number]["value"];

export type CatalogFilters = {
  q?: string;
  cat?: string; // slug de categoría (incluye hijas)
  marca?: string[]; // marcas de auto
  min?: number;
  max?: number;
  agotados?: boolean; // incluir sin stock
  orden?: SortValue;
  page?: number;
  perPage?: number;
};

export const productCardSelect = {
  id: true,
  slug: true,
  name: true,
  price: true,
  compareAtPrice: true,
  stock: true,
  brand: true,
  createdAt: true,
  images: { orderBy: { position: "asc" as const }, take: 2, select: { path: true, alt: true } },
  categories: { select: { slug: true, name: true, parentId: true } },
} satisfies Prisma.ProductSelect;

export type ProductCardData = Prisma.ProductGetPayload<{ select: typeof productCardSelect }>;

/* ---------- Categorías ---------- */

export const getCategoryTree = cache(async () => {
  const cats = await db.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, slug: true, name: true, parentId: true, imageUrl: true, featured: true, _count: { select: { products: { where: { status: "ACTIVE", stock: { gt: 0 } } } } } },
  });
  type Node = (typeof cats)[number] & { children: Node[]; count: number };
  const byId = new Map<string, Node>(cats.map((c) => [c.id, { ...c, children: [], count: c._count.products }]));
  const roots: Node[] = [];
  for (const c of byId.values()) {
    if (c.parentId && byId.has(c.parentId)) byId.get(c.parentId)!.children.push(c);
    else roots.push(c);
  }
  for (const r of roots) r.children.sort((a, b) => b.count - a.count);
  roots.sort((a, b) => b.count - a.count);
  return roots;
});

export const getCategoryBySlug = cache(async (slug: string) => {
  const cat = await db.category.findUnique({ where: { slug }, include: { children: { select: { id: true, slug: true, name: true } }, parent: { select: { slug: true, name: true } } } });
  return cat;
});

async function categoryIdsIncludingChildren(slug: string) {
  const cat = await db.category.findUnique({ where: { slug }, select: { id: true, children: { select: { id: true } } } });
  if (!cat) return null;
  return [cat.id, ...cat.children.map((c) => c.id)];
}

/* ---------- Búsqueda + filtros (SQL con pg_trgm) ---------- */

function buildWhere(f: CatalogFilters, catIds: string[] | null, opts: { ignoreBrand?: boolean } = {}) {
  const parts: Prisma.Sql[] = [Prisma.sql`p."status" = 'ACTIVE'`];
  if (!f.agotados) parts.push(Prisma.sql`p."stock" > 0`);
  if (catIds) parts.push(Prisma.sql`EXISTS (SELECT 1 FROM "_CategoryToProduct" cp WHERE cp."B" = p."id" AND cp."A" IN (${Prisma.join(catIds)}))`);
  if (f.marca?.length && !opts.ignoreBrand) parts.push(Prisma.sql`p."brand" IN (${Prisma.join(f.marca)})`);
  if (f.min != null) parts.push(Prisma.sql`p."price" >= ${f.min}`);
  if (f.max != null) parts.push(Prisma.sql`p."price" <= ${f.max}`);
  const terms = f.q ? normalizeText(f.q).split(" ").filter((t) => t.length >= 2) : [];
  for (const t of terms) parts.push(Prisma.sql`p."searchText" ILIKE ${"%" + t + "%"}`);
  return { where: Prisma.join(parts, " AND "), terms };
}

function orderSql(orden: SortValue | undefined, q: string | undefined) {
  if (q) return Prisma.sql`similarity(p."name", ${normalizeText(q)}) DESC, p."stock" DESC, p."createdAt" DESC`;
  switch (orden) {
    case "precio-asc":
      return Prisma.sql`p."price" ASC, p."name" ASC`;
    case "precio-desc":
      return Prisma.sql`p."price" DESC, p."name" ASC`;
    case "nombre":
      return Prisma.sql`p."name" ASC`;
    case "vendidos":
      return Prisma.sql`p."totalSales" DESC, p."createdAt" DESC`;
    default:
      return Prisma.sql`p."listedAt" DESC`;
  }
}

export async function searchProducts(f: CatalogFilters) {
  const perPage = Math.min(f.perPage ?? 24, 60);
  const page = Math.max(1, f.page ?? 1);
  const catIds = f.cat ? await categoryIdsIncludingChildren(f.cat) : null;
  if (f.cat && !catIds) return { items: [] as ProductCardData[], total: 0, page, perPage, pages: 0, facets: { brands: [], priceMin: 0, priceMax: 0 } };

  const { where } = buildWhere(f, catIds);
  const order = orderSql(f.orden, f.q);

  const [rows, countRow, brands, price] = await Promise.all([
    db.$queryRaw<{ id: string }[]>`SELECT p."id" FROM "Product" p WHERE ${where} ORDER BY ${order} LIMIT ${perPage} OFFSET ${(page - 1) * perPage}`,
    db.$queryRaw<{ n: bigint }[]>`SELECT count(*)::bigint AS n FROM "Product" p WHERE ${where}`,
    db.$queryRaw<{ brand: string; n: bigint }[]>`SELECT p."brand", count(*)::bigint AS n FROM "Product" p WHERE ${buildWhere(f, catIds, { ignoreBrand: true }).where} AND p."brand" IS NOT NULL GROUP BY p."brand" ORDER BY n DESC, p."brand" ASC LIMIT 40`,
    db.$queryRaw<{ min: number | null; max: number | null }[]>`SELECT min(p."price")::int AS min, max(p."price")::int AS max FROM "Product" p WHERE ${buildWhere({ ...f, min: undefined, max: undefined }, catIds).where}`,
  ]);

  const ids = rows.map((r) => r.id);
  const products = ids.length ? await db.product.findMany({ where: { id: { in: ids } }, select: productCardSelect }) : [];
  const byId = new Map(products.map((p) => [p.id, p]));
  const items = ids.map((id) => byId.get(id)!).filter(Boolean);
  const total = Number(countRow[0]?.n ?? 0);
  return {
    items,
    total,
    page,
    perPage,
    pages: Math.ceil(total / perPage),
    facets: {
      brands: brands.map((b) => ({ name: b.brand, count: Number(b.n) })),
      priceMin: price[0]?.min ?? 0,
      priceMax: price[0]?.max ?? 0,
    },
  };
}

/** Sugerencias rápidas para la barra de búsqueda. */
export async function quickSearch(q: string, limit = 8) {
  const norm = normalizeText(q);
  if (norm.length < 2) return { products: [] as ProductCardData[], categories: [] as { slug: string; name: string }[] };
  const terms = norm.split(" ").filter((t) => t.length >= 2);
  const conds = terms.map((t) => Prisma.sql`p."searchText" ILIKE ${"%" + t + "%"}`);
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT p."id" FROM "Product" p
    WHERE p."status" = 'ACTIVE' AND ${Prisma.join(conds, " AND ")}
    ORDER BY (p."stock" > 0) DESC, similarity(p."name", ${norm}) DESC, p."createdAt" DESC
    LIMIT ${limit}`;
  const ids = rows.map((r) => r.id);
  const products = ids.length ? await db.product.findMany({ where: { id: { in: ids } }, select: productCardSelect }) : [];
  const byId = new Map(products.map((p) => [p.id, p]));
  const categories = await db.category.findMany({
    where: { name: { contains: q.trim(), mode: "insensitive" } },
    select: { slug: true, name: true },
    take: 4,
  });
  return { products: ids.map((id) => byId.get(id)!).filter(Boolean), categories };
}

/* ---------- Producto ---------- */

export const getProductBySlug = cache(async (slug: string) => {
  return db.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { position: "asc" } },
      categories: { select: { id: true, slug: true, name: true, parentId: true } },
      tags: { select: { slug: true, name: true } },
    },
  });
});

export async function getRelatedProducts(productId: string, categoryIds: string[], brand: string | null, take = 8) {
  const items = await db.product.findMany({
    where: {
      id: { not: productId },
      status: "ACTIVE",
      stock: { gt: 0 },
      OR: [brand ? { brand } : {}, categoryIds.length ? { categories: { some: { id: { in: categoryIds } } } } : {}].filter((o) => Object.keys(o).length),
    },
    select: productCardSelect,
    orderBy: [{ totalSales: "desc" }, { createdAt: "desc" }],
    take,
  });
  return items;
}

/* ---------- Secciones de portada ---------- */

export async function getHomeSections() {
  const base = { status: "ACTIVE" as const, stock: { gt: 0 } };
  const [recent, bestSellers, premium, featured, counts] = await Promise.all([
    db.product.findMany({ where: base, select: productCardSelect, orderBy: { listedAt: "desc" }, take: 12 }),
    db.product.findMany({ where: base, select: productCardSelect, orderBy: [{ totalSales: "desc" }, { createdAt: "desc" }], take: 12 }),
    db.product.findMany({ where: { ...base, categories: { some: { slug: "hotwheels-premium" } } }, select: productCardSelect, orderBy: { createdAt: "desc" }, take: 8 }),
    db.product.findMany({ where: { ...base, featured: true }, select: productCardSelect, orderBy: { createdAt: "desc" }, take: 8 }),
    db.product.count({ where: base }),
  ]);
  return { recent, bestSellers, premium, featured: featured.length ? featured : bestSellers.slice(0, 8), totalInStock: counts };
}

/** Colecciones destacadas para navegación/portada (slugs del sitio anterior). */
export const FEATURED_COLLECTIONS = [
  { slug: "hotwheels-premium", name: "Premium", blurb: "Real Riders, Car Culture, Boulevard" },
  { slug: "japoneses", name: "Japoneses", blurb: "JDM: Nissan, Toyota, Honda, Mazda" },
  { slug: "americanos", name: "Americanos", blurb: "Muscle cars y clásicos" },
  { slug: "europeos", name: "Europeos", blurb: "Porsche, Ferrari, BMW, Lamborghini" },
  { slug: "camionetas-y-jeeps", name: "Camionetas y Jeeps", blurb: "Pickups, 4x4 y todoterreno" },
  { slug: "90-tarjeta-azul", name: "90’ Tarjeta Azul", blurb: "Los clásicos de los 90" },
  { slug: "ediciones-limitadas", name: "Ediciones limitadas", blurb: "Tarjetas especiales y exclusivos" },
  { slug: "treasure-hunt", name: "Treasure Hunt", blurb: "TH y Super Treasure Hunt" },
  { slug: "fantasia", name: "Fantasía", blurb: "Diseños originales Hot Wheels" },
  { slug: "screem-time-peliculas-y-series", name: "Películas y series", blurb: "Batman, Fast & Furious, Jurassic Park" },
  { slug: "matchbox", name: "Matchbox", blurb: "Realismo a escala" },
  { slug: "hot-rod-dragster", name: "Hot Rod / Drag", blurb: "Gassers y dragsters" },
] as const;

export async function getCollectionCards() {
  const slugs = FEATURED_COLLECTIONS.map((c) => c.slug);
  const cats = await db.category.findMany({
    where: { slug: { in: slugs } },
    select: {
      slug: true,
      name: true,
      imageUrl: true,
      _count: { select: { products: { where: { status: "ACTIVE", stock: { gt: 0 } } } } },
      products: { where: { status: "ACTIVE", stock: { gt: 0 }, images: { some: {} } }, orderBy: { totalSales: "desc" }, take: 1, select: { images: { orderBy: { position: "asc" }, take: 1, select: { path: true } } } },
    },
  });
  const bySlug = new Map(cats.map((c) => [c.slug, c]));
  return FEATURED_COLLECTIONS.map((c) => {
    const cat = bySlug.get(c.slug);
    return { ...c, count: cat?._count.products ?? 0, image: cat?.products[0]?.images[0]?.path ?? null };
  }).filter((c) => c.count > 0);
}

/** Marcas con más productos disponibles (para la portada y filtros). */
export const getTopBrands = cache(async (take = 16) => {
  const rows = await db.product.groupBy({
    by: ["brand"],
    where: { status: "ACTIVE", stock: { gt: 0 }, brand: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { brand: "desc" } },
    take,
  });
  return rows.map((r) => ({ name: r.brand!, count: r._count._all }));
});

export function parseFilters(sp: Record<string, string | string[] | undefined>): CatalogFilters {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : sp[k]) as string | undefined;
  const num = (k: string) => {
    const v = Number(one(k));
    return Number.isFinite(v) && one(k) !== undefined && one(k) !== "" ? v : undefined;
  };
  const marca = one("marca")?.split(",").map((s) => s.trim()).filter(Boolean);
  const orden = one("orden") as SortValue | undefined;
  return {
    q: one("q")?.trim() || undefined,
    cat: one("cat") || undefined,
    marca: marca?.length ? marca : undefined,
    min: num("min"),
    max: num("max"),
    agotados: one("disp") === "todo",
    orden: SORT_OPTIONS.some((o) => o.value === orden) ? orden : undefined,
    page: num("page") ?? 1,
  };
}

/* ---------- Portada animada ---------- */

/** Productos vistosos para el hero (premium / treasure hunt con foto y stock). */
export async function getHeroProducts(take = 6) {
  const items = await db.product.findMany({
    where: {
      status: "ACTIVE",
      stock: { gt: 0 },
      images: { some: {} },
      categories: { some: { slug: { in: ["hotwheels-premium", "treasure-hunt", "super-treasure-hunt", "rlc", "ediciones-limitadas"] } } },
    },
    select: { id: true, slug: true, name: true, brand: true, price: true, images: { orderBy: { position: "asc" }, take: 1, select: { path: true } } },
    orderBy: [{ totalSales: "desc" }, { createdAt: "desc" }],
    take,
  });
  return items.map((p) => ({ id: p.id, slug: p.slug, name: p.name, brand: p.brand, price: p.price, image: p.images[0]?.path ?? null }));
}

/** Ventas recientes reales (nombre del auto + ciudad) para el ticker de la portada. */
export async function getRecentSales(take = 14) {
  const rows = await db.orderItem.findMany({
    where: { order: { status: { in: ["PAID", "PROCESSING", "SHIPPED", "COMPLETED"] } } },
    select: { name: true, order: { select: { city: true, region: true, createdAt: true, shippingMethod: true } }, product: { select: { slug: true, images: { orderBy: { position: "asc" }, take: 1, select: { path: true } } } } },
    orderBy: { order: { createdAt: "desc" } },
    take: take * 3,
  });
  const seen = new Set<string>();
  const out: { name: string; place: string; slug: string | null; image: string | null; at: string }[] = [];
  for (const r of rows) {
    const key = r.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const city = (r.order.city ?? "").trim();
    const place = city ? city.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase()) : r.order.shippingMethod === "PICKUP" ? "Retiro en tienda" : "Chile";
    out.push({ name: r.name, place, slug: r.product?.slug ?? null, image: r.product?.images[0]?.path ?? null, at: r.order.createdAt.toISOString() });
    if (out.length >= take) break;
  }
  return out;
}

/** Cifras para los contadores animados. */
export async function getSiteStats() {
  const [inStock, orders, customers] = await Promise.all([
    db.product.count({ where: { status: "ACTIVE", stock: { gt: 0 } } }),
    db.order.count({ where: { status: { in: ["PAID", "PROCESSING", "SHIPPED", "COMPLETED"] } } }),
    db.user.count({ where: { role: "CUSTOMER" } }),
  ]);
  return { inStock, orders, customers };
}
