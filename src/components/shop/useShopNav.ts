"use client";

import { useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";

/** Navegación dentro de /tienda con estado de transición (para atenuar el panel mientras carga). */
export function useShopNav() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const go = useCallback(
    (url: string) => {
      startTransition(() => {
        router.push(url, { scroll: true });
      });
    },
    [router],
  );
  return { go, pending };
}
