import "server-only";
import { db } from "@/lib/db";
import { getCategoryTree } from "@/lib/catalog";
import type { CategoryNode } from "@/components/admin/ProductForm";

export async function getBrands() {
  const rows = await db.product.groupBy({ by: ["brand"], where: { brand: { not: null } }, _count: { _all: true }, orderBy: { _count: { brand: "desc" } } });
  return rows.map((r) => r.brand).filter((b): b is string => Boolean(b));
}

export async function getCategoryNodes(): Promise<CategoryNode[]> {
  const tree = await getCategoryTree();
  const sorted = [...tree].sort((a, b) => a.name.localeCompare(b.name, "es"));
  return sorted.map((r) => ({ id: r.id, name: r.name, children: [...r.children].sort((a, b) => a.name.localeCompare(b.name, "es")).map((c) => ({ id: c.id, name: c.name })) }));
}

/** Etiquetas existentes (los "lotes" de WooCommerce: Básicos 53, Premium 2…), en orden natural. */
export async function getTags() {
  const rows = await db.tag.findMany({ select: { id: true, name: true, _count: { select: { products: true } } } });
  return rows
    .sort((a, b) => a.name.localeCompare(b.name, "es", { numeric: true }))
    .map((t) => ({ id: t.id, name: t.name, count: t._count.products }));
}
