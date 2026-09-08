"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { verifyOrderEmail } from "@/app/(site)/pedido/[id]/actions";

/** Formulario para desbloquear el detalle de un pedido ingresando el email del comprador. */
export function OrderEmailGate({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="card mx-auto max-w-md p-5 sm:p-6"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await verifyOrderEmail(orderId, email);
          if (r.ok) router.refresh();
          else setError(r.error);
        });
      }}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-lime text-ink">
          <Lock className="size-5" />
        </span>
        <div>
          <h2 className="text-lg leading-tight">Ver el detalle del pedido</h2>
          <p className="mt-1 text-[13px] text-ink-500">Para proteger tus datos, ingresa el email con que hiciste la compra.</p>
        </div>
      </div>
      <label htmlFor="gate-email" className="label mt-4">
        Email de la compra
      </label>
      <input
        id="gate-email"
        type="email"
        name="email"
        required
        autoComplete="email"
        inputMode="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="tu@email.cl"
        className="input"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "gate-error" : undefined}
      />
      {error ? (
        <p id="gate-error" role="alert" className="mt-2 text-[13px] font-medium text-danger">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={pending || !email} className="btn-primary btn-md mt-4 w-full">
        {pending ? <Loader2 className="size-4 animate-spin" /> : null} Ver mi pedido
      </button>
    </form>
  );
}
