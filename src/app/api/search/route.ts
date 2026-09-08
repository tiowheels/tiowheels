import { NextResponse, type NextRequest } from "next/server";
import { quickSearch } from "@/lib/catalog";
import { mediaUrl } from "@/lib/media-url";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const limit = rateLimit(`search:${await clientIp()}`, 120, 60);
  if (!limit.ok) return NextResponse.json({ products: [], categories: [] }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } });
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 80);
  const { products, categories } = await quickSearch(q, 8);
  return NextResponse.json(
    {
      products: products.map((p) => ({
        slug: p.slug,
        name: p.name,
        price: p.price,
        stock: p.stock,
        brand: p.brand,
        image: mediaUrl(p.images[0]?.path, "thumb"),
      })),
      categories,
    },
    { headers: { "Cache-Control": "public, max-age=30, s-maxage=60" } },
  );
}
