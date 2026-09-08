import type { ReactNode } from "react";
import { cn } from "@/lib/format";

/** Cinta infinita (CSS puro). Duplica el contenido para el bucle. */
export function Marquee({ children, className, speed = 40, reverse = false, pauseOnHover = true }: { children: ReactNode; className?: string; speed?: number; reverse?: boolean; pauseOnHover?: boolean }) {
  return (
    <div className={cn("group/marquee relative flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]", className)}>
      {[0, 1].map((k) => (
        <div
          key={k}
          aria-hidden={k === 1}
          className={cn("flex shrink-0 items-center gap-8 pr-8 motion-safe:animate-marquee", reverse && "[animation-direction:reverse]", pauseOnHover && "group-hover/marquee:[animation-play-state:paused]")}
          style={{ animationDuration: `${speed}s` }}
        >
          {children}
        </div>
      ))}
    </div>
  );
}
