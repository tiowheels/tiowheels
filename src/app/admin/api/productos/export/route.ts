import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { normalizeText } from "@/lib/format";
import { mediaUrl } from "@/lib/media-url";
import { toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

export const CSV_HEADERS = ["codigo", "nombre", "slug", "marca", "precio", "precio_anterior", "stock", "estado", "destacado", "descripcion", "categorias", "etiquetas", "vendidos", "imagenes"] as const;

/**
 * Exporta el catálogo a CSV respetando los filtros de la lista del panel.
 *   GET /admin/api/productos/export?q=&cat=&estado=&disp=&etiqueta=
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").trim();
  const disp = sp.get("disp") ?? "todos";
  const cat = sp.get("cat") ?? "";
  const etiqueta = sp.get("etiqueta") ?? "";
  const estado = sp.get("estado") ?? "";

  const conds: Prisma.Sql[] = [];
  if (disp === "stock") conds.push(Prisma.sql`p."stock" > 0`);
  else if (disp === "agotados") conds.push(Prisma.sql`p."stock" <= 0`);
  else if (disp === "ultimo") conds.push(Prisma.sql`p."stock" = 1`);
  if (estado === "ACTIVE" || estado === "DRAFT" || estado === "ARCHIVED") conds.push(Prisma.sql`p."status" = ${estado}::"ProductStatus"`);
  if (cat) conds.push(Prisma.sql`EXISTS (SELECT 1 FROM "_CategoryToProduct" cp WHERE cp."B" = p."id" AND cp."A" = ${cat})`);
  if (etiqueta) conds.push(Prisma.sql`EXISTS (SELECT 1 FROM "_ProductToTag" pt WHERE pt."A" = p."id" AND pt."B" = ${etiqueta})`);
  for (const t of normalizeText(q).split(" ").filter((x) => x.length >= 2)) {
    conds.push(Prisma.sql`(p."searchText" ILIKE ${"%" + t + "%"} OR p."name" ILIKE ${"%" + t + "%"})`);
  }
  const where = conds.length ? Prisma.join(conds, " AND ") : Prisma.sql`TRUE`;
  const rows = await db.$queryRaw<{ id: string }[]>`SELECT p."id" FROM "Product" p WHERE ${where} ORDER BY p."name" ASC`;
  const ids = rows.map((r) => r.id);

  const salida: (string | number | null)[][] = [];
  const LOTE = 500;
  for (let i = 0; i < ids.length; i += LOTE) {
    const productos = await db.product.findMany({
      where: { id: { in: ids.slice(i, i + LOTE) } },
      select: {
        id: true, legacyId: true, name: true, slug: true, brand: true, price: true, compareAtPrice: true, stock: true, status: true, featured: true, description: true, totalSales: true,
        categories: { select: { name: true } },
        tags: { select: { name: true } },
        images: { orderBy: { position: "asc" }, select: { path: true } },
      },
    });
    const porId = new Map(productos.map((p) => [p.id, p]));
    for (const id of ids.slice(i, i + LOTE)) {
      const p = porId.get(id);
      if (!p) continue;
      salida.push([
        p.id,
        p.name,
        p.slug,
        p.brand ?? "",
        p.price,
        p.compareAtPrice ?? "",
        p.stock,
        p.status,
        p.featured ? "si" : "no",
        (p.description ?? "").replace(/\s+/g, " ").trim(),
        p.categories.map((c) => c.name).join(" | "),
        p.tags.map((t) => t.name).join(" | "),
        p.totalSales,
        p.images.map((im) => mediaUrl(im.path, "large")).join(" | "),
      ]);
    }
  }

  const csv = toCsv([...CSV_HEADERS], salida);
  const fecha = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="productos-tiowheels-${fecha}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
