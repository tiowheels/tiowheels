"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/format";

export type ActionResult = { ok: true; message?: string; id?: string } | { ok: false; error: string };

function revalidate() {
  revalidatePath("/admin/categorias");
  revalidatePath("/admin/productos");
  revalidatePath("/tienda");
  revalidatePath("/");
}

async function uniqueSlug(base: string, excludeId?: string) {
  let slug = base || "categoria";
  let i = 1;
  for (;;) {
    const f = await db.category.findUnique({ where: { slug }, select: { id: true } });
    if (!f || f.id === excludeId) return slug;
    i += 1;
    slug = `${base}-${i}`;
  }
}

const createSchema = z.object({ name: z.string().trim().min(2, "Nombre muy corto").max(80), parentId: z.string().nullable().optional() });

export async function createCategory(input: z.infer<typeof createSchema>): Promise<ActionResult> {
  await requireAdmin();
  const p = createSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Datos inválidos" };
  const parentId = p.data.parentId || null;
  if (parentId) {
    const parent = await db.category.findUnique({ where: { id: parentId }, select: { parentId: true } });
    if (!parent) return { ok: false, error: "La categoría padre no existe" };
    if (parent.parentId) return { ok: false, error: "Solo se permiten dos niveles de categorías" };
  }
  const last = await db.category.aggregate({ where: { parentId }, _max: { sortOrder: true } });
  const c = await db.category.create({ data: { name: p.data.name, slug: await uniqueSlug(slugify(p.data.name)), parentId, sortOrder: (last._max.sortOrder ?? 0) + 1 }, select: { id: true } });
  revalidate();
  return { ok: true, id: c.id, message: "Categoría creada" };
}

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2, "Nombre muy corto").max(80),
  parentId: z.string().nullable(),
  sortOrder: z.number().int().min(-1000).max(1000),
  featured: z.boolean(),
});

export async function updateCategory(input: z.infer<typeof updateSchema>): Promise<ActionResult> {
  await requireAdmin();
  const p = updateSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Datos inválidos" };
  const { id, name, sortOrder, featured } = p.data;
  const parentId = p.data.parentId || null;
  if (parentId === id) return { ok: false, error: "Una categoría no puede ser su propio padre" };
  const current = await db.category.findUnique({ where: { id }, select: { name: true, slug: true, children: { select: { id: true } } } });
  if (!current) return { ok: false, error: "Categoría no encontrada" };
  if (parentId) {
    const parent = await db.category.findUnique({ where: { id: parentId }, select: { parentId: true } });
    if (!parent) return { ok: false, error: "La categoría padre no existe" };
    if (parent.parentId) return { ok: false, error: "Solo se permiten dos niveles: elige una categoría principal como padre" };
    if (current.children.length > 0) return { ok: false, error: "Esta categoría tiene subcategorías: muévelas primero" };
  }
  const slug = current.name !== name ? await uniqueSlug(slugify(name), id) : current.slug;
  await db.category.update({ where: { id }, data: { name, slug, parentId, sortOrder, featured } });
  revalidate();
  return { ok: true, message: "Categoría actualizada" };
}

export async function moveCategory(input: { id: string; direction: "up" | "down" }): Promise<ActionResult> {
  await requireAdmin();
  const c = await db.category.findUnique({ where: { id: input.id }, select: { id: true, parentId: true } });
  if (!c) return { ok: false, error: "Categoría no encontrada" };
  const siblings = await db.category.findMany({ where: { parentId: c.parentId }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true } });
  const idx = siblings.findIndex((s) => s.id === c.id);
  const target = input.direction === "up" ? idx - 1 : idx + 1;
  if (target < 0 || target >= siblings.length) return { ok: true };
  const ids = siblings.map((s) => s.id);
  [ids[idx], ids[target]] = [ids[target], ids[idx]];
  await db.$transaction(ids.map((id, i) => db.category.update({ where: { id }, data: { sortOrder: i + 1 } })));
  revalidate();
  return { ok: true };
}

export async function deleteCategory(input: { id: string }): Promise<ActionResult> {
  await requireAdmin();
  const c = await db.category.findUnique({ where: { id: input.id }, select: { id: true, _count: { select: { products: true, children: true } } } });
  if (!c) return { ok: false, error: "Categoría no encontrada" };
  if (c._count.products > 0) return { ok: false, error: `Tiene ${c._count.products} productos asociados. Reasígnalos antes de eliminarla.` };
  if (c._count.children > 0) return { ok: false, error: "Tiene subcategorías. Elimínalas o muévelas primero." };
  await db.category.delete({ where: { id: c.id } });
  revalidate();
  return { ok: true, message: "Categoría eliminada" };
}
