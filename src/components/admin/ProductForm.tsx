"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TagInput } from "./TagInput";
import Link from "next/link";
import { Save, Loader2, Trash2, ArrowUp, ArrowDown, Camera, ImagePlus, X, Copy, ExternalLink, Star, Search } from "lucide-react";
import { cn, slugify, normalizeText } from "@/lib/format";
import { mediaUrl } from "@/lib/media-url";
import { saveProduct, deleteProductImage, moveProductImage, duplicateProduct, deleteProduct } from "@/app/admin/(panel)/productos/actions";

export type ProductFormData = {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  status: "ACTIVE" | "DRAFT" | "ARCHIVED";
  featured: boolean;
  brand: string | null;
  description: string | null;
  categoryIds: string[];
  tagNames: string[];
  images: { id: string; path: string; position: number }[];
  orderCount: number;
};

export type CategoryNode = { id: string; name: string; children: { id: string; name: string }[] };
export type TagOption = { name: string; count: number };

export function ProductForm({ product, categories, tags = [], duplicated }: { product: ProductFormData | null; categories: CategoryNode[]; tags?: TagOption[]; duplicated?: boolean }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [imgPending, startImg] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(duplicated ? "Producto duplicado como borrador. Ajusta nombre, precio, stock e imágenes y guarda." : null);
  const [name, setName] = useState(product?.name ?? "");
  const [slugState, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(product));
  const slug = slugTouched ? slugState : slugify(name);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set(product?.categoryIds ?? []));
  const [catQuery, setCatQuery] = useState("");
  const [zoom, setZoom] = useState<string | null>(null);

  // Las elegidas se muestran arriba como chips, para no perderlas de vista al buscar
  const catsElegidas = useMemo(() => {
    const planas = categories.flatMap((r) => [r, ...r.children]);
    return planas.filter((c) => selectedCats.has(c.id));
  }, [categories, selectedCats]);

  const catsVisibles = useMemo(() => {
    const q = normalizeText(catQuery);
    if (!q) return categories;
    return categories
      .map((r) => {
        const hijas = r.children.filter((c) => normalizeText(c.name).includes(q));
        return normalizeText(r.name).includes(q) ? r : hijas.length ? { ...r, children: hijas } : null;
      })
      .filter((r): r is (typeof categories)[number] => r !== null);
  }, [categories, catQuery]);

  const previews = useMemo(() => pendingFiles.map((f) => ({ file: f, url: URL.createObjectURL(f) })), [pendingFiles]);
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews]);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const files = Array.from(list).filter((f) => f.type.startsWith("image/"));
    setPendingFiles((prev) => [...prev, ...files]);
    if (fileRef.current) fileRef.current.value = "";
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(formRef.current!);
    fd.delete("images");
    for (const f of pendingFiles) fd.append("images", f);
    start(async () => {
      const r = await saveProduct(fd);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setPendingFiles([]);
      if (!product) router.replace(`/admin/productos/${r.id}?creado=1`);
      else {
        setNotice("Cambios guardados");
        router.refresh();
      }
    });
  }

  function imgAction(fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) {
    startImg(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error ?? "Error");
      router.refresh();
    });
  }

  const toggleCat = (id: string) =>
    setSelectedCats((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-4 lg:grid-cols-3">
      {zoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4" onClick={() => setZoom(null)} role="dialog" aria-label="Foto ampliada">
          <img src={zoom} alt="" className="max-h-full max-w-full rounded-card object-contain" />
          <button type="button" aria-label="Cerrar" onClick={() => setZoom(null)} className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-full bg-white text-ink shadow-pop">
            <X className="size-5" />
          </button>
        </div>
      )}
      {product && <input type="hidden" name="id" value={product.id} />}
      {[...selectedCats].map((id) => (
        <input key={id} type="hidden" name="categoryIds" value={id} />
      ))}

      <div className="space-y-4 lg:col-span-2">
        {/* Fotos: verlas primero ayuda a confirmar que se está describiendo el auto correcto */}
        <section className="card p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base">Imágenes</h2>
            {imgPending && <Loader2 className="size-4 animate-spin text-ink-400" />}
          </div>
          {product && product.images.length > 0 && (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {product.images.map((img, i) => (
                <li key={img.id} className="group relative overflow-hidden rounded-xl border border-ink-100 bg-ink-50">
                  <button type="button" onClick={() => setZoom(mediaUrl(img.path, "large"))} aria-label="Ver la foto en grande" className="block w-full">
                    <img src={mediaUrl(img.path, "thumb")} alt="" className="aspect-[3/4] w-full object-cover" />
                  </button>
                  {i === 0 && <span className="pointer-events-none absolute left-1.5 top-1.5 rounded bg-ink px-1.5 py-0.5 text-[10px] font-bold text-lime">Principal</span>}
                  <div className="flex items-center justify-between gap-1 bg-white p-1">
                    <button type="button" aria-label="Subir" disabled={i === 0 || imgPending} onClick={() => imgAction(() => moveProductImage({ id: img.id, direction: "up" }))} className="flex size-9 items-center justify-center rounded-lg hover:bg-ink-50 disabled:opacity-30">
                      <ArrowUp className="size-4" />
                    </button>
                    <button type="button" aria-label="Bajar" disabled={i === product.images.length - 1 || imgPending} onClick={() => imgAction(() => moveProductImage({ id: img.id, direction: "down" }))} className="flex size-9 items-center justify-center rounded-lg hover:bg-ink-50 disabled:opacity-30">
                      <ArrowDown className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Eliminar"
                      disabled={imgPending}
                      onClick={() => {
                        if (confirm("¿Eliminar esta imagen?")) imgAction(() => deleteProductImage({ id: img.id }));
                      }}
                      className="flex size-9 items-center justify-center rounded-lg text-danger hover:bg-danger/10"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {previews.length > 0 && (
            <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {previews.map((p, i) => (
                <li key={p.url} className="relative overflow-hidden rounded-xl border-2 border-dashed border-lime bg-lime-50">
                  <button type="button" onClick={() => setZoom(p.url)} aria-label="Ver la foto en grande" className="block w-full">
                    <img src={p.url} alt="" className="aspect-[3/4] w-full object-cover" />
                  </button>
                  <span className="pointer-events-none absolute left-1.5 top-1.5 rounded bg-lime px-1.5 py-0.5 text-[10px] font-bold text-ink">Nueva</span>
                  <button type="button" aria-label="Quitar" onClick={() => setPendingFiles((f) => f.filter((_, j) => j !== i))} className="absolute right-1.5 top-1.5 flex size-8 items-center justify-center rounded-full bg-white/90 text-ink shadow">
                    <X className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="btn-outline btn-md cursor-pointer">
              <ImagePlus className="size-4" /> Elegir fotos
              <input ref={fileRef} type="file" name="images" accept="image/*" multiple onChange={(e) => addFiles(e.target.files)} className="sr-only" />
            </label>
            <label className="btn-outline btn-md cursor-pointer md:hidden">
              <Camera className="size-4" /> Tomar foto
              <input type="file" accept="image/*" capture="environment" onChange={(e) => addFiles(e.target.files)} className="sr-only" />
            </label>
          </div>
          <p className="mt-2 text-xs text-ink-400">Toca una foto para verla en grande y confirmar que es el auto correcto. Se guardan en webp en tres tamaños. Las nuevas se agregan al final; usa las flechas para ordenar. La primera es la principal.</p>
        </section>

        {/* Datos básicos */}
        <section className="card space-y-4 p-4 md:p-5">
          <div>
            <label htmlFor="name" className="label">
              Nombre
            </label>
            <input id="name" name="name" required value={name} onChange={(e) => setName(e.target.value)} enterKeyHint="next" className="input text-base font-semibold" placeholder="Ej: Nissan Skyline GT-R (R34) · Fast & Furious" />
          </div>
          <div>
            <label htmlFor="description" className="label">
              Descripción
            </label>
            <textarea id="description" name="description" rows={5} defaultValue={product?.description ?? ""} className="input h-auto min-h-28 resize-y py-2.5" placeholder="Serie, año, color, detalles de la tarjeta, estado del blister…" />
          </div>
          <details className="rounded-xl bg-ink-50 px-3 py-2">
            <summary className="cursor-pointer text-[13px] font-semibold text-ink-600">Enlace del producto en la tienda (se genera solo)</summary>
            <div className="mt-2 flex items-center gap-2">
              <span className="hidden text-xs text-ink-400 sm:inline">/producto/</span>
              <input
                id="slug"
                name="slug"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
                onBlur={() => setSlug(slugify(slug))}
                className="input font-mono text-sm"
              />
            </div>
            <p className="mt-1 text-xs text-ink-400">Es la dirección con la que se comparte el auto. Se arma sola con el nombre; solo cámbiala si sabes lo que haces.</p>
          </details>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="price" className="label">
                Precio
              </label>
              <input id="price" name="price" type="number" inputMode="numeric" min={0} step={1} required defaultValue={product?.price ?? ""} className="input font-bold tabular-nums" placeholder="5000" />
            </div>
            <div>
              <label htmlFor="compareAtPrice" className="label">
                Precio anterior
              </label>
              <input id="compareAtPrice" name="compareAtPrice" type="number" inputMode="numeric" min={0} step={1} defaultValue={product?.compareAtPrice ?? ""} className="input tabular-nums" placeholder="Opcional" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label htmlFor="stock" className="label">
                Stock
              </label>
              <input id="stock" name="stock" type="number" inputMode="numeric" min={0} step={1} required defaultValue={product?.stock ?? 1} className="input font-bold tabular-nums" />
            </div>
          </div>
          <div>
            <label htmlFor="status" className="label">
              Estado
            </label>
            <select id="status" name="status" defaultValue={product?.status ?? "ACTIVE"} className="input">
              <option value="ACTIVE">Activo (visible en la tienda)</option>
              <option value="DRAFT">Borrador (oculto)</option>
              <option value="ARCHIVED">Archivado</option>
            </select>
          </div>
          <label className="flex h-11 cursor-pointer items-center gap-3 rounded-xl border border-ink-200 px-4 text-sm font-semibold">
            <input type="checkbox" name="featured" defaultChecked={product?.featured ?? false} className="size-5 accent-lime-600" />
            <Star className="size-4 text-lime-700" /> Destacado en la portada
          </label>
        </section>

      </div>

      <div className="space-y-4">
        {/* Categorías */}
        <section className="card p-4 md:p-5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-base">Categorías</h2>
            {selectedCats.size > 0 && <span className="text-xs font-semibold text-lime-700">{selectedCats.size === 1 ? "1 elegida" : `${selectedCats.size} elegidas`}</span>}
          </div>

          {catsElegidas.length > 0 && (
            <ul className="mb-2 flex flex-wrap gap-1.5">
              {catsElegidas.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => toggleCat(c.id)} className="inline-flex h-7 items-center gap-1 rounded-lg bg-ink px-2 text-[12px] font-bold text-white">
                    {c.name}
                    <X className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
            <input
              type="search"
              value={catQuery}
              onChange={(e) => setCatQuery(e.target.value)}
              placeholder="Buscar categoría…"
              aria-label="Buscar categoría"
              className="input h-10 pl-9 text-sm"
            />
          </div>

          <div className="max-h-96 space-y-1 overflow-y-auto pr-1">
            {catsVisibles.length === 0 && <p className="px-2 py-6 text-center text-sm text-ink-500">Ninguna categoría coincide con «{catQuery}».</p>}
            {catsVisibles.map((root) => (
              <div key={root.id}>
                <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm font-semibold hover:bg-ink-50">
                  <input type="checkbox" checked={selectedCats.has(root.id)} onChange={() => toggleCat(root.id)} className="size-4 accent-ink" />
                  {root.name}
                </label>
                {root.children.length > 0 && (
                  <div className="ml-5 border-l border-ink-100 pl-2">
                    {root.children.map((c) => (
                      <label key={c.id} className="flex min-h-9 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm hover:bg-ink-50">
                        <input type="checkbox" checked={selectedCats.has(c.id)} onChange={() => toggleCat(c.id)} className="size-4 accent-ink" />
                        {c.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Etiquetas */}
        <section className="card p-4 md:p-5">
          <h2 className="mb-2 text-base">Etiquetas</h2>
          <TagInput initial={product?.tagNames ?? []} suggestions={tags} />
        </section>

        {/* Guardar */}
        <div className="sticky bottom-20 space-y-2 md:bottom-4">
          {error && (
            <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
              {error}
            </p>
          )}
          {notice && !error && <p className="rounded-xl bg-success/10 px-4 py-3 text-sm font-medium text-success">{notice}</p>}
          <button type="submit" disabled={pending} className="btn-lime btn-lg w-full shadow-pop">
            {pending ? <Loader2 className="size-5 animate-spin" /> : <Save className="size-5" />}
            {pending ? "Guardando…" : product ? "Guardar cambios" : "Crear producto"}
          </button>
        </div>

        {product && (
          <section className="card space-y-2 p-4">
            <Link href={`/producto/${product.slug}`} target="_blank" className="btn-outline btn-md w-full justify-start">
              <ExternalLink className="size-4" /> Ver en la tienda
            </Link>
            <button type="button" disabled={pending} onClick={() => start(async () => void (await duplicateProduct({ id: product.id })))} className="btn-outline btn-md w-full justify-start">
              <Copy className="size-4" /> Duplicar producto
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                const msg = product.orderCount > 0 ? `Este producto tiene ${product.orderCount} pedidos: se archivará en vez de eliminarse. ¿Continuar?` : "¿Eliminar este producto y sus imágenes? Esta acción no se puede deshacer.";
                if (!confirm(msg)) return;
                start(async () => {
                  const r = await deleteProduct({ id: product.id });
                  if (!r.ok) setError(r.error);
                  else router.replace("/admin/productos");
                });
              }}
              className={cn("btn-outline btn-md w-full justify-start text-danger hover:border-danger")}
            >
              <Trash2 className="size-4" /> {product.orderCount > 0 ? "Archivar producto" : "Eliminar producto"}
            </button>
          </section>
        )}
      </div>
    </form>
  );
}
