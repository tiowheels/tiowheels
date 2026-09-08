"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/format";

export function QuantityStepper({ value, min = 1, max = 99, onChange, size = "md", className }: { value: number; min?: number; max?: number; onChange: (v: number) => void; size?: "sm" | "md"; className?: string }) {
  const h = size === "sm" ? "h-9" : "h-11";
  const btn = size === "sm" ? "w-9" : "w-11";
  return (
    <div className={cn("inline-flex items-center rounded-full border border-ink-200 bg-white", h, className)}>
      <button type="button" aria-label="Quitar uno" disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))} className={cn("flex h-full items-center justify-center rounded-l-full text-ink-700 transition hover:bg-ink-50 disabled:opacity-40", btn)}>
        <Minus className="size-4" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const v = parseInt(e.target.value || "0", 10);
          if (Number.isFinite(v)) onChange(Math.max(min, Math.min(max, v)));
        }}
        className="h-full w-10 border-x border-ink-100 bg-transparent text-center text-sm font-bold tabular-nums focus:outline-none"
      />
      <button type="button" aria-label="Agregar uno" disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))} className={cn("flex h-full items-center justify-center rounded-r-full text-ink-700 transition hover:bg-ink-50 disabled:opacity-40", btn)}>
        <Plus className="size-4" />
      </button>
    </div>
  );
}
