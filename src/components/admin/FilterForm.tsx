"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";

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
