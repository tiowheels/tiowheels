import { NextResponse, type NextRequest } from "next/server";
import { syncFlowPayment } from "@/lib/orders";

export const dynamic = "force-dynamic";

/**
 * Webhook de Flow (urlConfirmation). Flow envía POST form-urlencoded con `token`.
 * Respondemos 200 siempre que el token se haya procesado (aunque el pago siga pendiente),
 * para que Flow no reintente indefinidamente. Es idempotente.
 */
export async function POST(req: NextRequest) {
  const token = await readToken(req);
  if (!token) return NextResponse.json({ ok: false, error: "token requerido" }, { status: 400 });

  try {
    const result = await syncFlowPayment(token);
    if (result.outcome === "unknown") return NextResponse.json({ ok: false, error: "pago no encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true, outcome: result.outcome });
  } catch (err) {
    console.error("[flow/confirm] error", err);
    return NextResponse.json({ ok: false, error: "error interno" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "Método no permitido" }, { status: 405 });
}

async function readToken(req: NextRequest): Promise<string | null> {
  const ct = req.headers.get("content-type") ?? "";
  try {
    if (ct.includes("application/json")) {
      const body = (await req.json()) as { token?: string };
      return body.token?.trim() || null;
    }
    const form = await req.formData();
    const t = form.get("token");
    return typeof t === "string" && t.trim() ? t.trim() : null;
  } catch {
    return req.nextUrl.searchParams.get("token")?.trim() || null;
  }
}
