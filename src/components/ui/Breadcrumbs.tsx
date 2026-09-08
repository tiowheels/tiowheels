import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/format";

export type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Ruta de navegación" className={cn("-mx-4 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0", className)}>
      <ol className="flex items-center gap-1 whitespace-nowrap text-[13px] text-ink-500">
        {items.map((it, i) => {
          const last = i === items.length - 1;
          return (
            <li key={i} className="flex items-center gap-1">
              {i > 0 ? <ChevronRight className="size-3.5 shrink-0 text-ink-300" aria-hidden /> : null}
              {it.href && !last ? (
                <Link href={it.href} className="rounded hover:text-ink hover:underline underline-offset-4">
                  {it.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className={cn(last && "max-w-[60vw] truncate font-semibold text-ink sm:max-w-xs")}>
                  {it.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
