import Link from "next/link";
import { cn } from "@/lib/format";

/** Marco tipográfico para páginas legales (términos, privacidad). */
export function LegalPage({ eyebrow, title, updated, intro, children }: { eyebrow: string; title: string; updated?: string; intro?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="pb-16">
      <section className="border-b border-ink-100 bg-ink-50/70">
        <div className="container-x py-10 md:py-14">
          <span className="eyebrow">{eyebrow}</span>
          <h1 className="mt-2 text-3xl sm:text-4xl lg:text-5xl">{title}</h1>
          {updated ? <p className="mt-3 text-sm text-ink-500">Última actualización: {updated}</p> : null}
        </div>
      </section>
      <article className="container-x mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="max-w-3xl">
          {intro ? <div className="text-[15px] leading-relaxed text-ink-700 [&>p+p]:mt-3">{intro}</div> : null}
          <div className="mt-8 space-y-10">{children}</div>
        </div>
        <aside className="hidden lg:block">
          <div className="card sticky top-[100px] p-6 text-sm">
            <div className="font-bold">¿Tienes dudas?</div>
            <p className="mt-2 text-ink-500">Escríbenos y te ayudamos con tu pedido, cambios o cualquier consulta.</p>
            <Link href="/contacto" className="btn-outline btn-sm mt-4 w-full">
              Ir a contacto
            </Link>
          </div>
        </aside>
      </article>
    </div>
  );
}

export function LegalSection({ n, title, children, className }: { n?: number; title: string; children: React.ReactNode; className?: string }) {
  const id = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return (
    <section id={id} aria-labelledby={`${id}-h`} className={cn("scroll-mt-28", className)}>
      <h2 id={`${id}-h`} className="flex items-baseline gap-3 text-xl sm:text-2xl">
        {n != null ? <span className="text-lime-700 tabular-nums">{String(n).padStart(2, "0")}</span> : null}
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-ink-700 [&>ul]:space-y-2 [&>ul]:pl-1 [&_li]:relative [&_li]:pl-5 [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:top-[0.7em] [&_li]:before:size-1.5 [&_li]:before:rounded-full [&_li]:before:bg-lime [&_li_ul]:mt-2 [&_li_ul]:space-y-1.5 [&_b]:text-ink [&_a]:font-semibold [&_a]:text-ink [&_a]:underline [&_a]:underline-offset-4">
        {children}
      </div>
    </section>
  );
}
