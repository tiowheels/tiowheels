import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { PAYMENT_METHOD, ORDER_CHANNEL } from "@/components/admin/labels";
import { resolveRange, bucketLabel } from "@/app/admin/(panel)/reportes/_lib/range";
import { getSalesSummary, getByPaymentMethod, getSeries, getTopByUnits, getByCategory, getByBrand, getAbandoned, getAbandonedSummary, getTopCustomers, getCustomerMix, getInventoryRows } from "@/app/admin/(panel)/reportes/_lib/queries";

/**
 * Exporta un reporte del panel a CSV.
 *   GET /admin/api/reportes/export?reporte=ventas&rango=30d
 *   GET /admin/api/reportes/export?reporte=productos&desde=2026-08-01&hasta=2026-08-31
 * Protegido: requiere sesión ADMIN (responde 401 en JSON en vez de redirigir).
 *
 * El CSV usa punto y coma y BOM UTF-8 para que Excel en español lo abra sin configurar nada.
 */
export const dynamic = "force-dynamic";

const REPORTS = ["ventas", "productos", "categorias", "marcas", "abandonados", "clientes", "inventario"] as const;
type Report = (typeof REPORTS)[number];

type Cell = string | number | null | undefined;

/** Serializa filas a CSV con separador ";" y BOM UTF-8. */
function toCsv(headers: string[], rows: Cell[][]) {
  const esc = (v: Cell) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(esc).join(";"), ...rows.map((r) => r.map(esc).join(";"))];
  const BOM = "\uFEFF"; // Excel en español necesita el BOM para leer UTF-8
  return BOM + lines.join("\r\n") + "\r\n";
}

const dateTime = new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const reporte = (sp.get("reporte") ?? "ventas") as Report;
  if (!REPORTS.includes(reporte)) return NextResponse.json({ error: `Reporte desconocido: ${reporte}` }, { status: 400 });

  const range = resolveRange(Object.fromEntries(sp.entries()));
  let headers: string[] = [];
  let rows: Cell[][] = [];

  switch (reporte) {
    case "ventas": {
      const [summary, series, payments] = await Promise.all([getSalesSummary(range.from, range.to), getSeries(range), getByPaymentMethod(range.from, range.to)]);
      headers = ["Bloque", "Detalle", "Pedidos", "Unidades", "Vendido CLP"];
      rows = [
        ["Resumen", "Total del periodo", summary.all.orders, summary.all.units, summary.all.total],
        ["Resumen", "Ticket promedio", "", "", summary.all.ticket],
        ["Canal", "Web (incluye WooCommerce web)", summary.web.orders, summary.web.units, summary.web.total],
        ["Canal", "Manual (venta rápida y app)", summary.manual.orders, summary.manual.units, summary.manual.total],
        ...summary.byChannel.map((c) => ["Canal detalle", ORDER_CHANNEL[c.channel].label, c.orders, c.units, c.total] as Cell[]),
        ...payments.map((p) => ["Método de pago", PAYMENT_METHOD[p.method], p.orders, "", p.total] as Cell[]),
        ...series.map((p) => [range.bucket === "day" ? "Día" : range.bucket === "week" ? "Semana" : "Mes", bucketLabel(p.key, range.bucket), p.orders, p.units, p.total] as Cell[]),
      ];
      break;
    }
    case "productos": {
      const products = await getTopByUnits(range, 500);
      headers = ["#", "Producto", "Marca", "Unidades vendidas", "Ingresos CLP", "Stock actual", "Precio CLP", "ID"];
      rows = products.map((p, i) => [i + 1, p.name, p.brand ?? "Sin marca", p.units, p.revenue, p.stock, p.price, p.id]);
      break;
    }
    case "categorias":
    case "marcas": {
      const [data, summary] = await Promise.all([reporte === "categorias" ? getByCategory(range, 1000) : getByBrand(range, 1000), getSalesSummary(range.from, range.to)]);
      const total = summary.all.total;
      headers = [reporte === "categorias" ? "Categoría" : "Marca", "Unidades", "Ingresos CLP", "Pedidos", "% del total vendido"];
      rows = data.map((r) => [r.name, r.units, r.revenue, r.orders, total > 0 ? `${((r.revenue / total) * 100).toFixed(1)}%` : ""]);
      break;
    }
    case "abandonados": {
      const [list, summary] = await Promise.all([getAbandoned(range, 2000), getAbandonedSummary(range)]);
      headers = ["N° pedido", "Fecha", "Cliente", "Correo", "Teléfono", "Método de pago elegido", "Ítems", "Total CLP", "Productos"];
      rows = [
        ...list.map((o) => [o.number, dateTime.format(o.createdAt), `${o.firstName} ${o.lastName ?? ""}`.trim(), o.email ?? "", o.phone ?? "", PAYMENT_METHOD[o.paymentMethod], o.items, o.total, o.products ?? ""] as Cell[]),
        [],
        ["Resumen", `${summary.count} checkouts sin completar`, "", "", "", "", "", summary.total, summary.conversion == null ? "" : `Conversión ${(summary.conversion * 100).toFixed(1)}%`],
      ];
      break;
    }
    case "clientes": {
      const [list, mix] = await Promise.all([getTopCustomers(range, 1000), getCustomerMix(range)]);
      headers = ["#", "Cliente", "Correo", "Teléfono", "Pedidos", "Total CLP", "Tiene cuenta"];
      rows = [
        ...list.map((c, i) => [i + 1, c.name || "Sin nombre", c.email ?? "", c.phone ?? "", c.orders, c.total, c.userId ? "Sí" : "No"] as Cell[]),
        [],
        ["Resumen", `Nuevos: ${mix.nuevos}`, `Recurrentes: ${mix.recurrentes}`, "", "", "", ""],
      ];
      break;
    }
    case "inventario": {
      const list = await getInventoryRows(range);
      headers = ["Producto", "Marca", "Estado", "Precio CLP", "Stock", "Valor CLP", "Vendidos en el rango", "ID"];
      rows = list.map((p) => [p.name, p.brand ?? "Sin marca", p.status, p.price, p.stock, p.value, p.sold, p.id]);
      break;
    }
  }

  const filename = `tiowheels-${reporte}-${range.desde}_${range.hasta}.csv`;
  return new NextResponse(toCsv(headers, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
