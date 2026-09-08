import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { productCardSelect } from "@/lib/catalog";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const MAX_IDS = 12;

/**
 * GET /api/products?ids=a,b,c — datos de tarjeta para hasta 12 productos activos (mismo orden que `ids`).
 * Público y cacheable 60 s; lo usa "Vistos recientemente" (localStorage guarda solo ids).
 */
export async function GET(req: NextRequest) {
  const limit = rateLimit(`products:${await clientIp()}`, 120, 60);
  if (!limit.ok) return NextResponse.json({ products: [] }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } });

  const ids = Array.from(
    new Set(
      (req.nextUrl.searchParams.get("ids") ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter((s) => /^[a-z0-9]{1,40}$/i.test(s)),
    ),
  ).slice(0, MAX_IDS);
  if (!ids.length) return NextResponse.json({ products: [] }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=60" } });

  const rows = await db.product.findMany({ where: { id: { in: ids }, status: "ACTIVE" }, select: productCardSelect });
  const byId = new Map(rows.map((p) => [p.id, p]));
  const products = ids.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => !!p);
  return NextResponse.json({ products }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=60" } });
}
