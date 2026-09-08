"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

/** Dispara ViewContent / view_item al montar la ficha de producto. No renderiza nada. */
export function ProductViewEvent({ product }: { product: { id: string; name: string; price: number; brand?: string | null; category?: string | null } }) {
  useEffect(() => {
    track("ViewContent", { items: [{ id: product.id, name: product.name, price: product.price, brand: product.brand, category: product.category }] });
  }, [product.id, product.name, product.price, product.brand, product.category]);
  return null;
}
