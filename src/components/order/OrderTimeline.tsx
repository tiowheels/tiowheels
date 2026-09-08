import { Check, X } from "lucide-react";
import type { OrderStatus, ShippingMethod } from "@/generated/prisma/enums";
import { cn } from "@/lib/format";

const STEPS: { key: OrderStatus; label: string; pickupLabel?: string }[] = [
  { key: "PENDING", label: "Pedido recibido" },
  { key: "PAID", label: "Pagado" },
  { key: "PROCESSING", label: "En preparación" },
  { key: "SHIPPED", label: "Enviado", pickupLabel: "Listo para retiro" },
  { key: "COMPLETED", label: "Entregado" },
];

const ORDER: Record<OrderStatus, number> = { PENDING: 0, PAID: 1, PROCESSING: 2, SHIPPED: 3, COMPLETED: 4, CANCELLED: -1, REFUNDED: -1 };

/** Línea de tiempo simple del estado del pedido (Recibido → Pagado → Preparación → Enviado → Entregado). */
export function OrderTimeline({ status, shippingMethod, className }: { status: OrderStatus; shippingMethod: ShippingMethod; className?: string }) {
  const closed = status === "CANCELLED" || status === "REFUNDED";
  const current = closed ? -1 : ORDER[status];
  const isPickup = shippingMethod === "PICKUP";

  return (
    <ol className={cn("grid grid-cols-5 gap-1", className)} aria-label="Estado del pedido">
      {STEPS.map((step, i) => {
        const done = !closed && i < current;
        const active = !closed && i === current;
        const label = isPickup && step.pickupLabel ? step.pickupLabel : step.label;
        return (
          <li key={step.key} className="relative flex flex-col items-center text-center">
            {i > 0 ? <span className={cn("absolute right-1/2 top-3.5 h-0.5 w-full", done || active ? "bg-lime" : "bg-ink-100")} aria-hidden /> : null}
            <span
              className={cn(
                "relative z-10 flex size-7 items-center justify-center rounded-full border-2 text-[11px] font-bold",
                done && "border-lime bg-lime text-ink",
                active && "border-ink bg-ink text-white ring-4 ring-lime/40",
                !done && !active && !closed && "border-ink-200 bg-white text-ink-400",
                closed && "border-ink-100 bg-ink-50 text-ink-300",
              )}
            >
              {done ? <Check className="size-3.5" strokeWidth={3} /> : closed ? <X className="size-3.5" /> : i + 1}
            </span>
            <span className={cn("mt-1.5 text-[10px] leading-tight sm:text-[11px]", active ? "font-bold text-ink" : done ? "font-semibold text-ink-700" : "text-ink-400")}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
