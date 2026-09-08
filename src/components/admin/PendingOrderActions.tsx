"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, PackageCheck, Truck, MessageCircle } from "lucide-react";
import type { OrderStatus, PaymentStatus } from "@/generated/prisma/enums";
import { markOrderPaid, updateOrderStatus } from "@/app/admin/(panel)/pedidos/actions";
import { whatsappTo, orderWhatsappMessage } from "./labels";

/** Acciones cortas para la lista de pendientes del dashboard. */
export function PendingOrderActions({ order }: { order: { id: string; number: number; status: OrderStatus; paymentStatus: PaymentStatus; firstName: string; phone: string | null; total: number } }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error ?? "Error");
      else router.refresh();
    });
  }

  const wa = whatsappTo(order.phone, orderWhatsappMessage(order));
  const btn = "btn-outline btn-sm gap-1.5";
  return (
    <div className="flex items-center gap-1.5">
      {order.status === "PENDING" && (
        <button type="button" disabled={pending} onClick={() => run(() => markOrderPaid({ id: order.id }))} className={btn} title="Marcar como pagado">
          <CheckCircle2 className="size-4 text-success" /> <span className="hidden sm:inline">Pagado</span>
        </button>
      )}
      {order.status === "PAID" && (
        <button type="button" disabled={pending} onClick={() => run(() => updateOrderStatus({ id: order.id, status: "PROCESSING" }))} className={btn} title="Pasar a preparación">
          <PackageCheck className="size-4" /> <span className="hidden sm:inline">Preparar</span>
        </button>
      )}
      {order.status === "PROCESSING" && (
        <button type="button" disabled={pending} onClick={() => run(() => updateOrderStatus({ id: order.id, status: "SHIPPED" }))} className={btn} title="Marcar como enviado">
          <Truck className="size-4" /> <span className="hidden sm:inline">Enviado</span>
        </button>
      )}
      {wa && (
        <a href={wa} target="_blank" rel="noreferrer" className="btn-outline size-9 !p-0" title="WhatsApp">
          <MessageCircle className="size-4 text-success" />
        </a>
      )}
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
