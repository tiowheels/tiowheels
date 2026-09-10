"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, X, Loader2, ArrowRight } from "lucide-react";
import { cn, formatCLP } from "@/lib/format";

type Result = {
  products: { slug: string; name: string; price: number; stock: number; brand: string | null; image: string }[];
  categories: { slug: string; name: string }[];
};

export function SearchBox({ className, autoFocus, onNavigate, variant = "header" }: { className?: string; autoFocus?: boolean; onNavigate?: () => void; variant?: "header" | "hero" }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const [active, setActive] = useState(-1);
  const box = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    abort.current?.abort();
    if (q.trim().length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sincronización con estado externo (hidratación/DOM)
      setRes(null);
      setLoading(false);
      return;
    }
    const ac = new AbortController();
    abort.current = ac;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`, { signal: ac.signal });
        if (ac.signal.aborted) return;
        setRes(await r.json());
        setActive(-1);
        setLoading(false);
      } catch {
        if (!ac.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [q]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function go(href: string) {
    setOpen(false);
    onNavigate?.();
    router.push(href);
  }

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const term = q.trim();
    if (!term) return;
    if (active >= 0 && res?.products[active]) return go(`/producto/${res.products[active].slug}`);
    go(`/tienda?q=${encodeURIComponent(term)}`);
  }

  const items = res?.products ?? [];
  const showPanel = open && q.trim().length >= 2;

  return (
    <div ref={box} className={cn("relative", className)}>
      <form onSubmit={submit} role="search" className="relative">
        <Search className={cn("pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-ink-400", variant === "hero" && "left-5 size-5")} />
        <input
          type="search"
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(items.length - 1, a + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(-1, a - 1));
            } else if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Busca por modelo, marca o serie… ej: Datsun 510"
          aria-label="Buscar productos"
          autoComplete="off"
          enterKeyHint="search"
          className={cn(
            "input pl-11 pr-11 rounded-full",
            variant === "hero" && "h-14 pl-13 text-base shadow-pop border-transparent",
          )}
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {loading ? <Loader2 className="size-4 animate-spin text-ink-400" /> : null}
          {q ? (
            <button type="button" aria-label="Limpiar" onClick={() => { setQ(""); setRes(null); }} className="flex size-8 items-center justify-center rounded-full text-ink-400 hover:bg-ink-50 hover:text-ink">
              <X className="size-4" />
            </button>
          ) : null}
        </div>
      </form>

      {showPanel ? (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-pop">
          {res && items.length === 0 && !loading ? (
            <div className="p-5 text-sm text-ink-500">
              Sin resultados para <b className="text-ink">“{q}”</b>. Prueba con otra marca o modelo.
            </div>
          ) : null}
          {res?.categories.length ? (
            <div className="flex flex-wrap gap-2 border-b border-ink-100 px-4 py-3">
              {res.categories.map((c) => (
                <Link key={c.slug} href={`/tienda?cat=${c.slug}`} onClick={() => go(`/tienda?cat=${c.slug}`)} className="chip">
                  {c.name}
                </Link>
              ))}
            </div>
          ) : null}
          <ul className="max-h-[60vh] overflow-y-auto py-1">
            {items.map((p, i) => (
              <li key={p.slug}>
                <Link
                  href={`/producto/${p.slug}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={(e) => {
                    e.preventDefault();
                    go(`/producto/${p.slug}`);
                  }}
                  className={cn("flex items-center gap-3 px-3 py-2 transition", active === i ? "bg-ink-50" : "hover:bg-ink-50")}
                >
                  <img src={p.image} alt="" className="size-12 shrink-0 rounded-lg bg-ink-50 object-contain" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{p.name}</div>
                    <div className="text-xs text-ink-400">{p.brand ?? "Hot Wheels"}{p.stock <= 0 ? " · Agotado" : ""}</div>
                  </div>
                  <div className="text-sm font-bold tabular-nums">{formatCLP(p.price)}</div>
                </Link>
              </li>
            ))}
          </ul>
          {items.length ? (
            <button type="button" onClick={() => submit()} className="flex w-full items-center justify-between border-t border-ink-100 px-4 py-3 text-sm font-semibold hover:bg-ink-50">
              Ver todos los resultados para “{q.trim()}”
              <ArrowRight className="size-4" />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
