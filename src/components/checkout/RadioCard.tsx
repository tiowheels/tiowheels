"use client";

import { cn } from "@/lib/format";

export function RadioCard({
  name,
  value,
  checked,
  onChange,
  title,
  description,
  icon,
  badge,
  disabled,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: (v: string) => void;
  title: string;
  description: string;
  icon?: React.ReactNode;
  badge?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "relative flex cursor-pointer items-start gap-3 rounded-2xl border-2 bg-white p-4 transition",
        checked ? "border-ink shadow-card" : "border-ink-100 hover:border-ink-300",
        disabled && "cursor-not-allowed opacity-50",
        "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-lime has-[:focus-visible]:ring-offset-2",
      )}
    >
      <input type="radio" name={name} value={value} checked={checked} disabled={disabled} onChange={() => onChange(value)} className="sr-only" />
      {icon ? <span className={cn("mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full transition", checked ? "bg-lime text-ink" : "bg-ink-50 text-ink-500")}>{icon}</span> : null}
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-[15px] font-bold leading-tight">{title}</span>
          {badge ? <span className="rounded-full bg-lime-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-lime-700">{badge}</span> : null}
        </span>
        <span className="mt-1 block text-[13px] leading-snug text-ink-500">{description}</span>
      </span>
      <span aria-hidden className={cn("mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition", checked ? "border-ink bg-ink" : "border-ink-300")}>
        {checked ? <span className="size-2 rounded-full bg-lime" /> : null}
      </span>
    </label>
  );
}
