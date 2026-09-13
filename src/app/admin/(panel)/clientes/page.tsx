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
import { CreateCustomerButton } from "@/components/admin/CustomerForm";

export const metadata: Metadata = { title: "Clientes" };
export const dynamic = "force-dynamic";

const PER_PAGE = 40;
type Row = { id: string | null; name: string | null; lastName: string | null; email: string; phone: string | null; createdAt: Date; orders: number; spent: number; last: Date | null };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim() ?? "";
  const orden = (Array.isArray(sp.orden) ? sp.orden[0] : sp.orden) || "gasto";
  const page = Math.max(1, parseInt((Array.isArray(sp.page) ? sp.page[0] : sp.page) || "1", 10) || 1);

  const like = `%${q}%`;
  const digits = q.replace(/\D/g, "");

  // Personas = clientes con ficha + quienes compraron sin registrarse (agrupados por correo)
  const personas = Prisma.sql`
    SELECT u."id", u."name", u."lastName", lower(u."email") AS email, u."phone", u."createdAt"
      FROM "User" u
     WHERE u."role" = 'CUSTOMER'
    UNION ALL
    SELECT * FROM (
      SELECT DISTINCT ON (lower(o."email"))
             NULL::text AS "id", o."firstName" AS "name", o."lastName", lower(o."email") AS email, o."phone", o."createdAt"
        FROM "Order" o
       WHERE o."email" IS NOT NULL AND o."email" <> ''
         AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE lower(u2."email") = lower(o."email"))
       ORDER BY lower(o."email"), o."createdAt" DESC
    ) invitados`;

  const filtro = q
    ? Prisma.sql`AND (p."name" ILIKE ${like} OR p."lastName" ILIKE ${like} OR (coalesce(p."name",'') || ' ' || coalesce(p."lastName", '')) ILIKE ${like} OR p."email" ILIKE ${like} ${digits.length >= 4 ? Prisma.sql`OR regexp_replace(coalesce(p."phone",''), '\\D', '', 'g') LIKE ${"%" + digits + "%"}` : Prisma.empty})`
    : Prisma.empty;
  const order = orden === "reciente" ? Prisma.sql`p."createdAt" DESC` : orden === "nombre" ? Prisma.sql`p."name" ASC NULLS LAST, p."lastName" ASC` : orden === "pedidos" ? Prisma.sql`s.orders DESC, s.spent DESC` : Prisma.sql`s.spent DESC, s.orders DESC`;

  const [rows, countRow] = await Promise.all([
    db.$queryRaw<Row[]>`
      WITH p AS (${personas})
      SELECT p."id", p."name", p."lastName", p."email", p."phone", p."createdAt",
             s.orders::int AS orders, s.spent::int AS spent, s.last
      FROM p
      LEFT JOIN LATERAL (
        SELECT count(*) AS orders, coalesce(sum(o.total), 0) AS spent, max(o."createdAt") AS last
        FROM "Order" o
        WHERE lower(coalesce(o."email", '')) = p."email" AND o.status NOT IN ('CANCELLED', 'REFUNDED')
      ) s ON true
      WHERE TRUE ${filtro}
      ORDER BY ${order}
      LIMIT ${PER_PAGE} OFFSET ${(page - 1) * PER_PAGE}`,
    db.$queryRaw<{ n: bigint }[]>`WITH p AS (${personas}) SELECT count(*)::bigint AS n FROM p WHERE TRUE ${filtro}`,
  ]);
  const total = Number(countRow[0]?.n ?? 0);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <>
      <PageHeader title="Clientes" description={`${total.toLocaleString("es-CL")} ${total === 1 ? "persona" : "personas"}${q ? " con esa búsqueda" : " entre clientes con ficha y compradores sin registrarse"}`} />
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
                <li key={c.email} className="card flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    {c.id ? (
                      <Link href={`/admin/clientes/${c.id}`} className="block min-w-0">
                        <div className="truncate text-sm font-semibold">{[c.name, c.lastName].filter(Boolean).join(" ") || c.email}</div>
                        <div className="truncate text-xs text-ink-500">{c.email}</div>
                      </Link>
                    ) : (
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">
                          {[c.name, c.lastName].filter(Boolean).join(" ") || c.email} <span className="ml-1 rounded bg-ink-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-ink-600">Sin ficha</span>
                        </div>
                        <div className="truncate text-xs text-ink-500">{c.email}</div>
                      </div>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-600">
                      <span>
                        {c.orders} {c.orders === 1 ? "pedido" : "pedidos"} · <span className="font-bold">{formatCLP(c.spent)}</span>
                      </span>
                      {!c.id && <CreateCustomerButton email={c.email} />}
                    </div>
                  </div>
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
                  <tr key={c.email} className="transition hover:bg-lime-50/60">
                    <td className="px-4 py-3">
                      {c.id ? (
                        <Link href={`/admin/clientes/${c.id}`} className="font-semibold hover:underline">
                          {[c.name, c.lastName].filter(Boolean).join(" ") || "—"}
                        </Link>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{[c.name, c.lastName].filter(Boolean).join(" ") || "—"}</span>
                          <span className="rounded bg-ink-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-ink-600">Sin ficha</span>
                          <CreateCustomerButton email={c.email} />
                        </div>
                      )}
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
