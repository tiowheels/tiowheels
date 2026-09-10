"use server";

import { revalidatePath } from "next/cache";
import { db, ProductStatus } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { normalizeText, slugify } from "@/lib/format";
import { parseCsvRows, parseNumero, parseBooleano, parseLista } from "@/lib/csv";

export type FilaResultado = {
  linea: number;
  nombre: string;
  accion: "crear" | "actualizar" | "sin cambios" | "error";
  detalle: string;
};

export type ImportResult =
  | { ok: false; error: string }
  | {
      ok: true;
      aplicado: boolean;
      columnas: string[];
      totales: { crear: number; actualizar: number; sinCambios: number; errores: number };
      filas: FilaResultado[];
      nuevasCategorias: string[];
      nuevasEtiquetas: string[];
    };

const COLUMNAS_CONOCIDAS = ["codigo", "nombre", "slug", "marca", "precio", "precio_anterior", "stock", "estado", "destacado", "descripcion", "categorias", "etiquetas"];
const MAX_FILAS = 5000;

function estadoDesde(valor: string): ProductStatus | null {
  const s = normalizeText(valor);
  if (["active", "activo", "publicado", "publicada"].includes(s)) return "ACTIVE";
  if (["draft", "borrador"].includes(s)) return "DRAFT";
  if (["archived", "archivado", "archivada"].includes(s)) return "ARCHIVED";
  return null;
}

/**
 * Lee el CSV y devuelve qué haría con cada fila. Con `modo=aplicar`, además guarda los cambios.
 * Solo se tocan las columnas presentes en el archivo: si exportas solo precio y stock,
 * el resto del producto queda intacto.
 */
export async function importarProductos(formData: FormData): Promise<ImportResult> {
  await requireAdmin();
  const aplicar = formData.get("modo") === "aplicar";
  const archivo = formData.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) return { ok: false, error: "Elige un archivo CSV" };
  if (archivo.size > 10 * 1024 * 1024) return { ok: false, error: "El archivo supera los 10 MB" };

  const texto = await archivo.text();
  const { headers, rows } = parseCsvRows(texto);
  if (!rows.length) return { ok: false, error: "El archivo no tiene filas" };
  if (rows.length > MAX_FILAS) return { ok: false, error: `El archivo tiene ${rows.length} filas; el máximo es ${MAX_FILAS}` };
  if (!headers.includes("codigo") && !headers.includes("slug") && !headers.includes("nombre")) {
    return { ok: false, error: "Falta una columna para identificar el producto: codigo, slug o nombre" };
  }
  const columnas = headers.filter((h) => COLUMNAS_CONOCIDAS.includes(h));
  const tiene = (c: string) => headers.includes(c);

  const [cats, tags] = await Promise.all([db.category.findMany({ select: { id: true, slug: true } }), db.tag.findMany({ select: { id: true, slug: true } })]);
  const catPorSlug = new Map(cats.map((c) => [c.slug, c.id]));
  const tagPorSlug = new Map(tags.map((t) => [t.slug, t.id]));
  const nuevasCategorias = new Set<string>();
  const nuevasEtiquetas = new Set<string>();

  const filas: FilaResultado[] = [];
  const totales = { crear: 0, actualizar: 0, sinCambios: 0, errores: 0 };

  for (const [i, fila] of rows.entries()) {
    const linea = i + 2; // +1 por el encabezado y +1 porque las planillas parten en 1
    const nombre = (fila.nombre ?? "").trim();
    const codigo = (fila.codigo ?? "").trim();
    const slugCsv = (fila.slug ?? "").trim();

    try {
      const legacy = Number(codigo);
      const existente =
        (codigo ? await db.product.findFirst({ where: { OR: [{ id: codigo }, { legacyId: Number.isFinite(legacy) && codigo !== "" ? legacy : -1 }] }, select: { id: true, name: true } }) : null) ??
        (slugCsv ? await db.product.findUnique({ where: { slug: slugCsv }, select: { id: true, name: true } }) : null) ??
        (!codigo && !slugCsv && nombre ? await db.product.findFirst({ where: { name: nombre }, select: { id: true, name: true } }) : null);

      const data: Record<string, unknown> = {};
      const cambios: string[] = [];

      if (tiene("nombre") && nombre) {
        data.name = nombre;
        cambios.push("nombre");
      }
      if (tiene("marca")) {
        data.brand = (fila.marca ?? "").trim() || null;
        cambios.push("marca");
      }
      if (tiene("precio")) {
        const n = parseNumero(fila.precio);
        if (n === null || n < 0) throw new Error("Precio inválido");
        data.price = n;
        cambios.push("precio");
      }
      if (tiene("precio_anterior")) {
        const n = parseNumero(fila.precio_anterior);
        data.compareAtPrice = n && n > 0 ? n : null;
        cambios.push("precio anterior");
      }
      if (tiene("stock")) {
        const n = parseNumero(fila.stock);
        if (n === null || n < 0) throw new Error("Stock inválido");
        data.stock = n;
        cambios.push("stock");
      }
      if (tiene("estado") && (fila.estado ?? "").trim()) {
        const e = estadoDesde(fila.estado);
        if (!e) throw new Error(`Estado desconocido: ${fila.estado}`);
        data.status = e;
        cambios.push("estado");
      }
      if (tiene("destacado")) {
        const b = parseBooleano(fila.destacado);
        if (b !== null) {
          data.featured = b;
          cambios.push("destacado");
        }
      }
      if (tiene("descripcion")) {
        data.description = (fila.descripcion ?? "").trim() || null;
        cambios.push("descripción");
      }

      let categoriaIds: string[] | null = null;
      if (tiene("categorias")) {
        categoriaIds = [];
        for (const nombreCat of parseLista(fila.categorias)) {
          const slug = slugify(nombreCat);
          let id = catPorSlug.get(slug);
          if (!id) {
            nuevasCategorias.add(nombreCat);
            if (aplicar) {
              const creada = await db.category.upsert({ where: { slug }, create: { slug, name: nombreCat }, update: {}, select: { id: true } });
              id = creada.id;
              catPorSlug.set(slug, id);
            }
          }
          if (id) categoriaIds.push(id);
        }
        cambios.push("categorías");
      }
      let etiquetaIds: string[] | null = null;
      if (tiene("etiquetas")) {
        etiquetaIds = [];
        for (const nombreTag of parseLista(fila.etiquetas)) {
          const slug = slugify(nombreTag);
          let id = tagPorSlug.get(slug);
          if (!id) {
            nuevasEtiquetas.add(nombreTag);
            if (aplicar) {
              const creada = await db.tag.upsert({ where: { slug }, create: { slug, name: nombreTag }, update: {}, select: { id: true } });
              id = creada.id;
              tagPorSlug.set(slug, id);
            }
          }
          if (id) etiquetaIds.push(id);
        }
        cambios.push("etiquetas");
      }

      if (!existente && !nombre) throw new Error("Producto nuevo sin nombre");
      if (!existente && data.price === undefined) throw new Error("Producto nuevo sin precio");
      if (!cambios.length) {
        totales.sinCambios++;
        filas.push({ linea, nombre: nombre || existente?.name || codigo, accion: "sin cambios", detalle: "No hay columnas que actualizar" });
        continue;
      }

      if (aplicar) {
        const relaciones = {
          ...(categoriaIds ? { categories: { set: categoriaIds.map((id) => ({ id })) } } : {}),
          ...(etiquetaIds ? { tags: { set: etiquetaIds.map((id) => ({ id })) } } : {}),
        };
        const id = existente
          ? (await db.product.update({ where: { id: existente.id }, data: { ...data, ...relaciones, listedAt: new Date() }, select: { id: true } })).id
          : (
              await db.product.create({
                data: {
                  name: nombre,
                  slug: await slugUnico(slugCsv ? slugify(slugCsv) : slugify(nombre)),
                  price: data.price as number,
                  stock: (data.stock as number | undefined) ?? 0,
                  status: (data.status as ProductStatus | undefined) ?? "ACTIVE",
                  featured: (data.featured as boolean | undefined) ?? false,
                  brand: (data.brand as string | null | undefined) ?? null,
                  description: (data.description as string | null | undefined) ?? null,
                  compareAtPrice: (data.compareAtPrice as number | null | undefined) ?? null,
                  ...(categoriaIds ? { categories: { connect: categoriaIds.map((cid) => ({ id: cid })) } } : {}),
                  ...(etiquetaIds ? { tags: { connect: etiquetaIds.map((tid) => ({ id: tid })) } } : {}),
                },
                select: { id: true },
              })
            ).id;
        await refrescarBusqueda(id);
      }

      if (existente) {
        totales.actualizar++;
        filas.push({ linea, nombre: nombre || existente.name, accion: "actualizar", detalle: cambios.join(", ") });
      } else {
        totales.crear++;
        filas.push({ linea, nombre, accion: "crear", detalle: cambios.join(", ") });
      }
    } catch (e) {
      totales.errores++;
      filas.push({ linea, nombre: nombre || codigo || "(sin nombre)", accion: "error", detalle: e instanceof Error ? e.message : "Error desconocido" });
    }
  }

  if (aplicar) {
    revalidatePath("/admin/productos");
    revalidatePath("/admin");
    revalidatePath("/tienda");
    revalidatePath("/");
  }

  return { ok: true, aplicado: aplicar, columnas, totales, filas, nuevasCategorias: [...nuevasCategorias], nuevasEtiquetas: [...nuevasEtiquetas] };
}

async function slugUnico(base: string) {
  const raiz = base || "producto";
  let slug = raiz;
  let i = 1;
  for (;;) {
    const existe = await db.product.findUnique({ where: { slug }, select: { id: true } });
    if (!existe) return slug;
    i += 1;
    slug = `${raiz}-${i}`;
  }
}

async function refrescarBusqueda(id: string) {
  const p = await db.product.findUnique({ where: { id }, select: { name: true, brand: true, description: true, categories: { select: { name: true } } } });
  if (!p) return;
  const texto = normalizeText([p.name, p.brand ?? "", p.description ?? "", p.categories.map((c) => c.name).join(" ")].join(" "));
  await db.product.update({ where: { id }, data: { searchText: texto } });
}
