import type { Metadata } from "next";
import Link from "next/link";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { cn } from "@/lib/format";
import { PageHeader, EmptyState } from "@/components/admin/PageHeader";
import { Pagination } from "@/components/admin/Pagination";
import { MessageList, MarkAllReadButton } from "@/components/admin/MessageList";

export const metadata: Metadata = { title: "Mensajes" };
export const dynamic = "force-dynamic";

const PER_PAGE = 30;
type SP = Record<string, string | string[] | undefined>;
const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function MessagesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const filtro = str(sp.filtro); // "" | "no-leidos"
  const page = Math.max(1, parseInt(str(sp.page) || "1", 10) || 1);

  const where: Prisma.ContactMessageWhereInput = filtro === "no-leidos" ? { read: false } : {};
  const [messages, total, unread] = await Promise.all([
    db.contactMessage.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
    db.contactMessage.count({ where }),
    db.contactMessage.count({ where: { read: false } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <>
      <PageHeader title="Mensajes" description={unread > 0 ? `${unread} ${unread === 1 ? "mensaje sin leer" : "mensajes sin leer"} · ${total.toLocaleString("es-CL")} en total` : `${total.toLocaleString("es-CL")} ${total === 1 ? "mensaje" : "mensajes"} · todo leído`}>
        {unread > 0 && <MarkAllReadButton />}
      </PageHeader>

      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/admin/mensajes" className={cn("chip", !filtro && "chip-active")}>
          Todos
        </Link>
        <Link href="/admin/mensajes?filtro=no-leidos" className={cn("chip", filtro === "no-leidos" && "chip-active")}>
          Sin leer{unread > 0 ? ` (${unread})` : ""}
        </Link>
      </div>

      {messages.length === 0 ? (
        <EmptyState title={filtro === "no-leidos" ? "Sin mensajes por leer" : "Aún no hay mensajes"} text={filtro === "no-leidos" ? "Todo al día. Los mensajes nuevos del formulario de contacto aparecerán aquí." : "Los mensajes que envíen desde /contacto aparecerán aquí."}>
          {filtro && (
            <Link href="/admin/mensajes" className="btn-outline btn-md">
              Ver todos
            </Link>
          )}
        </EmptyState>
      ) : (
        <>
          <MessageList messages={messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }))} />
          <Pagination page={page} pages={pages} total={total} perPage={PER_PAGE} basePath="/admin/mensajes" params={{ filtro }} />
        </>
      )}
    </>
  );
}
