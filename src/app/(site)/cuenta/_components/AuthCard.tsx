import Link from "next/link";

/** Tarjeta centrada con logo para ingresar / registro / recuperar. */
export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="bg-ink-50/60">
      <div className="container-x flex min-h-[70vh] flex-col items-center justify-center py-10 md:py-16">
        <Link href="/" className="mb-6" aria-label="Tío Wheels, inicio">
          <img src="/brand/logo.png" alt="Tío Wheels Toys" className="h-12 w-auto" />
        </Link>
        <div className="card w-full max-w-md p-6 sm:p-8">
          <h1 className="text-2xl">{title}</h1>
          {subtitle ? <p className="mt-1.5 text-sm text-ink-500">{subtitle}</p> : null}
          <div className="mt-6">{children}</div>
        </div>
        {footer ? <div className="mt-5 text-center text-sm text-ink-500">{footer}</div> : null}
      </div>
    </div>
  );
}
