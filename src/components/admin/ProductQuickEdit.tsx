"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/format";
import { quickUpdateProduct } from "@/app/admin/(panel)/productos/actions";

/** Input inline para stock o precio: guarda al salir del campo o con Enter. */
export function ProductQuickEdit({ id, field, value, className }: { id: string; field: "stock" | "price"; value: number; className?: string }) {
  const router = useRouter();
  const [val, setVal] = useState(String(value));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();

  const [prevValue, setPrevValue] = useState(value);
  if (prevValue !== value) {
    setPrevValue(value);
    setVal(String(value));
  }

  function commit() {
    const n = parseInt(val.replace(/\D/g, "") || "0", 10);
    if (!Number.isFinite(n) || n === value) {
      setVal(String(value));
      return;
    }
    start(async () => {
      const r = await quickUpdateProduct({ id, [field]: n });
      if (r.ok) {
        setSaved(true);
        setError(false);
        setTimeout(() => setSaved(false), 1500);
        router.refresh();
      } else {
        setError(true);
        setVal(String(value));
      }
    });
  }

  return (
    <span className={cn("relative inline-flex items-center", className)}>
      {field === "price" && <span className="pointer-events-none absolute left-2.5 text-xs font-semibold text-ink-400">$</span>}
      <input
        type="text"
        inputMode="numeric"
        enterKeyHint="done"
        aria-label={field === "stock" ? "Stock" : "Precio"}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onFocus={(e) => e.target.select()}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            setVal(String(value));
            (e.target as HTMLInputElement).blur();
          }
        }}
        disabled={pending}
        className={cn(
          "input h-10 text-right text-sm font-bold tabular-nums",
          field === "price" ? "w-24 pl-6 pr-2" : "w-16 px-2",
          field === "stock" && value === 0 && "border-danger/60 bg-danger/5 text-danger",
          field === "stock" && value === 1 && "border-flame/60 bg-flame/10",
          error && "border-danger",
        )}
      />
      <span className="absolute -right-5 flex w-4 items-center justify-center">
        {pending && <Loader2 className="size-3.5 animate-spin text-ink-400" />}
        {saved && <Check className="size-4 text-success" />}
      </span>
    </span>
  );
}
