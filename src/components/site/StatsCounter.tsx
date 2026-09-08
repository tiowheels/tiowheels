"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";

function CountUp({ to, duration = 1600 }: { to: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  const [v, setV] = useState(reduce ? to : 0);

  useEffect(() => {
    if (!inView || reduce) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduce, to, duration]);

  return <span ref={ref}>{v.toLocaleString("es-CL")}</span>;
}

export function StatsCounter({ stats }: { stats: { value: number; prefix?: string; suffix?: string; label: string }[] }) {
  return (
    <dl className="grid grid-cols-3 gap-3 sm:gap-6">
      {stats.map((s) => (
        <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-4 text-center backdrop-blur-sm sm:px-5">
          <dd className="text-2xl font-bold tabular-nums text-lime sm:text-4xl">
            {s.prefix}
            <CountUp to={s.value} />
            {s.suffix}
          </dd>
          <dt className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-ink-300 sm:text-xs">{s.label}</dt>
        </div>
      ))}
    </dl>
  );
}
