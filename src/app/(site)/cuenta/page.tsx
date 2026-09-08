import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCLP, formatDate, pluralize } from "@/lib/format";
import { ORDER_STATUS, PAYMENT_METHOD_LABEL } from "@/lib/order-status";
import { AccountShell } from "./_components/AccountShell";

export const metadata: Metadata = { title: "Mis pedidos", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requireUser("/cuenta");
  // Pedidos propios + pedidos legados con el mismo email (cuentas migradas, protegidas por el flujo de recuperación).
  const orders = await db.order.findMany({
    where: { OR: [{ userId: user.id }, { email: user.email, channel: { in: ["LEGACY_WEB", "LEGACY_APP"] } }] },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { items: { select: { id: true, name: true, quantity: true }, take: 3 }, _count: { select: { items: true } } },
  });

  return (
    <AccountShell current="/cuenta" user={{ name: user.name, email: user.email }}>
      <div className="mb-4 flex items-end justify-between gap-3">
        <h2 className="text-xl">Mis pedidos</h2>
        <span className="text-sm text-ink-500">
          {orders.length} {pluralize(orders.length, "pedido", "pedidos")}
        </span>
      </div>

      {orders.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-ink-50">
            <ShoppingBag className="size-7 text-ink-400" />
          </span>
          <p className="font-semibold">Aún no tienes pedidos</p>
          <p className="max-w-sm text-sm text-ink-500">Cuando compres, aquí verás el estado de cada pedido y podrás revisar su detalle.</p>
          <Link href="/tienda" className="btn-primary btn-md mt-2">
            Ir a la tienda <ArrowRight className="size-4" />
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => {
            const st = ORDER_STATUS[o.status];
            const names = o.items.map((i) => (i.quantity > 1 ? `${i.quantity}× ${i.name}` : i.name)).join(" · ");
            const more = o._count.items - o.items.length;
            return (
              <li key={o.id}>
                <Link href={`/pedido/${o.id}`} className="card flex flex-col gap-3 p-4 transition hover:shadow-pop sm:flex-row sm:items-center sm:gap-5 sm:p-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-extrabold">Pedido #{o.number}</span>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </div>
                    <div className="mt-1 text-[13px] text-ink-500">
                      {formatDate(o.createdAt)} · {PAYMENT_METHOD_LABEL[o.paymentMethod]}
                    </div>
                    <p className="mt-1.5 line-clamp-1 text-[13px] text-ink-700">
                      {names}
                      {more > 0 ? ` · +${more} más` : ""}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:gap-1">
                    <span className="text-lg font-extrabold tabular-nums">{formatCLP(o.total)}</span>
                    <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-ink-500">
                      Ver detalle <ArrowRight className="size-4" />
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AccountShell>
  );
}
