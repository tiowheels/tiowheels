export const metadata = { title: "Sin conexión" };

export default function OfflinePage() {
  return (
    <main className="container-x flex min-h-dvh flex-col items-center justify-center text-center">
      <img src="/brand/logo.png" alt="Tío Wheels" className="mb-8 w-48" />
      <h1 className="text-2xl">Estás sin conexión</h1>
      <p className="mt-2 max-w-sm text-ink-500">Revisa tu internet y vuelve a intentarlo. El catálogo estará esperándote.</p>
    </main>
  );
}
