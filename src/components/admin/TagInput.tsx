"use client";

import { useRef, useState } from "react";
import { X, Plus } from "lucide-react";
import { cn } from "@/lib/format";

/**
 * Campo de etiquetas (los "lotes" del sitio anterior: Básicos 53, Premium 2…).
 * Se escriben separadas por coma o con Enter; sugiere las que ya existen.
 * Envía un input oculto `tagNames` por cada etiqueta.
 */
export function TagInput({ name = "tagNames", initial = [], suggestions = [] }: { name?: string; initial?: string[]; suggestions?: { name: string; count: number }[] }) {
  const [tags, setTags] = useState<string[]>(initial);
  const [draft, setDraft] = useState("");
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
    setDraft("");
  }

  function remove(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag));
  }

  const listId = `${name}-sugerencias`;
  const restantes = suggestions.filter((s) => !tags.some((t) => t.toLowerCase() === s.name.toLowerCase()));
  const rapidas = restantes.slice(0, 6);

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

      <div className="flex gap-2">
        <input
          ref={inputRef}
          list={listId}
          value={draft}
          onChange={(e) => {
            const v = e.target.value;
            // Al elegir una sugerencia del desplegable se agrega sola
            if (suggestions.some((s) => s.name === v)) add(v);
            else setDraft(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Backspace" && !draft && tags.length) {
              remove(tags[tags.length - 1]);
            }
          }}
          onBlur={() => add(draft)}
          placeholder="Básicos 53, Premium 2…"
          aria-label="Agregar etiqueta"
          className="input"
        />
        <button type="button" onClick={() => { add(draft); inputRef.current?.focus(); }} disabled={!draft.trim()} className="btn-outline size-11 shrink-0 !p-0" aria-label="Agregar etiqueta">
          <Plus className="size-5" />
        </button>
      </div>
      <datalist id={listId}>
        {restantes.map((s) => (
          <option key={s.name} value={s.name}>
            {s.count} productos
          </option>
        ))}
      </datalist>

      {rapidas.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {rapidas.map((s) => (
            <button key={s.name} type="button" onClick={() => add(s.name)} className={cn("chip h-7 text-[11px]")}>
              <Plus className="size-3" /> {s.name}
            </button>
          ))}
        </div>
      )}
      <p className="mt-2 text-xs text-ink-400">Sirven para agrupar por lote de compra, igual que en el sitio anterior. No se muestran en la tienda.</p>
    </div>
  );
}
