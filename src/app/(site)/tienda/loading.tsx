export default function ShopLoading() {
  return (
    <div className="pb-16" aria-busy="true" aria-label="Cargando tienda">
      <section className="border-b border-ink-100 bg-ink-50/70">
        <div className="container-x py-6 sm:py-8">
          <div className="mx-auto h-13 max-w-3xl animate-pulse rounded-full bg-white shadow-card sm:h-14" />
        </div>
      </section>
      <div className="container-x mt-6 grid gap-8 lg:mt-10 lg:grid-cols-[264px_minmax(0,1fr)] lg:gap-10">
        <aside className="hidden lg:block">
          <div className="space-y-6">
            {[7, 6, 4].map((n, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-20 animate-pulse rounded bg-ink-100" />
                {Array.from({ length: n }).map((_, j) => (
                  <div key={j} className="h-7 animate-pulse rounded-lg bg-ink-50" style={{ width: `${60 + ((j * 13) % 35)}%` }} />
                ))}
              </div>
            ))}
          </div>
        </aside>
        <section className="min-w-0">
          <div className="h-3 w-24 animate-pulse rounded bg-ink-100" />
          <div className="mt-3 h-9 w-56 animate-pulse rounded-lg bg-ink-100" />
          <div className="mt-3 h-4 w-32 animate-pulse rounded bg-ink-50" />
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="card overflow-hidden">
                <div className="aspect-[3/4] animate-pulse bg-ink-50" />
                <div className="space-y-2 p-4">
                  <div className="h-2.5 w-14 animate-pulse rounded bg-ink-100" />
                  <div className="h-4 w-4/5 animate-pulse rounded bg-ink-100" />
                  <div className="h-4 w-1/3 animate-pulse rounded bg-ink-100" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
