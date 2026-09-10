import { CartProvider } from "@/components/cart/CartProvider";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ChatBot } from "@/components/site/ChatBot";
import { getCategoryTree } from "@/lib/catalog";
import { getCurrentUser } from "@/lib/auth";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [tree, user] = await Promise.all([getCategoryTree(), getCurrentUser()]);
  const categories = tree
    .filter((c) => c.count > 0)
    .map((c) => ({ slug: c.slug, name: c.name, count: c.count, children: c.children.map((k) => ({ slug: k.slug, name: k.name, count: k.count })) }));
  return (
    <CartProvider>
      <div className="flex min-h-dvh flex-col overflow-x-clip">
        <Header categories={categories} user={user ? { name: user.name, role: user.role } : null} />
        <main className="flex-1">{children}</main>
        <Footer categories={categories} />
      </div>
      <CartDrawer />
      <ChatBot />
    </CartProvider>
  );
}
