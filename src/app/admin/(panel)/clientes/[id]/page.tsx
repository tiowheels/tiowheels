import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle, Mail, Phone } from "lucide-react";
import { db } from "@/lib/db";
import { formatCLP, formatDate, formatDateTime, formatRut } from "@/lib/format";
import { regionName } from "@/lib/chile";
import { whatsappTo } from "@/components/admin/labels";
import { OrderStatusBadge, ChannelBadge } from "@/components/admin/StatusBadge";
import { PageHeader } from "@/components/admin/PageHeader";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const u = await db.user.findUnique({ where: { id }, select: { name: true, lastName: true, email: true } });
  return { title: u ? [u.name, u.lastName].filter(Boolean).join(" ") || u.email : "Cliente" };
}

export default async function CustomerDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const user = await db.user.findUnique({ where: { id } });
  if (!user) notFound();
  // Si venías de un pedido, el botón de atrás te devuelve a ese pedido
  const volverA = typeof sp.pedido === "string" && /^[a-z0-9]+$/i.test(sp.pedido) ? await db.order.findUnique({ where: { id: sp.pedido }, select: { id: true, number: true } }) : null;
  const orders = await db.order.findMany({
    where: { OR: [{ userId: user.id }, { email: { equals: user.email, mode: "insensitive" } }] },
    orderBy: { createdAt: "desc" },
    select: { id: true, number: true, total: true, status: true, channel: true, createdAt: true, _count: { select: { items: true } } },
  });
  const valid = orders.filter((o) => o.status !== "CANCELLED" && o.status !== "REFUNDED");
  const spent = valid.reduce((a, o) => a + o.total, 0);
  const fullName = [user.name, user.lastName].filter(Boolean).join(" ") || "Sin nombre";
  const wa = whatsappTo(user.phone, `Hola ${user.name ?? ""}, te escribimos de Tío Wheels.`);
  const address = [user.address1, user.address2, user.commune, user.city, regionName(user.region)].filter(Boolean).join(", ");

  return (
    <>
      <PageHeader back={volverA ? { href: `/admin/pedidos/${volverA.id}${typeof sp.volver === "string" ? `?volver=${encodeURIComponent(sp.volver)}` : ""}`, label: `Pedido #${volverA.number}` } : { href: "/admin/clientes", label: "Clientes" }} title={fullName} description={`Cliente desde ${formatDate(user.createdAt)}${user.legacyId ? ` · Woo #${user.legacyId}` : ""}`}>
        {wa && (
          <a href={wa} target="_blank" rel="noreferrer" className="btn-lime btn-md">
            <MessageCircle className="size-4" /> WhatsApp
          </a>
        )}
        <a href={`mailto:${user.email}`} className="btn-outline btn-md">
          <Mail className="size-4" /> Correo
        </a>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card p-4 md:p-5">
          <h2 className="mb-3 text-base">Datos</h2>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-xs font-semibold text-ink-500">Correo</dt>
              <dd className="break-all">{user.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-ink-500">Teléfono</dt>
              <dd>
                {user.phone ? (
                  <a href={`tel:${user.phone}`} className="inline-flex items-center gap-1 hover:underline">
                    <Phone className="size-3.5" /> {user.phone}
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-ink-500">RUT</dt>
              <dd>{user.rut ? formatRut(user.rut) : "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-ink-500">Dirección</dt>
              <dd>{address || "—"}</dd>
            </div>
          </dl>
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-ink-100 pt-4">
            <div>
              <div className="text-xs font-semibold text-ink-500">Pedidos</div>
              <div className="text-2xl font-black tabular-nums">{valid.length}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-ink-500">Total gastado</div>
              <div className="text-2xl font-black tabular-nums">{formatCLP(spent)}</div>
            </div>
          </div>
        </section>

        <section className="card overflow-hidden lg:col-span-2">
          <div className="border-b border-ink-100 px-4 py-3">
            <h2 className="text-base">Pedidos</h2>
          </div>
          {orders.length === 0 ? (
            <p className="p-8 text-center text-sm text-ink-500">Este cliente aún no tiene pedidos.</p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {orders.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/pedidos/${o.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-lime-50/60">
                    <span className="w-16 shrink-0 font-black tabular-nums">#{o.number}</span>
                    <span className="min-w-0 flex-1 text-sm text-ink-600">
                      {formatDateTime(o.createdAt)} · {o._count.items} {o._count.items === 1 ? "ítem" : "ítems"}
                    </span>
                    <ChannelBadge channel={o.channel} className="hidden sm:inline-flex" />
                    <OrderStatusBadge status={o.status} />
                    <span className="w-20 shrink-0 text-right text-sm font-bold tabular-nums">{formatCLP(o.total)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
