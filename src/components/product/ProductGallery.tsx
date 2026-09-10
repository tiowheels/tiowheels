"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { mediaUrl } from "@/lib/media-url";
import { cn } from "@/lib/format";

export type GalleryImage = { path: string | null; alt: string | null; width?: number | null; height?: number | null };

export function ProductGallery({ images, name, soldOut }: { images: GalleryImage[]; name: string; soldOut?: boolean }) {
  const list: GalleryImage[] = images.length ? images : [{ path: null, alt: null }];
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const strip = useRef<HTMLDivElement>(null);
  const thumbs = useRef<HTMLDivElement>(null);
  const multiple = list.length > 1;

  // Sincroniza el índice con el scroll (swipe en móvil).
  useEffect(() => {
    const el = strip.current;
    if (!el || !multiple) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const i = Math.round(el.scrollLeft / el.clientWidth);
        setIndex((prev) => (prev === i ? prev : Math.max(0, Math.min(list.length - 1, i))));
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [multiple, list.length]);

  const goTo = useCallback(
    (i: number) => {
      const el = strip.current;
      const next = (i + list.length) % list.length;
      setIndex(next);
      el?.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
      thumbs.current?.children[next]?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
    },
    [list.length],
  );

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    if (window.matchMedia("(hover: none)").matches) return;
    const r = e.currentTarget.getBoundingClientRect();
    setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <div
          ref={strip}
          className="flex snap-x snap-mandatory overflow-x-auto rounded-card bg-ink-50 scrollbar-none"
          role={multiple ? "region" : undefined}
          aria-roledescription={multiple ? "carrusel" : undefined}
          aria-label={multiple ? `Imágenes de ${name}` : undefined}
          onKeyDown={(e) => {
            if (!multiple) return;
            if (e.key === "ArrowRight") goTo(index + 1);
            if (e.key === "ArrowLeft") goTo(index - 1);
          }}
          tabIndex={multiple ? 0 : -1}
        >
          {list.map((img, i) => (
            <div key={i} className="relative aspect-[3/4] w-full shrink-0 snap-center overflow-hidden" onMouseMove={onMove} onMouseLeave={() => setZoom(null)} aria-hidden={i !== index}>
              <img
                src={mediaUrl(img.path, "large")}
                alt={img.alt ?? (i === 0 ? name : `${name} — imagen ${i + 1}`)}
                loading={i === 0 ? "eager" : "lazy"}
                decoding="async"
                fetchPriority={i === 0 ? "high" : undefined}
                width={img.width || undefined}
                height={img.height || undefined}
                draggable={false}
                className={cn("size-full object-cover transition-transform duration-150 ease-out will-change-transform", soldOut && "opacity-70 grayscale-[30%]")}
                style={zoom && i === index ? { transform: "scale(1.9)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
              />
            </div>
          ))}
        </div>

        {multiple ? (
          <>
            <button type="button" onClick={() => goTo(index - 1)} aria-label="Imagen anterior" className="absolute left-3 top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow-card backdrop-blur transition hover:bg-white sm:flex">
              <ChevronLeft className="size-5" />
            </button>
            <button type="button" onClick={() => goTo(index + 1)} aria-label="Imagen siguiente" className="absolute right-3 top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow-card backdrop-blur transition hover:bg-white sm:flex">
              <ChevronRight className="size-5" />
            </button>
            <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 sm:hidden" aria-hidden>
              {list.map((_, i) => (
                <span key={i} className={cn("h-1.5 rounded-full bg-white shadow transition-all", i === index ? "w-5" : "w-1.5 opacity-70")} />
              ))}
            </div>
            <span className="sr-only" aria-live="polite">
              Imagen {index + 1} de {list.length}
            </span>
          </>
        ) : null}
      </div>

      {multiple ? (
        <div ref={thumbs} className="flex gap-2 overflow-x-auto pb-1 scrollbar-none" role="tablist" aria-label="Miniaturas">
          {list.map((img, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Ver imagen ${i + 1}`}
              onClick={() => goTo(i)}
              className={cn("relative h-20 w-15 shrink-0 overflow-hidden rounded-xl border-2 bg-ink-50 transition sm:h-24 sm:w-18", i === index ? "border-ink" : "border-transparent opacity-70 hover:opacity-100")}
            >
              <img src={mediaUrl(img.path, "thumb")} alt="" loading="lazy" decoding="async" width={img.width || undefined} height={img.height || undefined} className="size-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
