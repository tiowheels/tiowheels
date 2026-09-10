"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, ChevronDown } from "lucide-react";
import { cn } from "@/lib/format";

/**
 * Formulario GET de filtros: los <select> envían al cambiar y el texto al presionar Enter/buscar.
 * Mantiene la URL compartible (query string).
 */
export function FilterForm({ action, children, className }: { action: string; children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();
  return (
    <form
      ref={ref}
      action={action}
      method="get"
      className={className}
      onChange={(e) => {
        const t = e.target as HTMLElement;
        if (t.tagName === "SELECT" || (t as HTMLInputElement).type === "date" || (t as HTMLInputElement).type === "checkbox") ref.current?.requestSubmit();
      }}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(ref.current!);
        const sp = new URLSearchParams();
        for (const [k, v] of fd.entries()) if (typeof v === "string" && v.trim()) sp.set(k, v.trim());
        sp.delete("page");
        const qs = sp.toString();
        router.push(qs ? `${action}?${qs}` : action);
      }}
    >
      {children}
    </form>
  );
}

/**
 * En el celular los selectores ocupaban media pantalla, así que quedan detrás de
 * un botón "Filtros". En escritorio se ven siempre.
 */
export function CollapsibleFilters({ active = 0, children, className }: { active?: number; children: React.ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="btn-outline btn-md w-full justify-between sm:hidden">
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="size-4" />
          Filtros
          {active > 0 && <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-lime px-1.5 text-[11px] font-black text-ink">{active}</span>}
        </span>
        <ChevronDown className={cn("size-4 transition", open && "rotate-180")} />
      </button>
      <div className={cn(open ? "grid" : "hidden", "gap-2 sm:!grid", className)}>{children}</div>
    </>
  );
}
