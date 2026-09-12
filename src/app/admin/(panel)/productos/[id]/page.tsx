import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/admin/PageHeader";
import { hrefVolver } from "@/app/admin/_lib/volver";
import { ProductStatusBadge } from "@/components/admin/StatusBadge";
import { ProductForm } from "@/components/admin/ProductForm";
import { getCategoryNodes, getTags } from "@/app/admin/_lib/products";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = await db.product.findUnique({ where: { id }, select: { name: true } });
  return { title: p ? `Editar · ${p.name}` : "Producto" };
}

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [product, categories, tags] = await Promise.all([
    db.product.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true, price: true, compareAtPrice: true, stock: true, status: true, featured: true, brand: true, description: true, totalSales: true, updatedAt: true, createdAt: true, legacyId: true, categories: { select: { id: true } }, tags: { select: { name: true } }, images: { orderBy: { position: "asc" }, select: { id: true, path: true, position: true } }, _count: { select: { orderItems: true } } },
    }),
    getCategoryNodes(),
    getTags(),
  ]);
  if (!product) notFound();

  // Si venías de un pedido, el botón de atrás te devuelve a ese pedido y no al listado
  const volverA = typeof sp.pedido === "string" && /^[a-z0-9]+$/i.test(sp.pedido) ? await db.order.findUnique({ where: { id: sp.pedido }, select: { id: true, number: true } }) : null;

  return (
    <>
      <PageHeader
        back={volverA ? { href: `/admin/pedidos/${volverA.id}${typeof sp.volver === "string" ? `?volver=${encodeURIComponent(sp.volver)}` : ""}`, label: `Pedido #${volverA.number}` } : { href: hrefVolver("/admin/productos", sp.volver) ?? "/admin/productos", label: sp.volver ? "Volver a la búsqueda" : "Productos" }}
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span className="line-clamp-2">{product.name}</span>
            <ProductStatusBadge status={product.status} />
          </span>
        }
        description={`${product.totalSales} vendidos · ${product._count.orderItems} pedidos · actualizado ${formatDateTime(product.updatedAt)}${product.legacyId ? ` · Woo #${product.legacyId}` : ""}`}
      />
      <ProductForm
        product={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          price: product.price,
          compareAtPrice: product.compareAtPrice,
          stock: product.stock,
          status: product.status,
          featured: product.featured,
          brand: product.brand,
          description: product.description,
          categoryIds: product.categories.map((c) => c.id),
          tagNames: product.tags.map((t) => t.name),
          images: product.images,
          orderCount: product._count.orderItems,
        }}
        categories={categories}
        tags={tags}
        duplicated={sp.duplicado === "1"}
      />
    </>
  );
}
