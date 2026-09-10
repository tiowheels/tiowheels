"use client";

import { useMemo, useRef, useState } from "react";
import { X, Plus, Search } from "lucide-react";
import { normalizeText } from "@/lib/format";

/**
 * Campo de etiquetas (los "lotes" del sitio anterior: Básicos 53, Premium 2…).
 * Funciona igual que el selector de categorías: se busca con la lupa y se marca de la lista.
 * Si lo escrito no existe todavía, el mismo campo permite crear la etiqueta.
 * Envía un input oculto `tagNames` por cada etiqueta.
 */
export function TagInput({ name = "tagNames", initial = [], suggestions = [] }: { name?: string; initial?: string[]; suggestions?: { name: string; count: number }[] }) {
  const [tags, setTags] = useState<string[]>(initial);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function add(raw: string) {
    const parts = raw
      .split(",")
      .map((t) => t.trim().replace(/\s+/g, " "))
      .filter(Boolean);
    if (!parts.length) return;
    setTags((prev) => {
      const next = [...prev];
      for (const p of parts) {
        if (!next.some((t) => t.toLowerCase() === p.toLowerCase())) next.push(p);
      }
      return next;
    });
    setQuery("");
  }

  function toggle(tag: string) {
    setTags((prev) => (prev.some((t) => t.toLowerCase() === tag.toLowerCase()) ? prev.filter((t) => t.toLowerCase() !== tag.toLowerCase()) : [...prev, tag]));
  }

  function remove(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag));
  }

  const q = normalizeText(query);
  const visibles = useMemo(() => {
    const orden = [...suggestions].sort((a, b) => a.name.localeCompare(b.name, "es", { numeric: true }));
    return q ? orden.filter((s) => normalizeText(s.name).includes(q)) : orden;
  }, [suggestions, q]);
  const yaExiste = suggestions.some((s) => normalizeText(s.name) === q) || tags.some((t) => normalizeText(t) === q);

  return (
    <div>
      {tags.map((t) => (
        <input key={t} type="hidden" name={name} value={t} />
      ))}

      {tags.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <li key={t}>
              <span className="inline-flex h-8 items-center gap-1 rounded-lg bg-ink px-2.5 text-xs font-bold text-white">
                {t}
                <button type="button" onClick={() => remove(t)} aria-label={`Quitar ${t}`} className="-mr-1 flex size-6 items-center justify-center rounded-md hover:bg-white/15">
                  <X className="size-3.5" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(query);
            } else if (e.key === "Backspace" && !query && tags.length) {
              remove(tags[tags.length - 1]);
            }
          }}
          placeholder="Buscar o crear etiqueta…"
          aria-label="Buscar o crear etiqueta"
          className="input h-10 pl-9 text-sm"
        />
      </div>

      {query.trim() && !yaExiste && (
        <button type="button" onClick={() => add(query)} className="btn-outline btn-sm mt-2 w-full justify-start">
          <Plus className="size-4" /> Crear «{query.trim()}»
        </button>
      )}

      <div className="mt-2 max-h-64 space-y-0.5 overflow-y-auto pr-1">
        {visibles.length === 0 && !query.trim() && <p className="px-2 py-4 text-center text-sm text-ink-500">Todavía no hay etiquetas creadas.</p>}
        {visibles.map((s) => (
          <label key={s.name} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm hover:bg-ink-50">
            <input type="checkbox" checked={tags.some((t) => t.toLowerCase() === s.name.toLowerCase())} onChange={() => toggle(s.name)} className="size-4 accent-ink" />
            <span className="min-w-0 flex-1 truncate">{s.name}</span>
            <span className="shrink-0 text-xs tabular-nums text-ink-400">{s.count}</span>
          </label>
        ))}
      </div>

      <p className="mt-2 text-xs text-ink-400">Sirven para agrupar por lote de compra, igual que en el sitio anterior. No se muestran en la tienda.</p>
    </div>
  );
}
