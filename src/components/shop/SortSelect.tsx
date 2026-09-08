"use client";

import { ChevronDown } from "lucide-react";
import { buildShopUrl, type ShopQuery } from "@/lib/shop-url";
import { cn } from "@/lib/format";
import type { SortOption } from "./types";
import { useShopNav } from "./useShopNav";

export function SortSelect({ filters, options, id = "orden", className, disabled }: { filters: ShopQuery; options: readonly SortOption[]; id?: string; className?: string; disabled?: boolean }) {
  const { go } = useShopNav();
  const value = filters.orden ?? options[0]?.value ?? "";
  return (
    <div className={cn("relative", className)}>
      <label htmlFor={id} className="sr-only">
        Ordenar por
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => go(buildShopUrl(filters, { orden: e.target.value === options[0]?.value ? undefined : e.target.value }))}
        className="input h-10 cursor-pointer appearance-none rounded-full pr-10 text-sm font-semibold"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400" aria-hidden />
    </div>
  );
}
