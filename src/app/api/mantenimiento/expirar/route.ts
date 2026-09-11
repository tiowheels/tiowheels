import { NextResponse, type NextRequest } from "next/server";
import { expirarPedidosSinPago, MINUTOS_PARA_PAGAR } from "@/lib/orders";

export const dynamic = "force-dynamic";

/**
 * Libera el stock de los pedidos web que quedaron sin pagar.
 * La tienda ya lo hace sola al recibir visitas; esto sirve para un cron o para forzarlo a mano.
 *   GET /api/mantenimiento/expirar   con cabecera  Authorization: Bearer $CRON_SECRET
 */
export async function GET(req: NextRequest) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) return NextResponse.json({ error: "Falta CRON_SECRET en el servidor" }, { status: 503 });
  const enviado = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? req.nextUrl.searchParams.get("token") ?? "";
  if (enviado !== secreto) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const r = await expirarPedidosSinPago({ forzar: true });
  return NextResponse.json({ minutos: MINUTOS_PARA_PAGAR, ...r }, { headers: { "Cache-Control": "no-store" } });
}
