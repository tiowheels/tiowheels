"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Minus, Plus, Trash2, Loader2, Save, X } from "lucide-react";
import { REGIONS } from "@/lib/chile";
import { formatCLP } from "@/lib/format";
import { updateOrderItems, updateOrderCustomer } from "@/app/admin/(panel)/pedidos/actions";

type Item = { id: string; name: string; price: number; quantity: number };

/** Editar cantidades o quitar autos del pedido. El stock se ajusta solo. */
export function OrderItemsEditor({ orderId, items, cancelled }: { orderId: string; items: Item[]; cancelled: boolean }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [cant, setCant] = useState<Record<string, number>>(() => Object.fromEntries(items.map((i) => [i.id, i.quantity])));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className="btn-outline btn-sm">
        <Pencil className="size-3.5" /> Editar cantidades
      </button>
    );
  }

  const total = items.reduce((a, i) => a + i.price * (cant[i.id] ?? 0), 0);
  const guardar = () =>
    start(async () => {
      setError(null);
      const r = await updateOrderItems({ id: orderId, items: items.map((i) => ({ id: i.id, quantity: cant[i.id] ?? 0 })) });
      if (!r.ok) return setError(r.error);
      setAbierto(false);
      router.refresh();
    });

  return (
    <div className="w-full space-y-2 rounded-xl border border-ink-200 bg-ink-50/60 p-3">
      <div className="text-sm font-bold">Editar cantidades</div>
      {items.map((i) => {
        const q = cant[i.id] ?? 0;
        return (
          <div key={i.id} className="flex items-center gap-2">
            <span className={`min-w-0 flex-1 truncate text-sm ${q === 0 ? "text-ink-400 line-through" : ""}`}>{i.name}</span>
            <button type="button" aria-label="Menos" onClick={() => setCant((c) => ({ ...c, [i.id]: Math.max(0, q - 1) }))} className="btn-outline size-9 !p-0">
              <Minus className="size-4" />
            </button>
            <span className="w-7 text-center text-sm font-bold tabular-nums">{q}</span>
            <button type="button" aria-label="Más" onClick={() => setCant((c) => ({ ...c, [i.id]: q + 1 }))} className="btn-outline size-9 !p-0">
              <Plus className="size-4" />
            </button>
            <button type="button" aria-label="Quitar" onClick={() => setCant((c) => ({ ...c, [i.id]: 0 }))} className="flex size-9 items-center justify-center rounded-lg text-danger hover:bg-danger/10">
              <Trash2 className="size-4" />
            </button>
          </div>
        );
      })}
      <p className="text-xs text-ink-500">
        Nuevo subtotal: <b className="text-ink">{formatCLP(total)}</b>. {cancelled ? "El pedido está cancelado, así que el stock no se toca." : "Lo que quites vuelve al stock y lo que agregues se descuenta."}
      </p>
      {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={guardar} disabled={pending} className="btn-primary btn-sm">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Guardar
        </button>
        <button type="button" onClick={() => setAbierto(false)} className="btn-ghost btn-sm">
          <X className="size-4" /> Cancelar
        </button>
      </div>
    </div>
  );
}

export type OrderCustomerData = {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  rut: string | null;
  address1: string | null;
  address2: string | null;
  commune: string | null;
  region: string | null;
  shippingMethod: "DELIVERY_COD" | "PICKUP" | "NONE";
};

/** Corregir nombre, contacto y dirección guardados en el pedido. */
export function OrderCustomerEditor({ order }: { order: OrderCustomerData }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [region, setRegion] = useState(order.region ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const comunas = REGIONS.find((r) => r.code === region)?.comunas ?? [];

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className="btn-outline btn-sm mt-3 w-full">
        <Pencil className="size-3.5" /> Editar cliente y entrega
      </button>
    );
  }

  return (
    <form
      className="mt-3 space-y-2 rounded-xl border border-ink-200 bg-ink-50/60 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          setError(null);
          const r = await updateOrderCustomer(fd);
          if (!r.ok) return setError(r.error);
          setAbierto(false);
          router.refresh();
        });
      }}
    >
      <input type="hidden" name="id" value={order.id} />
      <div className="grid grid-cols-2 gap-2">
        <input name="firstName" defaultValue={order.firstName} placeholder="Nombre" required className="input" />
        <input name="lastName" defaultValue={order.lastName ?? ""} placeholder="Apellido" className="input" />
        <input name="phone" type="tel" defaultValue={order.phone ?? ""} placeholder="Teléfono" className="input" />
        <input name="rut" defaultValue={order.rut ?? ""} placeholder="RUT" className="input" />
      </div>
      <input name="email" type="email" defaultValue={order.email ?? ""} placeholder="Correo" className="input" />
      <select name="shippingMethod" defaultValue={order.shippingMethod} className="input" aria-label="Tipo de entrega">
        <option value="DELIVERY_COD">Envío por pagar</option>
        <option value="PICKUP">Retiro</option>
        <option value="NONE">Entregado en mano</option>
      </select>
      <div className="grid grid-cols-2 gap-2">
        <input name="address1" defaultValue={order.address1 ?? ""} placeholder="Dirección" className="input" />
        <input name="address2" defaultValue={order.address2 ?? ""} placeholder="Depto, casa" className="input" />
        <select name="region" value={region} onChange={(e) => setRegion(e.target.value)} className="input" aria-label="Región">
          <option value="">Región</option>
          {REGIONS.map((r) => (
            <option key={r.code} value={r.code}>
              {r.name}
            </option>
          ))}
        </select>
        {comunas.length ? (
          <select name="commune" defaultValue={order.commune ?? ""} className="input" aria-label="Comuna">
            <option value="">Comuna</option>
            {order.commune && !comunas.includes(order.commune) && <option value={order.commune}>{order.commune}</option>}
            {comunas.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        ) : (
          <input name="commune" defaultValue={order.commune ?? ""} placeholder="Comuna" className="input" />
        )}
      </div>
      {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn-primary btn-sm">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Guardar
        </button>
        <button type="button" onClick={() => setAbierto(false)} className="btn-ghost btn-sm">
          <X className="size-4" /> Cancelar
        </button>
      </div>
    </form>
  );
}
