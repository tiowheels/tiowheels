"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, Truck } from "lucide-react";
import type { OrderStatus } from "@/generated/prisma/enums";
import { cn, formatDateTime } from "@/lib/format";
import { CARRIERS, trackingUrl } from "@/lib/shipping";
import { markOrderShipped, type ActionResult } from "@/app/admin/(panel)/pedidos/actions";

type Props = { order: { id: string; status: OrderStatus; carrier: string | null; trackingCode: string | null; shippedAt: Date | null; email: string | null } };

/** Bloque "Envío" del detalle de pedido: courier + código de seguimiento + marcar como enviado. */
export function ShippingForm({ order }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [carrier, setCarrier] = useState(order.carrier ?? "Starken");
  const [code, setCode] = useState(order.trackingCode ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const closed = order.status === "CANCELLED" || order.status === "REFUNDED";
  const dirty = carrier !== (order.carrier ?? "Starken") || code.trim() !== (order.trackingCode ?? "");
  const track = trackingUrl(order.carrier, order.trackingCode);

  function submit() {
    setMsg(null);
    start(async () => {
      const r: ActionResult = await markOrderShipped({ id: order.id, carrier, trackingCode: code });
      setMsg(r.ok ? { ok: true, text: r.message ?? "Listo" } : { ok: false, text: r.error });
      if (r.ok) router.refresh();
    });
  }

  return (
    <section className="card space-y-3 p-4 print:hidden md:p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base">
          <Truck className="size-4" /> Envío
        </h2>
        {order.shippedAt ? <span className="text-xs text-ink-500">Enviado el {formatDateTime(order.shippedAt)}</span> : null}
      </div>

      {closed ? (
        <p className="text-sm text-ink-500">El pedido está cerrado; no se puede marcar como enviado.</p>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <div>
              <label htmlFor="carrier" className="label">
                Courier
              </label>
              <select id="carrier" value={carrier} disabled={pending} onChange={(e) => setCarrier(e.target.value)} className="input">
                {CARRIERS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="trackingCode" className="label">
                N° de seguimiento
              </label>
              <input id="trackingCode" value={code} disabled={pending} onChange={(e) => setCode(e.target.value)} placeholder="Ej: 123456789" maxLength={60} autoComplete="off" className="input font-mono" />
            </div>
          </div>
          <button type="submit" disabled={pending || (order.status === "SHIPPED" && !dirty)} className="btn-lime btn-md w-full">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Truck className="size-4" />}
            {order.status === "SHIPPED" || order.status === "COMPLETED" ? "Guardar seguimiento y avisar" : "Guardar y marcar como enviado"}
          </button>
          <p className="text-xs text-ink-500">{order.email ? `Se enviará un correo a ${order.email} con el código y el enlace de seguimiento.` : "El pedido no tiene email: avísale al cliente por WhatsApp."}</p>
        </form>
      )}

      {track ? (
        <a href={track} target="_blank" rel="noreferrer" className="btn-outline btn-sm">
          Ver seguimiento en {order.carrier} <ExternalLink className="size-3.5" />
        </a>
      ) : null}

      {msg && <p className={cn("rounded-xl px-4 py-2.5 text-sm font-medium", msg.ok ? "bg-success/10 text-success" : "bg-danger/10 text-danger")}>{msg.text}</p>}
    </section>
  );
}
