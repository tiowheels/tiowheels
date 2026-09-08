"use client";

import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/format";
import type { FormState } from "../actions";

export function SubmitButton({ children, className, variant = "lime" }: { children: React.ReactNode; className?: string; variant?: "lime" | "primary" | "outline" }) {
  const { pending } = useFormStatus();
  const base = variant === "lime" ? "btn-lime" : variant === "primary" ? "btn-primary" : "btn-outline";
  return (
    <button type="submit" disabled={pending} className={cn(base, "btn-lg w-full", className)}>
      {pending ? <Loader2 className="size-5 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}

export function FormMessage({ state, className }: { state: FormState; className?: string }) {
  if (!state?.message) return null;
  return (
    <div role="alert" className={cn("flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm", state.ok ? "bg-lime-50 text-ink-700" : "bg-danger/5 text-danger", className)}>
      {state.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-lime-700" /> : <AlertCircle className="mt-0.5 size-4 shrink-0" />}
      <span>{state.message}</span>
    </div>
  );
}

export function Field({ label, id, error, hint, optional, className, children }: { label: string; id: string; error?: string; hint?: string; optional?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label} {optional ? <span className="font-medium text-ink-400">(opcional)</span> : null}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-[13px] font-medium text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-ink-400">{hint}</p>
      ) : null}
    </div>
  );
}

/** Error de campo solo si el estado apunta a ese campo. */
export function fieldError(state: FormState, name: string) {
  return state && !state.ok && state.field === name ? state.message : undefined;
}
