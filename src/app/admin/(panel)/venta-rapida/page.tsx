import type { Metadata } from "next";
import { QuickSale } from "@/components/admin/QuickSale";

export const metadata: Metadata = { title: "Venta rápida" };

export default function QuickSalePage() {
  return (
    <>
      <div className="mb-3 flex items-end justify-between md:mb-6">
        <div>
          <span className="eyebrow">Feria · Instagram · Presencial</span>
          <h1 className="text-2xl md:text-3xl">Venta rápida</h1>
        </div>
      </div>
      <QuickSale />
    </>
  );
}
