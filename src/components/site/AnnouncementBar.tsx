"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const MESSAGES = [
  { icon: "🚚", text: "Envíos a todo Chile · envío por pagar al recibir" },
  { icon: "🏁", text: "Más de 3.500 autos a escala disponibles" },
  { icon: "⚡", text: "Compra 24/7 · pago seguro con Flow y transferencia" },
  { icon: "🏪", text: "Retiro gratis en Metro El Llano o dirección comercial" },
];

export function AnnouncementBar() {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setI((v) => (v + 1) % MESSAGES.length), 3800);
    return () => clearInterval(t);
  }, [reduce]);
  const m = MESSAGES[i];
  return (
    <div className="relative h-5 overflow-hidden" aria-live="polite">
      <AnimatePresence mode="wait" initial={false}>
        <motion.p key={i} className="absolute inset-0 truncate" initial={reduce ? false : { y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
          <span className="mr-1.5" aria-hidden>
            {m.icon}
          </span>
          {m.text}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
