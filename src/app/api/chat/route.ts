import { NextResponse, type NextRequest } from "next/server";
import { responder } from "@/lib/chat";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const limite = rateLimit(`chat:${await clientIp()}`, 40, 60);
  if (!limite.ok) {
    return NextResponse.json({ text: "Estás escribiendo muy rápido. Espera unos segundos y vuelve a intentarlo." }, { status: 429, headers: { "Retry-After": String(limite.retryAfterSec) } });
  }
  let mensaje = "";
  try {
    const body = (await req.json()) as { mensaje?: unknown };
    mensaje = typeof body.mensaje === "string" ? body.mensaje.slice(0, 200) : "";
  } catch {
    return NextResponse.json({ text: "No entendí el mensaje." }, { status: 400 });
  }
  try {
    const respuesta = await responder(mensaje);
    return NextResponse.json(respuesta, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[chat] error", err);
    return NextResponse.json({ text: "Tuve un problema al buscar. Intenta de nuevo o escríbenos por WhatsApp." }, { status: 500 });
  }
}
