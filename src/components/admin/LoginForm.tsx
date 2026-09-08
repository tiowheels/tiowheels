"use client";

import { useActionState } from "react";
import { LogIn } from "lucide-react";
import { login } from "@/app/admin/(auth)/login/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="email" className="label">
          Correo
        </label>
        <input id="email" name="email" type="email" autoComplete="username" inputMode="email" required className="input" placeholder="admin@tiowheels.cl" />
      </div>
      <div>
        <label htmlFor="password" className="label">
          Contraseña
        </label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
      </div>
      {state?.error && (
        <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-lime btn-lg w-full">
        <LogIn className="size-5" />
        {pending ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}
