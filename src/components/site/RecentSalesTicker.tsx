import Link from "next/link";
import { mediaUrl } from "@/lib/media-url";
import { Marquee } from "./Marquee";
import { CheckeredFlagIcon } from "@/components/ui/AutoIcons";

export type RecentSale = { name: string; place: string; slug: string | null; image: string | null; at: string };

function ago(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 3600) return "hace minutos";
  if (d < 86400) return `hace ${Math.floor(d / 3600)} h`;
  const days = Math.floor(d / 86400);
  return days === 1 ? "ayer" : `hace ${days} días`;
}

/** Cinta con ventas reales recientes: prueba social en movimiento. */
export function RecentSalesTicker({ sales }: { sales: RecentSale[] }) {
  if (!sales.length) return null;
  return (
    <section aria-label="Ventas recientes" className="border-y border-ink-100 bg-white py-3">
      <div className="container-x mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-ink-400">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-lime opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-lime-600" />
        </span>
        Se vendieron recién
      </div>
      <Marquee speed={55}>
        {sales.map((s, i) => {
          const inner = (
            <>
              <img src={mediaUrl(s.image, "thumb")} alt="" className="size-10 shrink-0 rounded-lg bg-ink-50 object-contain" loading="lazy" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-ink">{s.name}</span>
                <span className="block text-xs text-ink-500">
                  <CheckeredFlagIcon className="mr-1 inline size-3 text-lime-700" />
                  {s.place} · {ago(s.at)}
                </span>
              </span>
            </>
          );
          const cls = "flex w-64 shrink-0 items-center gap-3 rounded-2xl border border-ink-100 bg-white px-3 py-2 shadow-sm transition hover:border-lime hover:shadow-card";
          return s.slug ? (
            <Link key={`${s.name}-${i}`} href={`/producto/${s.slug}`} className={cls}>
              {inner}
            </Link>
          ) : (
            <div key={`${s.name}-${i}`} className={cls}>
              {inner}
            </div>
          );
        })}
      </Marquee>
    </section>
  );
}
