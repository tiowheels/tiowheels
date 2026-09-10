"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, ProductStatus } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { normalizeText, slugify } from "@/lib/format";
import { storeProductImage, deleteProductImageFiles } from "@/lib/media";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

function revalidateProduct(id?: string, slug?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/productos");
  if (id) revalidatePath(`/admin/productos/${id}`);
  revalidatePath("/tienda");
  revalidatePath("/");
  if (slug) revalidatePath(`/producto/${slug}`);
}

/** Recalcula el texto de búsqueda de un producto. */
async function refreshSearchText(productId: string) {
  const p = await db.product.findUnique({ where: { id: productId }, select: { name: true, brand: true, description: true, categories: { select: { name: true } } } });
  if (!p) return;
  const searchText = normalizeText([p.name, p.brand ?? "", p.description ?? "", ...p.categories.map((c) => c.name)].join(" "));
  await db.product.update({ where: { id: productId }, data: { searchText } });
}

/* ---------- Edición rápida (lista) ---------- */

const quickSchema = z.object({
  id: z.string().min(1),
  stock: z.number().int().min(0).max(100_000).optional(),
  price: z.number().int().min(0).max(100_000_000).optional(),
  status: z.enum(ProductStatus).optional(),
});

export async function quickUpdateProduct(input: z.infer<typeof quickSchema>): Promise<ActionResult> {
  await requireAdmin();
  const parsed = quickSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Valor inválido" };
  const { id, ...data } = parsed.data;
  // Editar stock o precio a mano cuenta como novedad para la portada
  const p = await db.product.update({ where: { id }, data: { ...data, listedAt: new Date() }, select: { slug: true } });
  revalidateProduct(id, p.slug);
  return { ok: true };
}

/* ---------- Formulario completo ---------- */

const productSchema = z.object({
  name: z.string().trim().min(2, "El nombre es muy corto").max(200),
  slug: z.string().trim().max(200).optional().default(""),
  price: z.coerce.number().int("El precio debe ser entero").min(0, "Precio inválido"),
  compareAtPrice: z.coerce.number().int().min(0).optional().nullable(),
  stock: z.coerce.number().int().min(0, "Stock inválido"),
  status: z.enum(ProductStatus),
  featured: z.boolean(),
  brand: z.string().trim().max(80).optional().default(""),
  description: z.string().trim().max(10_000).optional().default(""),
  categoryIds: z.array(z.string()).default([]),
  tagNames: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
});

/** Devuelve los ids de las etiquetas, creando las que no existan. */
async function resolveTags(names: string[]): Promise<string[]> {
  const ids: string[] = [];
  const vistos = new Set<string>();
  for (const name of names) {
    const slug = slugify(name);
    if (!slug || vistos.has(slug)) continue;
    vistos.add(slug);
    const tag = await db.tag.upsert({ where: { slug }, create: { slug, name }, update: {}, select: { id: true } });
    ids.push(tag.id);
  }
  return ids;
}

async function uniqueSlug(base: string, excludeId?: string) {
  let slug = base || "producto";
  let i = 1;
  for (;;) {
    const found = await db.product.findUnique({ where: { slug }, select: { id: true } });
    if (!found || found.id === excludeId) return slug;
    i += 1;
    slug = `${base}-${i}`;
  }
}

/**
 * Crea o actualiza un producto desde FormData (incluye archivos "images").
 * Devuelve el id; el cliente redirige.
 */
export async function saveProduct(formData: FormData): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await requireAdmin();
  const id = (formData.get("id") as string | null) || null;
  const compareRaw = (formData.get("compareAtPrice") as string | null)?.trim();
  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug") ?? "",
    price: formData.get("price"),
    compareAtPrice: compareRaw ? compareRaw : null,
    stock: formData.get("stock"),
    status: formData.get("status"),
    featured: formData.get("featured") === "on",
    brand: formData.get("brand") ?? "",
    description: formData.get("description") ?? "",
    categoryIds: formData.getAll("categoryIds").map(String),
    tagNames: formData.getAll("tagNames").map(String).map((t) => t.trim().replace(/\s+/g, " ")).filter(Boolean),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisa los datos del formulario" };
  const d = parsed.data;
  const base = slugify(d.slug || d.name);
  const slug = await uniqueSlug(base, id ?? undefined);
  const tagIds = await resolveTags(d.tagNames);
  const data = {
    listedAt: new Date(), // vuelve a aparecer en "Productos recientes"
    name: d.name,
    slug,
    price: d.price,
    compareAtPrice: d.compareAtPrice && d.compareAtPrice > d.price ? d.compareAtPrice : null,
    stock: d.stock,
    status: d.status,
    featured: d.featured,
    brand: d.brand || null,
    description: d.description || null,
    categories: { set: d.categoryIds.map((cid) => ({ id: cid })) },
    tags: { set: tagIds.map((tid) => ({ id: tid })) },
  };

  let productId = id;
  let oldSlug: string | undefined;
  try {
    if (productId) {
      const prev = await db.product.findUnique({ where: { id: productId }, select: { slug: true } });
      if (!prev) return { ok: false, error: "El producto no existe" };
      oldSlug = prev.slug;
      await db.product.update({ where: { id: productId }, data });
    } else {
      const created = await db.product.create({ data: { ...data, categories: { connect: d.categoryIds.map((cid) => ({ id: cid })) }, tags: { connect: tagIds.map((tid) => ({ id: tid })) } }, select: { id: true } });
      productId = created.id;
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo guardar" };
  }

  // Imágenes nuevas
  const MAX_FILES = 12;
  const MAX_BYTES = 15 * 1024 * 1024;
  const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/avif", "image/gif"]);
  const files = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0)
    .filter((f) => ALLOWED.has(f.type) && f.size <= MAX_BYTES)
    .slice(0, MAX_FILES);
  if (files.length) {
    const last = await db.productImage.aggregate({ where: { productId }, _max: { position: true } });
    let position = (last._max.position ?? -1) + 1;
    for (const file of files) {
      try {
        const buf = Buffer.from(await file.arrayBuffer());
        const stored = await storeProductImage(buf, productId, position);
        await db.productImage.create({ data: { productId, path: stored.path, width: stored.width, height: stored.height, position, alt: d.name } });
        position += 1;
      } catch (e) {
        console.error("imagen no procesada", file.name, e);
      }
    }
  }

  await refreshSearchText(productId);
  revalidateProduct(productId, slug);
  if (oldSlug && oldSlug !== slug) revalidatePath(`/producto/${oldSlug}`);
  return { ok: true, id: productId };
}

export async function deleteProductImage(input: { id: string }): Promise<ActionResult> {
  await requireAdmin();
  const img = await db.productImage.findUnique({ where: { id: input.id }, select: { id: true, path: true, productId: true } });
  if (!img) return { ok: false, error: "Imagen no encontrada" };
  await db.productImage.delete({ where: { id: img.id } });
  await deleteProductImageFiles(img.path).catch(() => {});
  // Reordena posiciones
  const rest = await db.productImage.findMany({ where: { productId: img.productId }, orderBy: { position: "asc" }, select: { id: true } });
  await Promise.all(rest.map((r, i) => db.productImage.update({ where: { id: r.id }, data: { position: i } })));
  revalidateProduct(img.productId);
  return { ok: true, message: "Imagen eliminada" };
}

export async function moveProductImage(input: { id: string; direction: "up" | "down" }): Promise<ActionResult> {
  await requireAdmin();
  const img = await db.productImage.findUnique({ where: { id: input.id }, select: { id: true, productId: true } });
  if (!img) return { ok: false, error: "Imagen no encontrada" };
  const list = await db.productImage.findMany({ where: { productId: img.productId }, orderBy: { position: "asc" }, select: { id: true } });
  const idx = list.findIndex((x) => x.id === img.id);
  const target = input.direction === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || target < 0 || target >= list.length) return { ok: true };
  const ids = list.map((x) => x.id);
  [ids[idx], ids[target]] = [ids[target], ids[idx]];
  await db.$transaction(ids.map((iid, i) => db.productImage.update({ where: { id: iid }, data: { position: i } })));
  revalidateProduct(img.productId);
  return { ok: true };
}

/** Duplica un producto (sin imágenes) como borrador y redirige a editarlo. */
export async function duplicateProduct(input: { id: string }): Promise<{ ok: false; error: string } | never> {
  await requireAdmin();
  const p = await db.product.findUnique({ where: { id: input.id }, include: { categories: { select: { id: true } }, tags: { select: { id: true } } } });
  if (!p) return { ok: false, error: "Producto no encontrado" };
  const slug = await uniqueSlug(slugify(`${p.name} copia`));
  const copy = await db.product.create({
    data: {
      name: `${p.name} (copia)`,
      slug,
      description: p.description,
      shortDescription: p.shortDescription,
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      stock: 0,
      status: "DRAFT",
      featured: false,
      brand: p.brand,
      searchText: p.searchText,
      categories: { connect: p.categories },
      tags: { connect: p.tags },
    },
    select: { id: true },
  });
  revalidateProduct(copy.id);
  redirect(`/admin/productos/${copy.id}?duplicado=1`);
}

/** Elimina el producto; si tiene pedidos asociados lo archiva en vez de borrarlo. */
export async function deleteProduct(input: { id: string }): Promise<ActionResult> {
  await requireAdmin();
  const p = await db.product.findUnique({ where: { id: input.id }, select: { id: true, slug: true, images: { select: { path: true } }, _count: { select: { orderItems: true } } } });
  if (!p) return { ok: false, error: "Producto no encontrado" };
  if (p._count.orderItems > 0) {
    await db.product.update({ where: { id: p.id }, data: { status: "ARCHIVED", stock: 0 } });
    revalidateProduct(p.id, p.slug);
    return { ok: true, message: "El producto tiene pedidos asociados: se archivó en vez de eliminarlo." };
  }
  await db.product.delete({ where: { id: p.id } });
  for (const img of p.images) await deleteProductImageFiles(img.path).catch(() => {});
  revalidateProduct(undefined, p.slug);
  return { ok: true, message: "Producto eliminado" };
}
