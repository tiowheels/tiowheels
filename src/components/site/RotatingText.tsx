"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/format";

/**
 * Bloque de dos líneas que va cambiando solo, palabra a palabra.
 * La primera línea va en blanco y la segunda en lima, como el título de la portada.
 */
export function RotatingText({ blocks, interval = 4200, className }: { blocks: readonly (readonly [string, string])[]; interval?: number; className?: string }) {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (reduce || blocks.length < 2) return;
    const t = setInterval(() => setI((v) => (v + 1) % blocks.length), interval);
    return () => clearInterval(t);
  }, [reduce, blocks.length, interval]);

  const bloque = blocks[i] ?? blocks[0];

  return (
    <span className={cn("relative block", className)} aria-live="polite">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={i}
          className="block"
          initial={reduce ? false : "hidden"}
          animate="show"
          exit="exit"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } }, exit: { transition: { staggerChildren: 0.025, staggerDirection: -1 } } }}
        >
          {bloque.map((linea, l) => (
            <span key={l} className={cn("block", l === 1 && "text-lime")}>
              {linea.split(" ").map((w, k) => (
                <motion.span
                  key={`${i}-${l}-${k}`}
                  className="mr-[0.24em] inline-block last:mr-0"
                  variants={{ hidden: { opacity: 0, y: "0.6em", rotateX: -40 }, show: { opacity: 1, y: 0, rotateX: 0 }, exit: { opacity: 0, y: "-0.5em" } }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                >
                  {w}
                </motion.span>
              ))}
            </span>
          ))}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
