import type { Metadata } from "next";
import { CartPageView } from "@/components/cart/CartPageView";

export const metadata: Metadata = { title: "Carrito", robots: { index: false } };

export default function CartPage() {
  return (
    <div className="container-x pb-16 pt-6 md:pt-10">
      <span className="eyebrow">Tu compra</span>
      <h1 className="mt-1 text-3xl sm:text-4xl">Carrito</h1>
      <div className="mt-6 md:mt-8">
        <CartPageView />
      </div>
    </div>
  );
}
