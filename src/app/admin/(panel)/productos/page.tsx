import type { Metadata } from "next";
import Link from "next/link";
import { Search, Plus, Star, Download, Upload, FileSpreadsheet } from "lucide-react";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { formatCLP, normalizeText, cn } from "@/lib/format";
import { mediaUrl } from "@/lib/media-url";
import { getCategoryTree } from "@/lib/catalog";
import { getTags } from "@/app/admin/_lib/products";
import { ProductStatusBadge } from "@/components/admin/StatusBadge";
import { PageHeader, EmptyState } from "@/components/admin/PageHeader";
import { Pagination } from "@/components/admin/Pagination";
import { FilterForm, CollapsibleFilters } from "@/components/admin/FilterForm";
import { ProductQuickEdit } from "@/components/admin/ProductQuickEdit";

export const metadata: Metadata = { title: "Productos" };
export const dynamic = "force-dynamic";

const PER_PAGE = 40;
type SP = Record<string, string | string[] | undefined>;
const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

const ORDER_OPTIONS = [
  { value: "reciente", label: "Más recientes" },
  { value: "nombre", label: "Nombre A–Z" },
  { value: "precio-asc", label: "Precio ↑" },
  { value: "precio-desc", label: "Precio ↓" },
  { value: "stock-asc", label: "Menos stock" },
  { value: "stock-desc", label: "Más stock" },
  { value: "vendidos", label: "Más vendidos" },
];

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = str(sp.q).trim();
  const dispParam = str(sp.disp); // stock | agotados | ultimo | todos
  // Al buscar se muestran los autos con y sin stock; sin búsqueda, la lista parte por los que hay
  const disp = dispParam || (q ? "todos" : "stock");
  const cat = str(sp.cat);
  const etiqueta = str(sp.etiqueta);
  const estado = str(sp.estado);
  const orden = str(sp.orden) || "reciente";
  const page = Math.max(1, parseInt(str(sp.page) || "1", 10) || 1);

  const [tree, allTags] = await Promise.all([getCategoryTree(), getTags()]);
  const flatCats: { id: string; name: string; depth: number }[] = [];
  for (const r of tree) {
    flatCats.push({ id: r.id, name: r.name, depth: 0 });
    for (const c of r.children) flatCats.push({ id: c.id, name: c.name, depth: 1 });
  }

  const conds: Prisma.Sql[] = [];
  if (disp === "stock") conds.push(Prisma.sql`p."stock" > 0`);
  else if (disp === "agotados") conds.push(Prisma.sql`p."stock" <= 0`);
  else if (disp === "ultimo") conds.push(Prisma.sql`p."stock" = 1`);
  if (estado === "ACTIVE" || estado === "DRAFT" || estado === "ARCHIVED") conds.push(Prisma.sql`p."status" = ${estado}::"ProductStatus"`);
  else if (!estado) conds.push(Prisma.sql`p."status" <> 'ARCHIVED'`);
  if (etiqueta) conds.push(Prisma.sql`EXISTS (SELECT 1 FROM "_ProductToTag" pt WHERE pt."A" = p."id" AND pt."B" = ${etiqueta})`);
  if (cat) {
    const node = flatCats.find((c) => c.id === cat);
    const ids = node ? [cat, ...(tree.find((r) => r.id === cat)?.children.map((c) => c.id) ?? [])] : [cat];
    conds.push(Prisma.sql`EXISTS (SELECT 1 FROM "_CategoryToProduct" cp WHERE cp."B" = p."id" AND cp."A" IN (${Prisma.join(ids)}))`);
  }
  const terms = q ? normalizeText(q).split(" ").filter(Boolean) : [];
  for (const t of terms) conds.push(Prisma.sql`(p."searchText" ILIKE ${"%" + t + "%"} OR p."name" ILIKE ${"%" + t + "%"})`);
  const where = conds.length ? Prisma.join(conds, " AND ") : Prisma.sql`TRUE`;

  let order: Prisma.Sql;
  switch (orden) {
    case "nombre":
      order = Prisma.sql`p."name" ASC`;
      break;
    case "precio-asc":
      order = Prisma.sql`p."price" ASC, p."name" ASC`;
      break;
    case "precio-desc":
      order = Prisma.sql`p."price" DESC, p."name" ASC`;
      break;
    case "stock-asc":
      order = Prisma.sql`p."stock" ASC, p."name" ASC`;
      break;
    case "stock-desc":
      order = Prisma.sql`p."stock" DESC, p."name" ASC`;
      break;
    case "vendidos":
      order = Prisma.sql`p."totalSales" DESC, p."name" ASC`;
      break;
    default:
      order = q ? Prisma.sql`similarity(p."name", ${normalizeText(q)}) DESC, p."updatedAt" DESC` : Prisma.sql`p."updatedAt" DESC`;
  }

  const [rows, countRow] = await Promise.all([
    db.$queryRaw<{ id: string }[]>`SELECT p."id" FROM "Product" p WHERE ${where} ORDER BY ${order} LIMIT ${PER_PAGE} OFFSET ${(page - 1) * PER_PAGE}`,
    db.$queryRaw<{ n: bigint }[]>`SELECT count(*)::bigint AS n FROM "Product" p WHERE ${where}`,
  ]);
  const ids = rows.map((r) => r.id);
  const found = ids.length
    ? await db.product.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, slug: true, brand: true, price: true, compareAtPrice: true, stock: true, status: true, featured: true, totalSales: true, images: { orderBy: { position: "asc" }, take: 1, select: { path: true } }, tags: { select: { id: true, name: true } } } })
    : [];
  const byId = new Map(found.map((p) => [p.id, p]));
  const products = ids.map((id) => byId.get(id)!).filter(Boolean);
  const total = Number(countRow[0]?.n ?? 0);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const params = { q, disp, cat, estado, orden };

  const dispChips = [
    { value: "stock", label: "Con stock" },
    { value: "ultimo", label: "Última unidad" },
    { value: "agotados", label: "Agotados" },
    { value: "todos", label: "Todos" },
  ];
  const chipHref = (v: string) => {
    const s = new URLSearchParams();
    for (const [k, val] of Object.entries({ ...params, disp: v })) if (val) s.set(k, val);
    return `/admin/productos?${s.toString()}`;
  };

  return (
    <>
      <PageHeader title="Productos" description={`${total.toLocaleString("es-CL")} ${total === 1 ? "producto" : "productos"}`}>
        <a href={`/admin/api/productos/export?${new URLSearchParams({ q, disp, cat, etiqueta, estado, formato: "excel" }).toString()}`} className="btn-outline btn-md" title="Descarga la planilla de Excel con los filtros aplicados">
          <FileSpreadsheet className="size-4" /> <span className="hidden sm:inline">Excel</span>
        </a>
        <a href={`/admin/api/productos/export?${new URLSearchParams({ q, disp, cat, etiqueta, estado }).toString()}`} className="btn-outline btn-md" title="Descarga el CSV con los filtros aplicados">
          <Download className="size-4" /> <span className="hidden sm:inline">CSV</span>
        </a>
        <Link href="/admin/productos/importar" className="btn-outline btn-md">
          <Upload className="size-4" /> <span className="hidden sm:inline">Importar</span>
        </Link>
        <Link href="/admin/productos/nuevo" className="btn-lime btn-md">
          <Plus className="size-4" /> Nuevo producto
        </Link>
      </PageHeader>

      <FilterForm action="/admin/productos" className="card mb-4 space-y-2 p-3">
        <input type="hidden" name="disp" value={dispParam} />
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
          <input type="search" name="q" defaultValue={q} enterKeyHint="search" placeholder="Buscar por nombre, marca, categoría…" className="input pl-10" />
        </label>
        <CollapsibleFilters active={[cat, etiqueta, estado].filter(Boolean).length + (orden !== "reciente" ? 1 : 0)} className="sm:grid-cols-[1fr_1fr_auto_auto]">
          <select name="cat" defaultValue={cat} className="input" aria-label="Categoría">
            <option value="">Todas las categorías</option>
            {flatCats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.depth ? "— " : ""}
                {c.name}
              </option>
            ))}
          </select>
          <select name="etiqueta" defaultValue={etiqueta} className="input" aria-label="Etiqueta">
            <option value="">Todas las etiquetas</option>
            {allTags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · {t.count} con stock
              </option>
            ))}
          </select>
          <select name="estado" defaultValue={estado} className="input sm:w-40" aria-label="Estado">
            <option value="">Activos y borradores</option>
            <option value="ACTIVE">Activos</option>
            <option value="DRAFT">Borradores</option>
            <option value="ARCHIVED">Archivados</option>
          </select>
          <select name="orden" defaultValue={orden} className="input sm:w-40" aria-label="Orden">
            {ORDER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </CollapsibleFilters>
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          {dispChips.map((c) => (
            <Link key={c.value} href={chipHref(c.value)} className={cn("chip shrink-0", disp === c.value && "chip-active")}>
              {c.label}
            </Link>
          ))}
        </div>
      </FilterForm>

      {products.length === 0 ? (
        <EmptyState title="Sin productos" text="No hay productos con esos filtros. Prueba con otra búsqueda o crea uno nuevo.">
          <Link href="/admin/productos/nuevo" className="btn-primary btn-md">
            <Plus className="size-4" /> Nuevo producto
          </Link>
        </EmptyState>
      ) : (
        <>
          {/* Móvil */}
          <ul className="space-y-2 md:hidden">
            {products.map((p) => (
              <li key={p.id} className="card p-3">
                <div className="flex gap-3">
                  <Link href={`/admin/productos/${p.id}`} className="shrink-0">
                    <img src={mediaUrl(p.images[0]?.path, "thumb")} alt="" className="size-24 rounded-xl bg-ink-50 object-contain" loading="lazy" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/productos/${p.id}`} className="line-clamp-2 text-sm font-semibold leading-tight">
                      {p.name}
                    </Link>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-500">
                      {p.brand && <span>{p.brand}</span>}
                      <ProductStatusBadge status={p.status} />
                      {p.featured && <Star className="size-3.5 fill-lime text-lime-700" />}
                    </div>
                    {p.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {p.tags.map((t) => (
                          <span key={t.id} className="rounded-md bg-ink-100 px-1.5 py-0.5 text-[10px] font-semibold text-ink-700">
                            {t.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-xs font-semibold text-ink-500">
                    Stock <ProductQuickEdit id={p.id} field="stock" value={p.stock} />
                  </label>
                  <label className="mr-5 flex items-center gap-2 text-xs font-semibold text-ink-500">
                    Precio <ProductQuickEdit id={p.id} field="price" value={p.price} />
                  </label>
                </div>
              </li>
            ))}
          </ul>

          {/* Escritorio */}
          <div className="card hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 text-left text-[11px] font-bold uppercase tracking-wider text-ink-500">
                <tr>
                  <th className="px-4 py-3" colSpan={2}>
                    Producto
                  </th>
                  <th className="px-4 py-3">Marca</th>
                  <th className="px-4 py-3">Etiquetas</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Precio</th>
                  <th className="px-4 py-3 text-right">Stock</th>
                  <th className="px-4 py-3 text-right">Vendidos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {products.map((p) => (
                  <tr key={p.id} className="transition hover:bg-lime-50/60">
                    <td className="w-20 py-2 pl-4">
                      <Link href={`/admin/productos/${p.id}`}>
                        <img src={mediaUrl(p.images[0]?.path, "thumb")} alt="" className="size-16 rounded-lg bg-ink-50 object-contain" loading="lazy" />
                      </Link>
                    </td>
                    <td className="px-4 py-2">
                      <Link href={`/admin/productos/${p.id}`} className="line-clamp-2 font-semibold hover:underline">
                        {p.name}
                      </Link>
                      <div className="text-xs text-ink-400">
                        /{p.slug}
                        {p.featured && <Star className="ml-1 inline size-3.5 fill-lime text-lime-700" />}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-ink-600">{p.brand ?? "—"}</td>
                    <td className="px-4 py-2">
                      {p.tags.length ? (
                        <span className="flex flex-wrap gap-1">
                          {p.tags.map((t) => (
                            <Link key={t.id} href={`/admin/productos?etiqueta=${t.id}&disp=todos`} className="rounded-md bg-ink-100 px-1.5 py-0.5 text-[11px] font-semibold text-ink-700 hover:bg-ink hover:text-white">
                              {t.name}
                            </Link>
                          ))}
                        </span>
                      ) : (
                        <span className="text-ink-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <ProductStatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-2 pr-5">
                        {p.compareAtPrice && p.compareAtPrice > p.price && <s className="text-xs text-ink-400">{formatCLP(p.compareAtPrice)}</s>}
                        <ProductQuickEdit id={p.id} field="price" value={p.price} />
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="pr-5">
                        <ProductQuickEdit id={p.id} field="stock" value={p.stock} />
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-ink-600">{p.totalSales}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pages={pages} total={total} perPage={PER_PAGE} basePath="/admin/productos" params={params} />
        </>
      )}
    </>
  );
}
