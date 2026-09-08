import { cn } from "@/lib/format";

const tones = {
  neutral: "bg-ink-100 text-ink-700",
  lime: "bg-lime text-ink",
  dark: "bg-ink text-white",
  danger: "bg-danger/10 text-danger",
  success: "bg-success/10 text-success",
  warn: "bg-flame text-ink",
  outline: "border border-ink-200 text-ink-700",
} as const;

export function Badge({ children, tone = "neutral", className }: { children: React.ReactNode; tone?: keyof typeof tones; className?: string }) {
  return <span className={cn("inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-bold uppercase tracking-wide", tones[tone], className)}>{children}</span>;
}
