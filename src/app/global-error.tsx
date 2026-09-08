"use client";

import "./globals.css";

/** Error del layout raíz: debe renderizar <html> y <body> por su cuenta. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es-CL">
      <body className="min-h-dvh font-sans" style={{ fontFamily: "Montserrat, ui-sans-serif, system-ui, sans-serif" }}>
        <main className="container-x flex min-h-dvh flex-col items-center justify-center py-16 text-center">
          <img src="/brand/logo.png" alt="Tío Wheels" className="h-10 w-auto" />
          <h1 className="mt-8 text-3xl sm:text-4xl">Algo salió mal</h1>
          <p className="mt-3 max-w-md text-ink-500">No pudimos cargar el sitio. Intenta de nuevo; si el problema continúa, vuelve en unos minutos.</p>
          {error.digest ? <p className="mt-2 text-xs text-ink-400">Código: {error.digest}</p> : null}
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={reset} className="btn-lime btn-md">
              Reintentar
            </button>
            {/* Sin <Link>: tras un error del layout raíz conviene recargar el sitio completo. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" className="btn-outline btn-md">
              Ir al inicio
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
