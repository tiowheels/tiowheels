import type { Metadata } from "next";
import Link from "next/link";
import { Search, MessageCircle } from "lucide-react";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { formatCLP, formatDate } from "@/lib/format";
import { whatsappTo } from "@/components/admin/labels";
import { PageHeader, EmptyState } from "@/components/admin/PageHeader";
import { Pagination } from "@/components/admin/Pagination";
import { FilterForm } from "@/components/admin/FilterForm";

export const metadata: Metadata = { title: "Clientes" };
export const dynamic = "force-dynamic";

const PER_PAGE = 40;
type Row = { id: string; name: string | null; lastName: string | null; email: string; phone: string | null; createdAt: Date; orders: number; spent: number; last: Date | null };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim() ?? "";
  const orden = (Array.isArray(sp.orden) ? sp.orden[0] : sp.orden) || "gasto";
  const page = Math.max(1, parseInt((Array.isArray(sp.page) ? sp.page[0] : sp.page) || "1", 10) || 1);

  const like = `%${q}%`;
  const digits = q.replace(/\D/g, "");
  const where = q
    ? Prisma.sql`u."role" = 'CUSTOMER' AND (u."name" ILIKE ${like} OR u."lastName" ILIKE ${like} OR (u."name" || ' ' || coalesce(u."lastName", '')) ILIKE ${like} OR u."email" ILIKE ${like} ${digits.length >= 4 ? Prisma.sql`OR regexp_replace(coalesce(u."phone",''), '\\D', '', 'g') LIKE ${"%" + digits + "%"}` : Prisma.empty})`
    : Prisma.sql`u."role" = 'CUSTOMER'`;
  const order = orden === "reciente" ? Prisma.sql`u."createdAt" DESC` : orden === "nombre" ? Prisma.sql`u."name" ASC NULLS LAST, u."lastName" ASC` : orden === "pedidos" ? Prisma.sql`s.orders DESC, s.spent DESC` : Prisma.sql`s.spent DESC, s.orders DESC`;

  const [rows, countRow] = await Promise.all([
    db.$queryRaw<Row[]>`
      SELECT u."id", u."name", u."lastName", u."email", u."phone", u."createdAt",
             s.orders::int AS orders, s.spent::int AS spent, s.last
      FROM "User" u
      LEFT JOIN LATERAL (
        SELECT count(*) AS orders, coalesce(sum(o.total), 0) AS spent, max(o."createdAt") AS last
        FROM "Order" o
        WHERE (o."userId" = u."id" OR lower(o."email") = lower(u."email")) AND o.status NOT IN ('CANCELLED', 'REFUNDED')
      ) s ON true
      WHERE ${where}
      ORDER BY ${order}
      LIMIT ${PER_PAGE} OFFSET ${(page - 1) * PER_PAGE}`,
    db.$queryRaw<{ n: bigint }[]>`SELECT count(*)::bigint AS n FROM "User" u WHERE ${where}`,
  ]);
  const total = Number(countRow[0]?.n ?? 0);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <>
      <PageHeader title="Clientes" description={`${total.toLocaleString("es-CL")} ${total === 1 ? "cliente" : "clientes"} registrados`} />
      <FilterForm action="/admin/clientes" className="card mb-4 grid gap-2 p-3 sm:grid-cols-[1fr_auto]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
          <input type="search" name="q" defaultValue={q} enterKeyHint="search" placeholder="Nombre, correo o teléfono" className="input pl-10" />
        </label>
        <select name="orden" defaultValue={orden} className="input sm:w-48" aria-label="Orden">
          <option value="gasto">Mayor gasto</option>
          <option value="pedidos">Más pedidos</option>
          <option value="reciente">Más recientes</option>
          <option value="nombre">Nombre A–Z</option>
        </select>
      </FilterForm>

      {rows.length === 0 ? (
        <EmptyState title="Sin clientes" text={q ? "No encontramos clientes con esa búsqueda." : "Los clientes se crean al registrarse en la tienda o al comprar."} />
      ) : (
        <>
          <ul className="space-y-2 md:hidden">
            {rows.map((c) => {
              const wa = whatsappTo(c.phone, `Hola ${c.name ?? ""}, te escribimos de Tío Wheels.`);
              return (
                <li key={c.id} className="card flex items-center gap-3 p-4">
                  <Link href={`/admin/clientes/${c.id}`} className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{[c.name, c.lastName].filter(Boolean).join(" ") || c.email}</div>
                    <div className="truncate text-xs text-ink-500">{c.email}</div>
                    <div className="mt-1 text-xs text-ink-600">
                      {c.orders} {c.orders === 1 ? "pedido" : "pedidos"} · <span className="font-bold">{formatCLP(c.spent)}</span>
                    </div>
                  </Link>
                  {wa && (
                    <a href={wa} target="_blank" rel="noreferrer" className="btn-outline size-11 !p-0" aria-label="WhatsApp">
                      <MessageCircle className="size-5 text-success" />
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="card hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 text-left text-[11px] font-bold uppercase tracking-wider text-ink-500">
                <tr>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Contacto</th>
                  <th className="px-4 py-3 text-right">Pedidos</th>
                  <th className="px-4 py-3 text-right">Total gastado</th>
                  <th className="px-4 py-3">Último pedido</th>
                  <th className="px-4 py-3">Desde</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {rows.map((c) => (
                  <tr key={c.id} className="transition hover:bg-lime-50/60">
                    <td className="px-4 py-3">
                      <Link href={`/admin/clientes/${c.id}`} className="font-semibold hover:underline">
                        {[c.name, c.lastName].filter(Boolean).join(" ") || "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-600">
                      <div>{c.email}</div>
                      <div className="text-xs">{c.phone ?? ""}</div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{c.orders}</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums">{formatCLP(c.spent)}</td>
                    <td className="px-4 py-3 text-ink-600">{c.last ? formatDate(c.last) : "—"}</td>
                    <td className="px-4 py-3 text-ink-600">{formatDate(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pages={pages} total={total} perPage={PER_PAGE} basePath="/admin/clientes" params={{ q, orden }} />
        </>
      )}
    </>
  );
}
