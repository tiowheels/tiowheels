"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Plus, Minus, Trash2, X, CheckCircle2, Loader2, User, Banknote, Landmark, CreditCard, MoreHorizontal, MessageCircle, Zap, Package } from "lucide-react";
import { cn, formatCLP } from "@/lib/format";
import { registerManualSale, type ManualSaleResult } from "@/app/admin/(panel)/venta-rapida/actions";
import { whatsappTo } from "./labels";
import { REGIONS } from "@/lib/chile";

type SearchProduct = { id: string; name: string; price: number; compareAtPrice: number | null; stock: number; brand: string | null; status: string; image: string };
type Line = { key: string; productId: string; name: string; image: string; listPrice: number; price: number; quantity: number; stock: number };
type Customer = { name: string; phone: string; email: string; rut: string; address1: string; region: string; city: string; save: boolean };
type CustomerHit = { id: string; name: string | null; lastName: string | null; email: string; phone: string | null };
type PaymentMethod = "CASH" | "TRANSFER" | "CARD_POS" | "OTHER";

type Draft = { items: Line[]; customer: Customer; paymentMethod: PaymentMethod; shippingMethod: "NONE" | "PICKUP" | "DELIVERY_COD"; note: string; discount: number };

const STORAGE_KEY = "tw-admin-ticket-v1";
const EMPTY: Draft = { items: [], customer: { name: "", phone: "", email: "", rut: "", address1: "", region: "", city: "", save: false }, paymentMethod: "CASH", shippingMethod: "NONE", note: "", discount: 0 };

const PAYMENTS: { value: PaymentMethod; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "CASH", label: "Efectivo", icon: Banknote },
  { value: "TRANSFER", label: "Transferencia", icon: Landmark },
  { value: "CARD_POS", label: "Tarjeta / Webpay", icon: CreditCard },
  { value: "OTHER", label: "Otro", icon: MoreHorizontal },
];

function parseInt0(v: string) {
  const n = parseInt(v.replace(/\D/g, "") || "0", 10);
  return Number.isFinite(n) ? n : 0;
}

export function QuickSale() {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchProduct[]>([]);
  const [showAll, setShowAll] = useState(true); // se buscan también los agotados; el stock igual se valida al registrar
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [customerHits, setCustomerHits] = useState<CustomerHit[]>([]);
  const [clienteNuevo, setClienteNuevo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<Extract<ManualSaleResult, { ok: true }> | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const searchRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [successPhone, setSuccessPhone] = useState("");
  const router = useRouter();

  /* --- persistencia del ticket en curso --- */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<Draft>;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- sincronización con estado externo (hidratación/DOM)
        setDraft({ ...EMPTY, ...saved, customer: { ...EMPTY.customer, ...(saved.customer ?? {}) }, items: Array.isArray(saved.items) ? saved.items : [] });
        if (saved.customer && (saved.customer.name || saved.customer.phone || saved.customer.email)) setCustomerOpen(true);
      }
    } catch {
      /* ignorar */
    }
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    try {
      if (draft.items.length === 0 && !draft.customer.name && !draft.note) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      /* ignorar */
    }
  }, [draft, hydrated]);

  const update = useCallback((patch: Partial<Draft> | ((d: Draft) => Draft)) => {
    setDraft((d) => (typeof patch === "function" ? patch(d) : { ...d, ...patch }));
  }, []);

  /* --- búsqueda de productos --- */
  useEffect(() => {
    if (!open) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/admin/api/products?q=${encodeURIComponent(query)}${showAll ? "&all=1" : ""}`, { signal: ctrl.signal, cache: "no-store" });
        if (res.status === 401) {
          router.push("/admin/login");
          return;
        }
        const json = (await res.json()) as { products: SearchProduct[] };
        setResults(json.products ?? []);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setResults([]);
      } finally {
        if (!ctrl.signal.aborted) setSearching(false);
      }
    }, query ? 180 : 0);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, showAll, open, router]);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 1600);
  }

  function addProduct(p: SearchProduct) {
    if (p.stock <= 0) {
      showToast("Sin stock: igual se agregó, revisa antes de registrar");
    }
    update((d) => {
      const existing = d.items.find((l) => l.productId === p.id && l.price === p.price);
      if (existing) {
        return { ...d, items: d.items.map((l) => (l === existing ? { ...l, quantity: l.quantity + 1 } : l)) };
      }
      return { ...d, items: [...d.items, { key: `${p.id}-${Date.now()}`, productId: p.id, name: p.name, image: p.image, listPrice: p.price, price: p.price, quantity: 1, stock: p.stock }] };
    });
    showToast(`Agregado: ${p.name}`);
    setQuery("");
    setResults([]);
    searchRef.current?.focus();
  }

  function setLine(key: string, patch: Partial<Line>) {
    update((d) => ({ ...d, items: d.items.map((l) => (l.key === key ? { ...l, ...patch } : l)) }));
  }
  function removeLine(key: string) {
    update((d) => ({ ...d, items: d.items.filter((l) => l.key !== key) }));
  }

  /* --- clientes --- */
  const customerQuery = draft.customer.name.length >= 2 ? draft.customer.name : draft.customer.email.length >= 3 ? draft.customer.email : "";
  const visibleHits = customerOpen && customerQuery && !clienteNuevo ? customerHits : [];
  const comunas = useMemo(() => REGIONS.find((r) => r.code === draft.customer.region)?.comunas ?? [], [draft.customer.region]);
  const correoValido = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(draft.customer.email.trim());
  useEffect(() => {
    if (!customerOpen || !customerQuery) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/admin/api/products?type=customer&q=${encodeURIComponent(customerQuery)}`, { signal: ctrl.signal, cache: "no-store" });
        const json = (await res.json()) as { customers: CustomerHit[] };
        setCustomerHits(json.customers ?? []);
      } catch {
        /* ignorar */
      }
    }, 220);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [customerQuery, customerOpen]);

  function pickCustomer(c: CustomerHit) {
    update({ customer: { ...draft.customer, name: [c.name, c.lastName].filter(Boolean).join(" "), phone: c.phone ?? "", email: c.email, save: false } });
    setClienteNuevo(false);
    setCustomerHits([]);
  }

  /* --- totales --- */
  const subtotal = useMemo(() => draft.items.reduce((a, l) => a + l.price * l.quantity, 0), [draft.items]);
  const discount = Math.min(draft.discount || 0, subtotal);
  const total = subtotal - discount;
  const units = draft.items.reduce((a, l) => a + l.quantity, 0);
  const stockIssue = draft.items.find((l) => l.quantity > l.stock);

  function submit() {
    setError(null);
    if (draft.items.length === 0) {
      setError("Agrega al menos un producto al ticket.");
      return;
    }
    setSuccessPhone(draft.customer.phone);
    startTransition(async () => {
      const r = await registerManualSale({
        items: draft.items.map((l) => ({ productId: l.productId, quantity: l.quantity, price: l.price })),
        customer: draft.customer,
        paymentMethod: draft.paymentMethod,
        shippingMethod: draft.shippingMethod,
        note: draft.note,
        discount,
      });
      if (r.ok) {
        setSuccess(r);
        setDraft(EMPTY);
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* ignorar */
        }
      } else setError(r.error);
    });
  }

  function newSale() {
    setSuccess(null);
    setError(null);
    setCustomerOpen(false);
    setTimeout(() => searchRef.current?.focus(), 50);
  }

  /* ---------- pantalla de éxito ---------- */
  if (success) {
    const wa = successPhone ? whatsappTo(successPhone, `¡Gracias por tu compra en Tío Wheels! Tu venta quedó registrada con el N° ${success.number} por ${formatCLP(success.total)}.`) : null;
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-2 py-10 text-center">
        <span className="flex size-20 items-center justify-center rounded-full bg-lime text-ink shadow-pop">
          <CheckCircle2 className="size-11" strokeWidth={2.5} />
        </span>
        <span className="eyebrow mt-6">Venta registrada</span>
        <h1 className="mt-1 text-3xl">Pedido #{success.number}</h1>
        <div className="mt-3 text-4xl font-black tabular-nums">{formatCLP(success.total)}</div>
        <p className="mt-2 text-sm text-ink-500">Stock descontado y venta guardada como pagada.</p>
        <div className="mt-8 grid w-full gap-3">
          <button type="button" onClick={newSale} className="btn-lime btn-lg w-full">
            <Zap className="size-5" /> Nueva venta
          </button>
          <Link href={`/admin/pedidos/${success.id}`} className="btn-outline btn-lg w-full">
            <Package className="size-5" /> Ver pedido
          </Link>
          {wa && (
            <a href={wa} target="_blank" rel="noreferrer" className="btn-ghost btn-md w-full text-success">
              <MessageCircle className="size-5" /> Enviar comprobante por WhatsApp
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="lg:grid lg:grid-cols-12 lg:gap-6">
      {/* ------- Columna búsqueda ------- */}
      <section className="lg:col-span-7">
        <div className="sticky top-14 z-20 -mx-4 bg-ink-50/95 px-4 py-2 backdrop-blur md:static md:mx-0 md:bg-transparent md:px-0 md:py-0">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-400" />
            <input
              ref={searchRef}
              type="search"
              inputMode="search"
              enterKeyHint="go"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="Buscar producto (nombre, marca…)"
              value={query}
              onFocus={() => setOpen(true)}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && results[0]) {
                  e.preventDefault();
                  addProduct(results[0]);
                } else if (e.key === "Escape") {
                  setOpen(false);
                  (e.target as HTMLInputElement).blur();
                }
              }}
              className="input h-13 pl-12 pr-12 text-base shadow-card"
            />
            {(query || open) && (
              <button
                type="button"
                aria-label="Cerrar búsqueda"
                onClick={() => {
                  setQuery("");
                  setOpen(false);
                }}
                className="absolute right-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-ink-400 hover:bg-ink-50 hover:text-ink"
              >
                <X className="size-5" />
              </button>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 font-semibold text-ink-600">
              <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} className="size-4 accent-ink" />
              Mostrar también agotados
            </label>
            {searching && <Loader2 className="size-4 animate-spin text-ink-400" />}
          </div>
        </div>

        {open && (
          <div className="card mt-2 overflow-hidden">
            {results.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-ink-500">{searching ? "Buscando…" : query ? `Sin resultados para “${query}”` : "Escribe para buscar. Se muestran los últimos productos."}</p>
            ) : (
              <ul className="max-h-[60vh] divide-y divide-ink-100 overflow-y-auto lg:max-h-[calc(100dvh-16rem)]">
                {results.map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => addProduct(p)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition active:bg-lime-50">
                      <img src={p.image} alt="" className="size-14 shrink-0 rounded-lg bg-ink-50 object-contain" loading="lazy" />
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-2 text-sm font-semibold leading-tight">{p.name}</div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-ink-500">
                          {p.brand && <span>{p.brand}</span>}
                          <span className={cn("font-semibold", p.stock <= 0 ? "text-danger" : p.stock === 1 ? "text-flame" : "text-success")}>{p.stock <= 0 ? "Agotado" : `Stock ${p.stock}`}</span>
                          {p.status !== "ACTIVE" && <span className="rounded bg-ink-100 px-1 text-[10px] font-bold uppercase">{p.status === "DRAFT" ? "Borrador" : p.status}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold tabular-nums">{formatCLP(p.price)}</div>
                        <span className="mt-1 inline-flex size-8 items-center justify-center rounded-full bg-ink text-white">
                          <Plus className="size-4" />
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {/* ------- Columna ticket ------- */}
      <section className="mt-4 space-y-4 lg:col-span-5 lg:mt-0">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
            <h2 className="text-base">Ticket</h2>
            <span className="text-xs font-semibold text-ink-500">
              {units} {units === 1 ? "unidad" : "unidades"}
            </span>
          </div>
          {draft.items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-ink-500">Busca un producto arriba y tócalo para agregarlo al ticket.</p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {draft.items.map((l) => (
                <li key={l.key} className="px-3 py-3">
                  <div className="flex items-start gap-3">
                    <img src={l.image} alt="" className="size-12 shrink-0 rounded-lg bg-ink-50 object-contain" />
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 text-sm font-semibold leading-tight">{l.name}</div>
                      <div className="mt-0.5 text-xs text-ink-500">
                        {l.quantity > l.stock ? <span className="font-semibold text-danger">Solo hay {l.stock} en stock</span> : `Stock ${l.stock}`}
                        {l.price !== l.listPrice && <span className="ml-2 text-ink-400 line-through">{formatCLP(l.listPrice)}</span>}
                      </div>
                    </div>
                    <button type="button" aria-label="Quitar" onClick={() => removeLine(l.key)} className="flex size-11 shrink-0 items-center justify-center rounded-full text-ink-400 hover:bg-danger/10 hover:text-danger">
                      <Trash2 className="size-5" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <div className="inline-flex h-11 items-center rounded-full border border-ink-200 bg-white">
                      <button type="button" aria-label="Menos" onClick={() => (l.quantity <= 1 ? removeLine(l.key) : setLine(l.key, { quantity: l.quantity - 1 }))} className="flex h-full w-11 items-center justify-center rounded-l-full hover:bg-ink-50">
                        <Minus className="size-4" />
                      </button>
                      <span className="w-9 text-center text-sm font-bold tabular-nums">{l.quantity}</span>
                      <button type="button" aria-label="Más" onClick={() => setLine(l.key, { quantity: l.quantity + 1 })} className="flex h-full w-11 items-center justify-center rounded-r-full hover:bg-ink-50">
                        <Plus className="size-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-400">$</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          enterKeyHint="done"
                          aria-label="Precio unitario"
                          value={l.price.toLocaleString("es-CL")}
                          onChange={(e) => setLine(l.key, { price: parseInt0(e.target.value) })}
                          onFocus={(e) => e.target.select()}
                          className={cn("input h-11 w-28 pl-7 pr-2 text-right text-sm font-bold tabular-nums", l.price !== l.listPrice && "border-flame")}
                        />
                      </label>
                      <span className="w-20 text-right text-sm font-bold tabular-nums">{formatCLP(l.price * l.quantity)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Cliente */}
        <div className="card overflow-hidden">
          <button type="button" onClick={() => setCustomerOpen((v) => !v)} className="flex h-13 w-full items-center justify-between px-4 text-left">
            <span className="flex items-center gap-2 text-sm font-bold">
              <User className="size-4" /> Cliente <span className="font-normal text-ink-400">(opcional)</span>
            </span>
            <span className="max-w-[45%] truncate text-xs text-ink-500">{draft.customer.name || draft.customer.phone || (customerOpen ? "Ocultar" : "Agregar")}</span>
          </button>
          {customerOpen && (
            <div className="space-y-3 border-t border-ink-100 p-4">
              <div className="relative">
                <input
                  type="text"
                  autoComplete="off"
                  enterKeyHint="next"
                  placeholder="Nombre del cliente"
                  value={draft.customer.name}
                  onChange={(e) => {
                    setClienteNuevo(false);
                    update({ customer: { ...draft.customer, name: e.target.value } });
                  }}
                  className="input"
                />
                {customerOpen && customerQuery.length >= 2 && !clienteNuevo && (
                  <ul className="absolute inset-x-0 top-full z-10 mt-1 max-h-60 overflow-y-auto rounded-xl border border-ink-200 bg-white shadow-pop">
                    {visibleHits.map((c) => (
                      <li key={c.id}>
                        <button type="button" onClick={() => pickCustomer(c)} className="flex w-full flex-col px-4 py-2.5 text-left hover:bg-ink-50">
                          <span className="text-sm font-semibold">{[c.name, c.lastName].filter(Boolean).join(" ") || c.email}</span>
                          <span className="text-xs text-ink-500">
                            {c.email}
                            {c.phone ? ` · ${c.phone}` : ""}
                          </span>
                        </button>
                      </li>
                    ))}
                    <li className="border-t border-ink-100">
                      <button
                        type="button"
                        onClick={() => {
                          setClienteNuevo(true);
                          update({ customer: { ...draft.customer, save: true } });
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-bold text-lime-700 hover:bg-lime-50"
                      >
                        <Plus className="size-4" />
                        Cliente nuevo: “{draft.customer.name.trim() || draft.customer.email.trim()}”
                      </button>
                    </li>
                  </ul>
                )}
                {clienteNuevo && <p className="mt-1 text-xs font-semibold text-lime-700">Cliente nuevo. Completa sus datos abajo.</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="tel" inputMode="tel" autoComplete="off" enterKeyHint="next" placeholder="Teléfono" value={draft.customer.phone} onChange={(e) => update({ customer: { ...draft.customer, phone: e.target.value } })} className="input" />
                <input type="email" inputMode="email" autoComplete="off" autoCapitalize="off" enterKeyHint="next" placeholder="Correo" value={draft.customer.email} onChange={(e) => update({ customer: { ...draft.customer, email: e.target.value } })} className="input" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input type="text" autoComplete="off" enterKeyHint="next" placeholder="RUT (opcional)" value={draft.customer.rut} onChange={(e) => update({ customer: { ...draft.customer, rut: e.target.value } })} className="input" />
                <input type="text" autoComplete="off" enterKeyHint="next" placeholder="Dirección" value={draft.customer.address1} onChange={(e) => update({ customer: { ...draft.customer, address1: e.target.value } })} className="input" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <select value={draft.customer.region} onChange={(e) => update({ customer: { ...draft.customer, region: e.target.value, city: "" } })} aria-label="Región" className="input">
                  <option value="">Región</option>
                  {REGIONS.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <select value={draft.customer.city} onChange={(e) => update({ customer: { ...draft.customer, city: e.target.value } })} disabled={!comunas.length} aria-label="Comuna" className="input">
                  <option value="">{comunas.length ? "Comuna" : "Elige la región"}</option>
                  {comunas.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <label className={cn("flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 text-sm font-semibold", draft.customer.save ? "border-ink bg-ink-50" : "border-ink-200")}>
                <input type="checkbox" checked={draft.customer.save} onChange={(e) => update({ customer: { ...draft.customer, save: e.target.checked } })} className="size-5 accent-lime-600" />
                Guardar en la ficha de clientes
              </label>
              {draft.customer.save && !correoValido && <p className="-mt-1 text-xs text-flame">Para guardarlo necesitamos un correo válido; sin correo la venta igual queda registrada.</p>}

              <div className="flex gap-2">
                {(["NONE", "PICKUP", "DELIVERY_COD"] as const).map((m) => (
                  <button key={m} type="button" onClick={() => update({ shippingMethod: m })} className={cn("chip h-10 flex-1 justify-center text-center", draft.shippingMethod === m && "chip-active")}>
                    {m === "NONE" ? "En mano" : m === "PICKUP" ? "Retiro" : "Envío"}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pago */}
        <div className="card p-4">
          <div className="mb-2 text-sm font-bold">Método de pago</div>
          <div className="grid grid-cols-2 gap-2">
            {PAYMENTS.map((p) => {
              const Icon = p.icon;
              const active = draft.paymentMethod === p.value;
              return (
                <button key={p.value} type="button" onClick={() => update({ paymentMethod: p.value })} className={cn("flex h-12 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition", active ? "border-ink bg-ink text-white" : "border-ink-200 bg-white text-ink-700 hover:border-ink")}>
                  <Icon className="size-4" /> {p.label}
                </button>
              );
            })}
          </div>
          <textarea rows={2} placeholder="Nota (opcional): feria, Instagram, detalle del descuento…" value={draft.note} onChange={(e) => update({ note: e.target.value })} className="input mt-3 h-auto min-h-16 resize-none py-2.5" />
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-ink-700">Descuento total</span>
            <label className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-400">$</span>
              <input type="text" inputMode="numeric" enterKeyHint="done" value={draft.discount ? draft.discount.toLocaleString("es-CL") : ""} placeholder="0" onChange={(e) => update({ discount: parseInt0(e.target.value) })} className="input h-11 w-32 pl-7 pr-3 text-right text-sm font-bold tabular-nums" />
            </label>
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
            {error}
          </p>
        )}
        {stockIssue && !error && <p className="rounded-xl bg-flame/15 px-4 py-3 text-sm font-medium text-[#9a5a0a]">Revisa las cantidades: “{stockIssue.name}” supera el stock disponible.</p>}
      </section>

      {/* ------- Barra total fija ------- */}
      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-ink-100 bg-white/95 px-4 py-3 backdrop-blur md:bottom-0 md:left-64 md:px-8 print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-wider text-ink-500">Total{discount > 0 ? ` (desc. ${formatCLP(discount)})` : ""}</div>
            <div className="text-2xl font-black tabular-nums leading-none md:text-3xl">{formatCLP(total)}</div>
          </div>
          <button type="button" onClick={submit} disabled={pending || draft.items.length === 0} className="btn-lime btn-lg min-w-[11rem] flex-1 sm:flex-none">
            {pending ? <Loader2 className="size-5 animate-spin" /> : <CheckCircle2 className="size-5" />}
            {pending ? "Registrando…" : "Registrar venta"}
          </button>
        </div>
      </div>
      <div className="h-20 md:h-24" aria-hidden />

      {toast && <div className="pointer-events-none fixed inset-x-4 bottom-40 z-50 mx-auto max-w-sm rounded-xl bg-ink px-4 py-3 text-center text-sm font-semibold text-white shadow-pop md:bottom-28">{toast}</div>}
    </div>
  );
}
