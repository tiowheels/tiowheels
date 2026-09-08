import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/PageHeader";
import { ProductForm } from "@/components/admin/ProductForm";
import { getBrands, getCategoryNodes } from "@/app/admin/_lib/products";

export const metadata: Metadata = { title: "Nuevo producto" };
export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const [brands, categories] = await Promise.all([getBrands(), getCategoryNodes()]);
  return (
    <>
      <PageHeader back={{ href: "/admin/productos", label: "Productos" }} title="Nuevo producto" description="Las imágenes se suben al guardar." />
      <ProductForm product={null} brands={brands} categories={categories} />
    </>
  );
}
