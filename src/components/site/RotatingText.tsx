"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/format";

/** Frase que cambia sola, palabra a palabra, con animación. */
export function RotatingText({ phrases, interval = 3200, className }: { phrases: string[]; interval?: number; className?: string }) {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (reduce || phrases.length < 2) return;
    const t = setInterval(() => setI((v) => (v + 1) % phrases.length), interval);
    return () => clearInterval(t);
  }, [reduce, phrases.length, interval]);

  const words = phrases[i].split(" ");

  return (
    <span className={cn("relative block", className)} aria-live="polite">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={i} className="block" initial={reduce ? false : "hidden"} animate="show" exit="exit" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } }, exit: { transition: { staggerChildren: 0.03, staggerDirection: -1 } } }}>
          {words.map((w, k) => (
            <motion.span
              key={`${i}-${k}`}
              className="mr-[0.24em] inline-block last:mr-0"
              variants={{ hidden: { opacity: 0, y: "0.6em", rotateX: -40 }, show: { opacity: 1, y: 0, rotateX: 0 }, exit: { opacity: 0, y: "-0.5em" } }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              {w}
            </motion.span>
          ))}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
