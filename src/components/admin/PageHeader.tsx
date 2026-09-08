import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function PageHeader({ title, eyebrow, back, children, description }: { title: React.ReactNode; eyebrow?: string; back?: { href: string; label: string }; children?: React.ReactNode; description?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 md:mb-7">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-ink-500 hover:text-ink">
            <ArrowLeft className="size-3.5" /> {back.label}
          </Link>
        )}
        {eyebrow && <span className="eyebrow block">{eyebrow}</span>}
        <h1 className="text-2xl md:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function EmptyState({ title, text, children }: { title: string; text?: string; children?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="text-lg font-bold">{title}</div>
      {text && <p className="mt-1 max-w-sm text-sm text-ink-500">{text}</p>}
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}
