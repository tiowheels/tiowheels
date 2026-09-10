import type { Metadata } from "next";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/PageHeader";
import { CategoryManager, type CategoryItem } from "@/components/admin/CategoryManager";
import { TagManager, type TagItem } from "@/components/admin/TagManager";

export const metadata: Metadata = { title: "Categorías y etiquetas" };
export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const cats = await db.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, parentId: true, sortOrder: true, featured: true, _count: { select: { products: true } } },
  });
  const inStockRows = await db.$queryRaw<{ id: string; n: bigint }[]>`
    SELECT cp."A" AS id, count(*)::bigint AS n
    FROM "_CategoryToProduct" cp JOIN "Product" p ON p."id" = cp."B"
    WHERE p."status" = 'ACTIVE' AND p."stock" > 0 GROUP BY cp."A"`;
  const inStock = new Map(inStockRows.map((r) => [r.id, Number(r.n)]));

  const tagRows = await db.tag.findMany({
    select: { id: true, name: true, _count: { select: { products: true } }, products: { where: { status: "ACTIVE", stock: { gt: 0 } }, select: { id: true } } },
  });
  const tags: TagItem[] = tagRows
    .map((t) => ({ id: t.id, name: t.name, total: t._count.products, inStock: t.products.length }))
    .sort((a, b) => a.name.localeCompare(b.name, "es", { numeric: true }));

  const byId = new Map<string, CategoryItem>(cats.map((c) => [c.id, { id: c.id, name: c.name, slug: c.slug, parentId: c.parentId, sortOrder: c.sortOrder, featured: c.featured, total: c._count.products, inStock: inStock.get(c.id) ?? 0, children: [] }]));
  const roots: CategoryItem[] = [];
  for (const c of byId.values()) {
    if (c.parentId && byId.has(c.parentId)) byId.get(c.parentId)!.children.push(c);
    else roots.push(c);
  }

  return (
    <>
      <PageHeader title="Categorías y etiquetas" description={`${cats.length} categorías en dos niveles · ${tags.length} etiquetas de lote. El orden define cómo se muestran en la tienda.`} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <CategoryManager roots={roots} />
        <TagManager tags={tags} />
      </div>
    </>
  );
}
