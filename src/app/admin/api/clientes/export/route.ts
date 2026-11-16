import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import ExcelJS from "exceljs";

export const dynamic = "force-dynamic";

type Fila = {
  id: string | null; name: string | null; lastName: string | null; email: string; phone: string | null; createdAt: Date;
  orders: number; spent: number; last: Date | null;
  rut: string | null; address1: string | null; commune: string | null; region: string | null;
};

/**
 * Lista de clientes en Excel, con la misma búsqueda y orden de la pantalla del panel.
 *   GET /admin/api/clientes/export?q=&orden=
 * Incluye a quienes compraron sin registrarse (agrupados por correo).
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").trim();
  const orden = sp.get("orden") || "gasto";
  const like = `%${q}%`;
  const digits = q.replace(/\D/g, "");

  const personas = Prisma.sql`
    SELECT u."id", u."name", u."lastName", lower(u."email") AS email, u."phone", u."createdAt"
      FROM "User" u
     WHERE u."role" = 'CUSTOMER'
    UNION ALL
    SELECT * FROM (
      SELECT DISTINCT ON (lower(o."email"))
             NULL::text AS "id", o."firstName" AS "name", o."lastName", lower(o."email") AS email, o."phone", o."createdAt"
        FROM "Order" o
       WHERE o."email" IS NOT NULL AND o."email" <> ''
         AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE lower(u2."email") = lower(o."email"))
       ORDER BY lower(o."email"), o."createdAt" DESC
    ) invitados`;

  const filtro = q
    ? Prisma.sql`AND (p."name" ILIKE ${like} OR p."lastName" ILIKE ${like} OR (coalesce(p."name",'') || ' ' || coalesce(p."lastName", '')) ILIKE ${like} OR p."email" ILIKE ${like} ${digits.length >= 4 ? Prisma.sql`OR regexp_replace(coalesce(p."phone",''), '\\D', '', 'g') LIKE ${"%" + digits + "%"}` : Prisma.empty})`
    : Prisma.empty;
  const order = orden === "reciente" ? Prisma.sql`p."createdAt" DESC` : orden === "nombre" ? Prisma.sql`p."name" ASC NULLS LAST, p."lastName" ASC` : orden === "pedidos" ? Prisma.sql`s.orders DESC, s.spent DESC` : Prisma.sql`s.spent DESC, s.orders DESC`;

  const filas = await db.$queryRaw<Fila[]>`
    WITH p AS (${personas})
    SELECT p."id", p."name", p."lastName", p."email", p."createdAt",
           s.orders::int AS orders, s.spent::int AS spent, s.last,
           u."rut", u."address1", u."commune", u."region",
           coalesce(nullif(p."phone", ''), u."phone") AS phone
    FROM p
    LEFT JOIN LATERAL (
      SELECT count(*) AS orders, coalesce(sum(o.total), 0) AS spent, max(o."createdAt") AS last
      FROM "Order" o
      WHERE lower(coalesce(o."email", '')) = p."email" AND o.status NOT IN ('CANCELLED', 'REFUNDED')
    ) s ON true
    LEFT JOIN LATERAL (
      SELECT max(nullif(o."rut", '')) AS "rut",
             (array_agg(o."address1" ORDER BY o."createdAt" DESC) FILTER (WHERE coalesce(o."address1", '') <> ''))[1] AS "address1",
             (array_agg(o."commune" ORDER BY o."createdAt" DESC) FILTER (WHERE coalesce(o."commune", '') <> ''))[1] AS "commune",
             (array_agg(o."region" ORDER BY o."createdAt" DESC) FILTER (WHERE coalesce(o."region", '') <> ''))[1] AS "region",
             (array_agg(o."phone" ORDER BY o."createdAt" DESC) FILTER (WHERE coalesce(o."phone", '') <> ''))[1] AS "phone"
      FROM "Order" o
      WHERE lower(coalesce(o."email", '')) = p."email"
    ) u ON true
    WHERE TRUE ${filtro}
    ORDER BY ${order}`;

  const libro = new ExcelJS.Workbook();
  libro.creator = "Tío Wheels";
  libro.created = new Date();
  const hoja = libro.addWorksheet("Clientes", { views: [{ state: "frozen", ySplit: 1 }] });
  const fecha = { numFmt: "dd-mm-yyyy" };
  hoja.columns = [
    { header: "Nombre", key: "nombre", width: 20 },
    { header: "Apellido", key: "apellido", width: 22 },
    { header: "Correo", key: "correo", width: 34 },
    { header: "Teléfono", key: "telefono", width: 18 },
    { header: "RUT", key: "rut", width: 14 },
    { header: "Dirección", key: "direccion", width: 36 },
    { header: "Comuna", key: "comuna", width: 20 },
    { header: "Región", key: "region", width: 26 },
    { header: "Pedidos", key: "pedidos", width: 10 },
    { header: "Total gastado", key: "gastado", width: 15, style: { numFmt: '"$"#,##0' } },
    { header: "Último pedido", key: "ultimo", width: 15, style: fecha },
    { header: "Cliente desde", key: "desde", width: 15, style: fecha },
    { header: "Tiene cuenta", key: "cuenta", width: 13 },
  ];
  const cabecera = hoja.getRow(1);
  cabecera.font = { bold: true, color: { argb: "FF0A0A0A" } };
  cabecera.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFB0D800" } };
  cabecera.alignment = { vertical: "middle" };
  cabecera.height = 22;

  for (const c of filas) {
    hoja.addRow([c.name ?? "", c.lastName ?? "", c.email, c.phone ?? "", c.rut ?? "", c.address1 ?? "", c.commune ?? "", c.region ?? "", c.orders, c.spent, c.last, c.createdAt, c.id ? "Sí" : "No"]);
  }
  hoja.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: hoja.columns.length } };

  const buffer = Buffer.from(await libro.xlsx.writeBuffer());
  return new NextResponse(buffer as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="clientes-tiowheels-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
