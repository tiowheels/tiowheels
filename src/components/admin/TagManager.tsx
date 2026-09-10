"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Pencil, Trash2, Check, X, Loader2, Eraser } from "lucide-react";
import { cn, normalizeText } from "@/lib/format";
import { renameTag, deleteTag, deleteUnusedTags, type ActionResult } from "@/app/admin/(panel)/categorias/actions";

export type TagItem = { id: string; name: string; total: number; inStock: number };

export function TagManager({ tags }: { tags: TagItem[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");

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

  const q = normalizeText(query);
  const visibles = useMemo(() => (q ? tags.filter((t) => normalizeText(t.name).includes(q)) : tags), [tags, q]);
  const sinUso = tags.filter((t) => t.total === 0).length;

  return (
    <section className="card p-4 md:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base">Etiquetas</h2>
          <p className="text-xs text-ink-500">Los lotes de compra (Básicos 53, Premium 2…). No se muestran en la tienda.</p>
        </div>
        {sinUso > 0 && (
          <button type="button" disabled={pending} onClick={() => run(deleteUnusedTags)} className="btn-outline btn-sm">
            <Eraser className="size-4" /> Borrar {sinUso} sin productos
          </button>
        )}
      </div>

      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar etiqueta…" aria-label="Buscar etiqueta" className="input pl-10" />
      </div>

      {msg && <p className={cn("mb-3 rounded-xl px-4 py-2.5 text-sm font-medium", msg.ok ? "bg-success/10 text-success" : "bg-danger/10 text-danger")}>{msg.text}</p>}
      {pending && <Loader2 className="mb-2 size-4 animate-spin text-ink-400" />}

      <ul className="max-h-[28rem] divide-y divide-ink-100 overflow-y-auto">
        {visibles.length === 0 && <li className="py-6 text-center text-sm text-ink-500">Ninguna etiqueta coincide.</li>}
        {visibles.map((t) => (
          <li key={t.id} className="py-2">
            {editing === t.id ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  run(() => renameTag({ id: t.id, name: draft }), () => setEditing(null));
                }}
                className="flex items-center gap-2"
              >
                <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} className="input h-10" />
                <button type="submit" disabled={pending} className="btn-primary size-10 shrink-0 !p-0" aria-label="Guardar">
                  <Check className="size-4" />
                </button>
                <button type="button" onClick={() => setEditing(null)} className="btn-ghost size-10 shrink-0 !p-0" aria-label="Cancelar">
                  <X className="size-4" />
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{t.name}</div>
                  <div className="text-xs text-ink-500">
                    <Link href={`/admin/productos?etiqueta=${t.id}&disp=todos`} className="hover:underline">
                      {t.total} {t.total === 1 ? "producto" : "productos"}
                    </Link>
                    {" · "}
                    {t.inStock} con stock
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(t.id);
                    setDraft(t.name);
                  }}
                  aria-label={`Renombrar ${t.name}`}
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-50"
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    const aviso = t.total > 0 ? `¿Eliminar la etiqueta “${t.name}”? Se quitará de ${t.total} productos. Los productos no se borran.` : `¿Eliminar la etiqueta “${t.name}”?`;
                    if (confirm(aviso)) run(() => deleteTag({ id: t.id }));
                  }}
                  aria-label={`Eliminar ${t.name}`}
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-500 hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
