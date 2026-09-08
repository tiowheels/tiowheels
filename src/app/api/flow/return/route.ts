import { NextResponse, type NextRequest } from "next/server";
import { rememberOrderOnResponse } from "@/lib/order-access";
import { syncFlowPayment } from "@/lib/orders";

export const dynamic = "force-dynamic";

/**
 * Retorno del cliente desde Flow (urlReturn). Flow hace POST con `token`
 * (algunos medios vuelven por GET). Consultamos el estado por si el webhook
 * aún no llegó y redirigimos a la página del pedido.
 */
export async function POST(req: NextRequest) {
  return handle(req);
}

export async function GET(req: NextRequest) {
  return handle(req);
}

async function handle(req: NextRequest) {
  const token = await readToken(req);
  if (!token) return NextResponse.redirect(new URL("/carrito", req.nextUrl.origin), 303);

  try {
    const result = await syncFlowPayment(token);
    if (!result.orderId) return NextResponse.redirect(new URL("/carrito", req.nextUrl.origin), 303);
    const pago = result.outcome === "paid" ? "ok" : result.outcome === "rejected" ? "rechazado" : "pendiente";
    const res = NextResponse.redirect(new URL(`/pedido/${result.orderId}?pago=${pago}`, req.nextUrl.origin), 303);
    // El cliente vuelve desde Flow (a veces en otra pestaña o navegador in-app): recordamos el pedido en este navegador.
    return rememberOrderOnResponse(req, res, result.orderId);
  } catch (err) {
    console.error("[flow/return] error", err);
    return NextResponse.redirect(new URL("/carrito", req.nextUrl.origin), 303);
  }
}

async function readToken(req: NextRequest): Promise<string | null> {
  const fromQuery = req.nextUrl.searchParams.get("token")?.trim();
  if (fromQuery) return fromQuery;
  if (req.method !== "POST") return null;
  try {
    const form = await req.formData();
    const t = form.get("token");
    return typeof t === "string" && t.trim() ? t.trim() : null;
  } catch {
    return null;
  }
}
