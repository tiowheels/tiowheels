import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminShell } from "@/components/admin/AdminShell";
import { logout } from "./actions";

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  const unreadMessages = await db.contactMessage.count({ where: { read: false } }).catch(() => 0);
  return (
    <AdminShell userName={user.name ? `${user.name} · ${user.email}` : user.email} logout={logout} unreadMessages={unreadMessages}>
      {children}
    </AdminShell>
  );
}
