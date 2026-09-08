"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { mediaUrl } from "@/lib/media-url";
import { formatCLP, cn } from "@/lib/format";
import { CheckeredFlagIcon } from "@/components/ui/AutoIcons";

export type HeroProduct = { id: string; slug: string; name: string; brand: string | null; price: number; image: string | null };

type Slide = { kind: "car"; src: string; alt: string } | { kind: "product"; product: HeroProduct };

const INTERVAL = 4200;

export function HeroShowcase({ products }: { products: HeroProduct[] }) {
  const reduce = useReducedMotion();
  const slides: Slide[] = [{ kind: "car", src: "/brand/auto_.png", alt: "Nissan Skyline GT-R R34 verde a escala" }, ...products.slice(0, 5).map((p) => ({ kind: "product" as const, product: p }))];
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  // Parallax con el mouse
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [8, -8]), { stiffness: 120, damping: 18 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-12, 12]), { stiffness: 120, damping: 18 });
  const tx = useSpring(useTransform(mx, [-0.5, 0.5], [-14, 14]), { stiffness: 80, damping: 20 });

  useEffect(() => {
    if (reduce || paused || slides.length < 2) return;
    const t = setInterval(() => setI((v) => (v + 1) % slides.length), INTERVAL);
    return () => clearInterval(t);
  }, [reduce, paused, slides.length]);

  function onMove(e: React.MouseEvent) {
    const r = wrap.current?.getBoundingClientRect();
    if (!r) return;
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  }

  const slide = slides[i];

  return (
    <div
      ref={wrap}
      onMouseMove={onMove}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => {
        mx.set(0);
        my.set(0);
        setPaused(false);
      }}
      className="relative mx-auto aspect-[16/11] w-full max-w-xl [perspective:1200px] select-none"
    >
      {/* Halo y pista */}
      <motion.div
        aria-hidden
        className="absolute inset-x-10 bottom-8 h-14 rounded-[100%] bg-lime/40 blur-2xl"
        animate={reduce ? undefined : { scale: [1, 1.15, 1], opacity: [0.6, 0.9, 0.6] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <div aria-hidden className="absolute inset-x-0 bottom-[12%] h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
      {/* Líneas de velocidad */}
      {!reduce ? (
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          {[18, 34, 52, 68].map((top, k) => (
            <motion.span
              key={top}
              className="absolute left-0 h-px w-24 bg-gradient-to-r from-transparent via-lime/70 to-transparent"
              style={{ top: `${top}%` }}
              animate={{ x: ["-30%", "130%"], opacity: [0, 1, 0] }}
              transition={{ duration: 1.6 + k * 0.3, repeat: Infinity, delay: k * 0.45, ease: "linear" }}
            />
          ))}
        </div>
      ) : null}

      <motion.div style={reduce ? undefined : { rotateX: rx, rotateY: ry, x: tx }} className="absolute inset-0 [transform-style:preserve-3d]">
        <AnimatePresence mode="wait" initial={false}>
          {slide.kind === "car" ? (
            <motion.img
              key="car"
              src={slide.src}
              alt={slide.alt}
              fetchPriority="high"
              initial={reduce ? false : { opacity: 0, x: 80, rotate: 2 }}
              animate={{ opacity: 1, x: 0, rotate: 0, y: reduce ? 0 : [0, -8, 0] }}
              exit={{ opacity: 0, x: -80, rotate: -2, transition: { duration: 0.35 } }}
              transition={{ opacity: { duration: 0.5 }, x: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }, y: { duration: 3, repeat: Infinity, ease: "easeInOut" } }}
              className="absolute inset-0 size-full object-contain drop-shadow-[0_30px_40px_rgba(0,0,0,0.6)]"
            />
          ) : (
            <motion.div
              key={slide.product.id}
              initial={reduce ? false : { opacity: 0, y: 40, rotate: -6, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, rotate: -3, scale: 1 }}
              exit={{ opacity: 0, y: -30, rotate: 4, scale: 0.95, transition: { duration: 0.35 } }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-x-[14%] inset-y-[2%] md:inset-x-[18%]"
            >
              <Link href={`/producto/${slide.product.slug}`} className="group block h-full">
                <div className="relative h-full overflow-hidden rounded-[1.6rem] bg-white shadow-[0_40px_80px_-20px_rgba(0,0,0,0.7)] ring-1 ring-white/20 transition-transform duration-500 group-hover:scale-[1.02]">
                  <img src={mediaUrl(slide.product.image, "medium")} alt={slide.product.name} className="size-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/90 via-ink/40 to-transparent p-4 text-white">
                    <span className="inline-flex items-center gap-1 rounded-full bg-lime px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink">
                      <CheckeredFlagIcon className="size-3" /> Destacado
                    </span>
                    <div className="mt-1.5 line-clamp-1 text-base font-bold">{slide.product.name}</div>
                    <div className="text-sm text-ink-200">
                      {slide.product.brand ?? "Hot Wheels"} · <span className="font-bold text-lime">{formatCLP(slide.product.price)}</span>
                    </div>
                  </div>
                  {/* brillo */}
                  <motion.div aria-hidden className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent" animate={reduce ? undefined : { x: ["0%", "400%"] }} transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.2, ease: "easeInOut" }} />
                </div>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Indicadores */}
      <div className="absolute bottom-0 right-0 flex gap-1.5">
        {slides.map((s, idx) => (
          <button
            key={s.kind === "car" ? "car" : s.product.id}
            onClick={() => setI(idx)}
            aria-label={`Ver ${idx + 1}`}
            className={cn("h-1.5 rounded-full transition-all duration-300", idx === i ? "w-7 bg-lime" : "w-2 bg-white/30 hover:bg-white/60")}
          />
        ))}
      </div>
    </div>
  );
}
