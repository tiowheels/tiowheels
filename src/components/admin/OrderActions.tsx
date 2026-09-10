"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Ban, Printer, MessageCircle, Save, Loader2, Mail, Trash2 } from "lucide-react";
import type { OrderStatus, PaymentStatus } from "@/generated/prisma/enums";
import { cn } from "@/lib/format";
import { updateOrderStatus, markOrderPaid, cancelOrder, deleteOrder, saveAdminNote, type ActionResult } from "@/app/admin/(panel)/pedidos/actions";
import { ORDER_STATUS, ORDER_STATUS_LIST, whatsappTo, orderWhatsappMessage } from "./labels";

type OrderLite = { id: string; number: number; status: OrderStatus; paymentStatus: PaymentStatus; firstName: string; phone: string | null; email: string | null; total: number; adminNote: string | null; carrier?: string | null; trackingCode?: string | null };

export function OrderActions({ order }: { order: OrderLite }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [note, setNote] = useState(order.adminNote ?? "");
  const [prevNote, setPrevNote] = useState(order.adminNote);
  if (prevNote !== order.adminNote) {
    setPrevNote(order.adminNote);
    setNote(order.adminNote ?? "");
  }
  const [status, setStatus] = useState<OrderStatus>(order.status);

  function run(fn: () => Promise<ActionResult>, irA?: string) {
    setMsg(null);
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? { ok: true, text: r.message ?? "Listo" } : { ok: false, text: r.error });
      if (!r.ok) return;
      if (irA) router.push(irA);
      router.refresh();
    });
  }

  const wa = whatsappTo(order.phone, orderWhatsappMessage({ ...order, status }));
  const closed = order.status === "CANCELLED" || order.status === "REFUNDED";

  return (
    <div className="card space-y-4 p-4 print:hidden md:p-5">
      <h2 className="text-base">Acciones</h2>

      <div>
        <label htmlFor="status" className="label">
          Estado del pedido
        </label>
        <div className="flex gap-2">
          <select
            id="status"
            value={status}
            disabled={pending}
            onChange={(e) => {
              const next = e.target.value as OrderStatus;
              setStatus(next);
              if (next === "CANCELLED") {
                if (!confirm("¿Cancelar el pedido y reponer el stock de sus productos?")) {
                  setStatus(order.status);
                  return;
                }
              }
              run(() => updateOrderStatus({ id: order.id, status: next }));
            }}
            className="input flex-1"
          >
            {ORDER_STATUS_LIST.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS[s].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {order.paymentStatus !== "PAID" && !closed && (
          <button type="button" disabled={pending} onClick={() => run(() => markOrderPaid({ id: order.id }))} className="btn-lime btn-md justify-start">
            <CheckCircle2 className="size-4" /> Marcar como pagado
          </button>
        )}
        {order.status !== "CANCELLED" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (confirm("¿Cancelar el pedido y reponer el stock?")) run(() => cancelOrder({ id: order.id, restock: true }));
            }}
            className="btn-outline btn-md justify-start text-danger hover:border-danger"
          >
            <Ban className="size-4" /> Cancelar y reponer stock
          </button>
        )}
        {wa && (
          <a href={wa} target="_blank" rel="noreferrer" className="btn-outline btn-md justify-start">
            <MessageCircle className="size-4 text-success" /> WhatsApp al cliente
          </a>
        )}
        {order.email && (
          <a href={`mailto:${order.email}?subject=${encodeURIComponent(`Tu pedido #${order.number} en Tío Wheels`)}`} className="btn-outline btn-md justify-start">
            <Mail className="size-4" /> Correo al cliente
          </a>
        )}
        <button type="button" onClick={() => window.print()} className="btn-outline btn-md justify-start">
          <Printer className="size-4" /> Imprimir
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            const repone = order.status !== "CANCELLED" && order.status !== "REFUNDED";
            const aviso = `¿Eliminar el pedido #${order.number} del historial? Esto no se puede deshacer.${repone ? " Se repondrá el stock de sus productos." : ""}\n\nSi fue una venta real, es mejor cancelarlo en vez de borrarlo.`;
            if (confirm(aviso)) run(() => deleteOrder({ id: order.id, restock: true }), "/admin/pedidos");
          }}
          className="btn-ghost btn-md justify-start text-danger hover:bg-danger/10"
        >
          <Trash2 className="size-4" /> Eliminar pedido
        </button>
      </div>

      <div>
        <label htmlFor="adminNote" className="label">
          Nota interna
        </label>
        <textarea id="adminNote" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Solo la ves tú. Ej: pagó por transferencia el 12/05, retira el sábado…" className="input h-auto min-h-20 resize-y py-2.5" />
        <button type="button" disabled={pending || note === (order.adminNote ?? "")} onClick={() => run(() => saveAdminNote({ id: order.id, note }))} className="btn-primary btn-sm mt-2">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Guardar nota
        </button>
      </div>

      {msg && <p className={cn("rounded-xl px-4 py-2.5 text-sm font-medium", msg.ok ? "bg-success/10 text-success" : "bg-danger/10 text-danger")}>{msg.text}</p>}
    </div>
  );
}
