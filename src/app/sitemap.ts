import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { SITE } from "@/lib/site";


// Se genera en cada petición (necesita la base de datos; no puede prerenderizarse al compilar)
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE.url.replace(/\/$/, "");
  const [products, categories] = await Promise.all([
    db.product.findMany({ where: { status: "ACTIVE", stock: { gt: 0 } }, select: { slug: true, updatedAt: true }, orderBy: { updatedAt: "desc" } }),
    db.category.findMany({ where: { products: { some: { status: "ACTIVE", stock: { gt: 0 } } } }, select: { slug: true } }),
  ]);

  const statics: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/tienda`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/nosotros`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/contacto`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/terminos`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/privacidad`, changeFrequency: "yearly", priority: 0.2 },
  ];

  return [
    ...statics,
    ...categories.map((c) => ({ url: `${base}/tienda?cat=${encodeURIComponent(c.slug)}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...products.map((p) => ({ url: `${base}/producto/${encodeURIComponent(p.slug)}`, lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.6 })),
  ];
}
