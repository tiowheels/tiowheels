import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { normalizeText } from "@/lib/format";
import { mediaUrl } from "@/lib/media-url";
import { toCsv } from "@/lib/csv";
import ExcelJS from "exceljs";

export const dynamic = "force-dynamic";

export const CSV_HEADERS = ["codigo", "nombre", "slug", "marca", "precio", "precio_anterior", "stock", "estado", "destacado", "descripcion", "categorias", "etiquetas", "vendidos", "imagenes"] as const;

/** Encabezados en bonito para la planilla de Excel. */
const TITULOS = ["Código", "Nombre", "Dirección web", "Marca", "Precio", "Precio anterior", "Stock", "Estado", "Destacado", "Descripción", "Categorías", "Etiquetas", "Vendidos", "Imágenes"] as const;

/**
 * Exporta el catálogo respetando los filtros de la lista del panel.
 *   GET /admin/api/productos/export?q=&cat=&estado=&disp=&etiqueta=          → CSV
 *   GET /admin/api/productos/export?formato=excel&…                          → Excel (.xlsx)
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

  const fecha = new Date().toISOString().slice(0, 10);

  if ((sp.get("formato") ?? "csv").toLowerCase().startsWith("excel") || sp.get("formato") === "xlsx") {
    const buffer = await construirExcel(salida);
    return new NextResponse(buffer as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="productos-tiowheels-${fecha}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const csv = toCsv([...CSV_HEADERS], salida);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="productos-tiowheels-${fecha}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

/** Planilla lista para abrir en Excel: encabezado fijo, filtros, precios en pesos y anchos cómodos. */
async function construirExcel(filas: (string | number | null)[][]) {
  const libro = new ExcelJS.Workbook();
  libro.creator = "Tío Wheels";
  libro.created = new Date();
  const hoja = libro.addWorksheet("Productos", { views: [{ state: "frozen", ySplit: 1 }] });

  hoja.columns = [
    { header: TITULOS[0], key: "codigo", width: 26 },
    { header: TITULOS[1], key: "nombre", width: 42 },
    { header: TITULOS[2], key: "slug", width: 32 },
    { header: TITULOS[3], key: "marca", width: 16 },
    { header: TITULOS[4], key: "precio", width: 12, style: { numFmt: '"$"#,##0' } },
    { header: TITULOS[5], key: "precio_anterior", width: 15, style: { numFmt: '"$"#,##0' } },
    { header: TITULOS[6], key: "stock", width: 9 },
    { header: TITULOS[7], key: "estado", width: 12 },
    { header: TITULOS[8], key: "destacado", width: 11 },
    { header: TITULOS[9], key: "descripcion", width: 50 },
    { header: TITULOS[10], key: "categorias", width: 34 },
    { header: TITULOS[11], key: "etiquetas", width: 22 },
    { header: TITULOS[12], key: "vendidos", width: 10 },
    { header: TITULOS[13], key: "imagenes", width: 60 },
  ];

  const cabecera = hoja.getRow(1);
  cabecera.font = { bold: true, color: { argb: "FF0A0A0A" } };
  cabecera.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFB0D800" } };
  cabecera.alignment = { vertical: "middle" };
  cabecera.height = 22;

  for (const f of filas) hoja.addRow(f);
  hoja.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: hoja.columns.length } };

  // Stock en rojo cuando está agotado, para verlo de una pasada
  for (let i = 2; i <= hoja.rowCount; i++) {
    const celda = hoja.getRow(i).getCell("stock");
    if (Number(celda.value) <= 0) celda.font = { color: { argb: "FFC0392B" }, bold: true };
  }

  return Buffer.from(await libro.xlsx.writeBuffer());
}
