"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Star, Loader2, Check, X, ChevronRight, Search, ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { cn, normalizeText } from "@/lib/format";
import { createCategory, updateCategory, moveCategory, deleteCategory, type ActionResult } from "@/app/admin/(panel)/categorias/actions";

export type CategoryItem = { id: string; name: string; slug: string; parentId: string | null; sortOrder: number; featured: boolean; total: number; inStock: number; children: CategoryItem[] };

type FilterKey = "todas" | "principales" | "sub" | "con-stock" | "sin-stock" | "vacias" | "destacadas";
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "principales", label: "Principales" },
  { key: "sub", label: "Subcategorías" },
  { key: "con-stock", label: "Con stock" },
  { key: "sin-stock", label: "Sin stock" },
  { key: "vacias", label: "Sin productos" },
  { key: "destacadas", label: "Destacadas" },
];
type SortKey = "manual" | "nombre" | "productos" | "stock";

function matchesFilter(c: CategoryItem, f: FilterKey) {
  switch (f) {
    case "principales":
      return c.parentId === null;
    case "sub":
      return c.parentId !== null;
    case "con-stock":
      return c.inStock > 0;
    case "sin-stock":
      return c.inStock === 0 && c.total > 0;
    case "vacias":
      return c.total === 0;
    case "destacadas":
      return c.featured;
    default:
      return true;
  }
}

export function CategoryManager({ roots }: { roots: CategoryItem[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("todas");
  const [sort, setSort] = useState<SortKey>("manual");

  const totalCount = useMemo(() => roots.reduce((n, r) => n + 1 + r.children.length, 0), [roots]);
  const q = normalizeText(query);
  const filtering = q.length > 0 || filter !== "todas";

  const { visible, shown, forceExpanded } = useMemo(() => {
    const matches = (c: CategoryItem) => (!q || normalizeText(`${c.name} ${c.slug}`).includes(q)) && matchesFilter(c, filter);
    const sorter = (a: CategoryItem, b: CategoryItem) => {
      if (sort === "nombre") return a.name.localeCompare(b.name, "es");
      if (sort === "productos") return b.total - a.total;
      if (sort === "stock") return b.inStock - a.inStock;
      return 0; // manual: orden original (sortOrder)
    };
    const force = new Set<string>();
    let shownCount = 0;
    const out: CategoryItem[] = [];
    for (const root of roots) {
      const kids = root.children.filter(matches).sort(sorter);
      const rootOk = matches(root);
      if (!rootOk && kids.length === 0) continue;
      shownCount += (rootOk ? 1 : 0) + kids.length;
      // con filtro activo se muestran solo las hijas que coinciden; sin filtro, todas
      const children = filtering ? kids : [...root.children].sort(sorter);
      if (filtering && kids.length) force.add(root.id);
      out.push({ ...root, children });
    }
    out.sort(sorter);
    return { visible: out, shown: shownCount, forceExpanded: force };
  }, [roots, q, filter, sort, filtering]);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [creatingUnder, setCreatingUnder] = useState<string | null | "root">(null);
  const [newName, setNewName] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function run(fn: () => Promise<ActionResult>, after?: () => void) {
    setMsg(null);
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? (r.message ? { ok: true, text: r.message } : null) : { ok: false, text: r.error });
      if (r.ok) {
        after?.();
        router.refresh();
      }
    });
  }

  function submitCreate() {
    const parentId = creatingUnder === "root" ? null : creatingUnder;
    run(
      () => createCategory({ name: newName, parentId }),
      () => {
        setNewName("");
        setCreatingUnder(null);
        if (parentId) setExpanded((s) => new Set(s).add(parentId));
      },
    );
  }

  const toggle = (id: string) =>
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const rootOptions = roots.map((r) => ({ id: r.id, name: r.name }));
  const allExpanded = roots.every((r) => r.children.length === 0 || expanded.has(r.id));

  return (
    <div className="space-y-3">
      {/* Búsqueda y filtros */}
      <div className="card space-y-3 p-3 sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar categoría por nombre o slug…"
              aria-label="Buscar categoría"
              enterKeyHint="search"
              className="input pl-10"
            />
            {query ? (
              <button type="button" onClick={() => setQuery("")} aria-label="Limpiar búsqueda" className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-ink-400 hover:bg-ink-50 hover:text-ink">
                <X className="size-4" />
              </button>
            ) : null}
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Ordenar" className="input sm:w-52">
            <option value="manual">Orden de la tienda</option>
            <option value="nombre">Nombre A–Z</option>
            <option value="productos">Más productos</option>
            <option value="stock">Más con stock</option>
          </select>
          <button type="button" onClick={() => setExpanded(allExpanded ? new Set() : new Set(roots.filter((r) => r.children.length).map((r) => r.id)))} className="btn-outline btn-md shrink-0">
            {allExpanded ? <ChevronsDownUp className="size-4" /> : <ChevronsUpDown className="size-4" />}
            <span className="sm:hidden lg:inline">{allExpanded ? "Contraer todo" : "Expandir todo"}</span>
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((f) => (
            <button key={f.key} type="button" onClick={() => setFilter(f.key)} aria-pressed={filter === f.key} className={cn("chip", filter === f.key && "chip-active")}>
              {f.label}
            </button>
          ))}
          <span className="ml-auto text-xs text-ink-500">
            {filtering ? `${shown} de ${totalCount}` : `${totalCount} categorías`}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {creatingUnder === "root" ? (
          <CreateRow value={newName} onChange={setNewName} onSubmit={submitCreate} onCancel={() => setCreatingUnder(null)} pending={pending} placeholder="Nombre de la categoría principal" />
        ) : (
          <button type="button" onClick={() => setCreatingUnder("root")} className="btn-lime btn-md">
            <Plus className="size-4" /> Nueva categoría principal
          </button>
        )}
        {pending && <Loader2 className="size-4 animate-spin text-ink-400" />}
      </div>
      {msg && <p className={cn("rounded-xl px-4 py-2.5 text-sm font-medium", msg.ok ? "bg-success/10 text-success" : "bg-danger/10 text-danger")}>{msg.text}</p>}

      <ul className="card divide-y divide-ink-100 overflow-hidden">
        {roots.length === 0 && <li className="p-8 text-center text-sm text-ink-500">Aún no hay categorías.</li>}
        {roots.length > 0 && visible.length === 0 && (
          <li className="p-8 text-center text-sm text-ink-500">
            Ninguna categoría coincide con la búsqueda o el filtro.{" "}
            <button type="button" onClick={() => { setQuery(""); setFilter("todas"); }} className="font-semibold text-lime-700 hover:underline">
              Limpiar
            </button>
          </li>
        )}
        {visible.map((root, i) => (
          <li key={root.id}>
            <Row
              item={root}
              index={i}
              count={visible.length}
              editing={editing === root.id}
              onEdit={() => setEditing(editing === root.id ? null : root.id)}
              onDone={() => setEditing(null)}
              run={run}
              pending={pending}
              rootOptions={rootOptions}
              expandable={root.children.length > 0 || creatingUnder === root.id}
              expanded={expanded.has(root.id) || forceExpanded.has(root.id)}
              onToggle={() => toggle(root.id)}
              onAddChild={() => {
                setCreatingUnder(root.id);
                setExpanded((s) => new Set(s).add(root.id));
              }}
            />
            {(expanded.has(root.id) || forceExpanded.has(root.id) || creatingUnder === root.id) && (
              <ul className="divide-y divide-ink-100 border-t border-ink-100 bg-ink-50/60 pl-6 sm:pl-10">
                {root.children.map((c, j) => (
                  <li key={c.id}>
                    <Row item={c} index={j} count={root.children.length} editing={editing === c.id} onEdit={() => setEditing(editing === c.id ? null : c.id)} onDone={() => setEditing(null)} run={run} pending={pending} rootOptions={rootOptions} />
                  </li>
                ))}
                {creatingUnder === root.id && (
                  <li className="p-3">
                    <CreateRow value={newName} onChange={setNewName} onSubmit={submitCreate} onCancel={() => setCreatingUnder(null)} pending={pending} placeholder={`Nueva subcategoría de ${root.name}`} />
                  </li>
                )}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CreateRow({ value, onChange, onSubmit, onCancel, pending, placeholder }: { value: string; onChange: (v: string) => void; onSubmit: () => void; onCancel: () => void; pending: boolean; placeholder: string }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim().length >= 2) onSubmit();
      }}
      className="flex w-full max-w-lg items-center gap-2"
    >
      <input autoFocus value={value} onChange={(e) => onChange(e.target.value)} enterKeyHint="done" placeholder={placeholder} className="input" />
      <button type="submit" disabled={pending || value.trim().length < 2} className="btn-primary size-11 shrink-0 !p-0" aria-label="Crear">
        <Check className="size-5" />
      </button>
      <button type="button" onClick={onCancel} className="btn-ghost size-11 shrink-0 !p-0" aria-label="Cancelar">
        <X className="size-5" />
      </button>
    </form>
  );
}

function Row({
  item,
  index,
  count,
  editing,
  onEdit,
  onDone,
  run,
  pending,
  rootOptions,
  expandable,
  expanded,
  onToggle,
  onAddChild,
}: {
  item: CategoryItem;
  index: number;
  count: number;
  editing: boolean;
  onEdit: () => void;
  onDone: () => void;
  run: (fn: () => Promise<ActionResult>, after?: () => void) => void;
  pending: boolean;
  rootOptions: { id: string; name: string }[];
  expandable?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  onAddChild?: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [parentId, setParentId] = useState(item.parentId ?? "");
  const [sortOrder, setSortOrder] = useState(item.sortOrder);
  const [featured, setFeatured] = useState(item.featured);
  const isRoot = item.parentId === null;

  return (
    <div className="p-3">
      <div className="flex items-center gap-2">
        {isRoot ? (
          <button type="button" onClick={onToggle} disabled={!expandable} aria-label="Expandir" className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-400 hover:bg-ink-50", !expandable && "opacity-20")}>
            <ChevronRight className={cn("size-4 transition", expanded && "rotate-90")} />
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("truncate font-semibold", isRoot ? "text-sm" : "text-sm text-ink-700")}>{item.name}</span>
            {item.featured && <Star className="size-3.5 fill-lime text-lime-700" />}
            {isRoot && item.children.length > 0 && <span className="text-[11px] text-ink-400">{item.children.length} sub.</span>}
          </div>
          <div className="text-xs text-ink-500">
            <Link href={`/admin/productos?cat=${item.id}&disp=todos`} className="hover:underline">
              {item.total} {item.total === 1 ? "producto" : "productos"}
            </Link>
            {" · "}
            {item.inStock} con stock · /{item.slug}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button type="button" aria-label="Subir" disabled={pending || index === 0} onClick={() => run(() => moveCategory({ id: item.id, direction: "up" }))} className="flex size-9 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-50 disabled:opacity-30">
            <ArrowUp className="size-4" />
          </button>
          <button type="button" aria-label="Bajar" disabled={pending || index === count - 1} onClick={() => run(() => moveCategory({ id: item.id, direction: "down" }))} className="flex size-9 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-50 disabled:opacity-30">
            <ArrowDown className="size-4" />
          </button>
          {isRoot && onAddChild && (
            <button type="button" aria-label="Agregar subcategoría" onClick={onAddChild} className="flex size-9 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-50">
              <Plus className="size-4" />
            </button>
          )}
          <button type="button" aria-label="Editar" onClick={onEdit} className={cn("flex size-9 items-center justify-center rounded-lg hover:bg-ink-50", editing ? "bg-ink text-white hover:bg-ink" : "text-ink-500")}>
            <Pencil className="size-4" />
          </button>
        </div>
      </div>

      {editing && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(() => updateCategory({ id: item.id, name, parentId: parentId || null, sortOrder, featured }), onDone);
          }}
          className="mt-3 grid gap-2 rounded-xl border border-ink-200 bg-white p-3 sm:grid-cols-2"
        >
          <div className="sm:col-span-2">
            <label className="label">Nombre</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="input" required />
          </div>
          <div>
            <label className="label">Categoría padre</label>
            <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="input" disabled={item.children.length > 0}>
              <option value="">— Ninguna (principal) —</option>
              {rootOptions
                .filter((r) => r.id !== item.id)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
            </select>
            {item.children.length > 0 && <p className="mt-1 text-xs text-ink-400">Tiene subcategorías: no se puede mover bajo otra.</p>}
          </div>
          <div>
            <label className="label">Orden</label>
            <input type="number" inputMode="numeric" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value || "0", 10))} className="input" />
          </div>
          <label className="flex h-11 cursor-pointer items-center gap-3 rounded-xl border border-ink-200 px-4 text-sm font-semibold sm:col-span-2">
            <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="size-5 accent-lime-600" />
            <Star className="size-4 text-lime-700" /> Destacada en la portada
          </label>
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            <button type="submit" disabled={pending} className="btn-primary btn-md">
              <Check className="size-4" /> Guardar
            </button>
            <button type="button" onClick={onDone} className="btn-ghost btn-md">
              Cancelar
            </button>
            <button
              type="button"
              disabled={pending || item.total > 0 || item.children.length > 0}
              onClick={() => {
                if (confirm(`¿Eliminar la categoría “${item.name}”?`)) run(() => deleteCategory({ id: item.id }), onDone);
              }}
              className="btn-ghost btn-md ml-auto text-danger disabled:opacity-40"
              title={item.total > 0 ? "Tiene productos asociados" : item.children.length > 0 ? "Tiene subcategorías" : "Eliminar"}
            >
              <Trash2 className="size-4" /> Eliminar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
