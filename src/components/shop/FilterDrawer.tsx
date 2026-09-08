"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/format";
import { countActiveFilters } from "@/lib/shop-url";
import { FilterPanel, type FilterPanelProps } from "./FilterPanel";

/** Botón "Filtros" + bottom-sheet para móvil/tablet. */
export function FilterDrawer({ total, ...panel }: FilterPanelProps & { total: number }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const closeBtn = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const active = countActiveFilters(panel.filters);

  // Si cambia la ruta (no solo la query), se cierra. Al cambiar filtros se mantiene abierto para combinar varios.
  const lastPath = useRef(pathname);
  useEffect(() => {
    if (lastPath.current !== pathname) {
      lastPath.current = pathname;
      setOpen(false);
    }
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const triggerEl = trigger.current;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const t = setTimeout(() => closeBtn.current?.focus(), 50);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
      clearTimeout(t);
      triggerEl?.focus();
    };
  }, [open]);

  return (
    <>
      <button ref={trigger} type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open} className="btn-outline btn-md relative shrink-0">
        <SlidersHorizontal className="size-4" aria-hidden /> Filtros
        {active > 0 ? <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-lime px-1.5 text-[11px] font-bold text-ink">{active}</span> : null}
      </button>

      <div className={cn("fixed inset-0 z-[80]", open ? "" : "pointer-events-none")} aria-hidden={!open}>
        <div onClick={() => setOpen(false)} className={cn("absolute inset-0 bg-ink/50 backdrop-blur-[2px] transition-opacity", open ? "opacity-100" : "opacity-0")} />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Filtros"
          className={cn(
            "absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-[1.75rem] bg-white shadow-pop transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)] sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[380px] sm:rounded-none",
            open ? "translate-y-0 sm:translate-x-0" : "translate-y-full sm:translate-x-full sm:translate-y-0",
          )}
        >
          <div className="mx-auto mt-2.5 h-1.5 w-12 rounded-full bg-ink-200 sm:hidden" aria-hidden />
          <header className="flex items-center justify-between px-5 py-3 sm:py-4">
            <h2 className="text-lg">Filtros</h2>
            <button ref={closeBtn} type="button" onClick={() => setOpen(false)} aria-label="Cerrar filtros" className="flex size-10 items-center justify-center rounded-full hover:bg-ink-50">
              <X className="size-5" />
            </button>
          </header>
          <div className="flex-1 overflow-y-auto px-5 pb-4">{open ? <FilterPanel {...panel} showSort idPrefix="m" /> : null}</div>
          <footer className="safe-bottom border-t border-ink-100 px-5 py-3">
            <button type="button" onClick={() => setOpen(false)} className="btn-lime btn-lg w-full">
              Ver {total.toLocaleString("es-CL")} {total === 1 ? "producto" : "productos"}
            </button>
          </footer>
        </div>
      </div>
    </>
  );
}
