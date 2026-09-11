import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { normalizeText } from "@/lib/format";
import { mediaUrl } from "@/lib/media-url";

/**
 * Búsqueda instantánea para el panel (venta rápida).
 *   GET /admin/api/products?q=datsun            → productos con stock
 *   GET /admin/api/products?q=datsun&all=1      → incluye agotados
 *   GET /admin/api/products?q=datsun&limit=48   → más resultados (tope 100)
 * Devuelve { total, products }: total es cuántos calzan, para saber si falta ver más.
 *   GET /admin/api/products?type=customer&q=ana → clientes
 * Protegido: requiere sesión ADMIN (responde 401 en JSON en vez de redirigir).
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").trim();
  const type = sp.get("type") ?? "product";
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit") ?? 24)));

  if (type === "customer") {
    if (q.length < 2) return NextResponse.json({ customers: [] });
    const customers = await db.user.findMany({
      where: {
        role: "CUSTOMER",
        OR: [{ name: { contains: q, mode: "insensitive" } }, { lastName: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { phone: { contains: q.replace(/\D/g, "") || q } }],
      },
      take: limit,
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, lastName: true, email: true, phone: true },
    });
    return NextResponse.json({ customers }, { headers: { "Cache-Control": "no-store" } });
  }

  const all = sp.get("all") === "1";
  const terms = normalizeText(q)
    .split(" ")
    .filter((t) => t.length >= 1);
  const conds: Prisma.Sql[] = [Prisma.sql`p."status" <> 'ARCHIVED'`];
  if (!all) conds.push(Prisma.sql`p."stock" > 0`);
  if (terms.length === 0) {
    // sin texto: últimos productos con stock (útil para empezar)
    conds.push(Prisma.sql`p."status" = 'ACTIVE'`);
  }
  for (const t of terms) conds.push(Prisma.sql`(p."searchText" ILIKE ${"%" + t + "%"} OR p."name" ILIKE ${"%" + t + "%"})`);
  const where = Prisma.join(conds, " AND ");
  const order = q ? Prisma.sql`similarity(p."name", ${normalizeText(q)}) DESC, p."stock" DESC, p."updatedAt" DESC` : Prisma.sql`p."updatedAt" DESC`;
  const [rows, totalRow] = await Promise.all([
    db.$queryRaw<{ id: string }[]>`SELECT p."id" FROM "Product" p WHERE ${where} ORDER BY ${order} LIMIT ${limit}`,
    db.$queryRaw<{ n: bigint }[]>`SELECT count(*)::bigint AS n FROM "Product" p WHERE ${where}`,
  ]);
  const total = Number(totalRow[0]?.n ?? 0);
  const ids = rows.map((r) => r.id);
  const products = ids.length
    ? await db.product.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, price: true, compareAtPrice: true, stock: true, brand: true, status: true, images: { orderBy: { position: "asc" }, take: 1, select: { path: true } } } })
    : [];
  const byId = new Map(products.map((p) => [p.id, p]));
  return NextResponse.json(
    {
      total,
      products: ids
        .map((id) => byId.get(id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
        .map((p) => ({ id: p.id, name: p.name, price: p.price, compareAtPrice: p.compareAtPrice, stock: p.stock, brand: p.brand, status: p.status, image: mediaUrl(p.images[0]?.path, "thumb") })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
