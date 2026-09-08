import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = { title: "Ingresar al panel" };

export default function AdminLoginPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <img src="/brand/logo.png" alt="Tío Wheels" className="h-14 w-auto" />
          <span className="eyebrow">Panel de administración</span>
          <h1 className="text-2xl">Hola, Tío</h1>
          <p className="text-sm text-ink-500">Ingresa para registrar ventas, revisar pedidos y administrar el catálogo.</p>
        </div>
        <div className="card p-6">
          <LoginForm />
        </div>
        <p className="mt-6 text-center text-xs text-ink-400">
          <Link href="/" className="underline-offset-2 hover:underline">
            ← Volver a la tienda
          </Link>
        </p>
      </div>
    </div>
  );
}
