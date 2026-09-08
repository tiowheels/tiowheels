import { cn, formatCLP } from "@/lib/format";

export function Price({ amount, compareAt, className, size = "md" }: { amount: number; compareAt?: number | null; className?: string; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "text-sm", md: "text-base", lg: "text-2xl" };
  return (
    <span className={cn("inline-flex items-baseline gap-2 font-bold tabular-nums", sizes[size], className)}>
      {formatCLP(amount)}
      {compareAt && compareAt > amount ? <s className="text-ink-400 font-medium text-[0.8em]">{formatCLP(compareAt)}</s> : null}
    </span>
  );
}
