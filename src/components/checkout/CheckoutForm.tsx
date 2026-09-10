"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AlertCircle, ArrowLeft, ChevronDown, CreditCard, Landmark, Loader2, Lock, Package, ShoppingBag, Truck } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { REGIONS } from "@/lib/chile";
import { cn, formatCLP, formatRut } from "@/lib/format";
import { placeOrder } from "@/app/(site)/checkout/actions";
import { OrderSummary } from "./OrderSummary";
import { RadioCard } from "./RadioCard";

type UserPrefill = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  rut: string;
  address1: string;
  address2: string;
  commune: string;
  region: string;
};

type Props = {
  flowEnabled: boolean;
  transferEnabled: boolean;
  shippingNote: string;
  pickupAddress: string;
  user: UserPrefill | null;
};

type ShippingMethod = "DELIVERY_COD" | "PICKUP";
type PaymentMethod = "FLOW" | "TRANSFER";

const OTHER = "__otra__";

export function CheckoutForm({ flowEnabled, transferEnabled, shippingNote, pickupAddress, user }: Props) {
  const cart = useCart();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const submitted = useRef(false);
  const errorRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
    rut: user?.rut ? formatRut(user.rut) : "",
    address1: user?.address1 ?? "",
    address2: user?.address2 ?? "",
    commune: user?.commune ?? "",
    region: user?.region && REGIONS.some((r) => r.code === user.region) ? user.region : "",
    customerNote: "",
  });
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>("DELIVERY_COD");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">(flowEnabled ? "FLOW" : transferEnabled ? "TRANSFER" : "");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<{ message: string; details?: string[] } | null>(null);

  const region = useMemo(() => REGIONS.find((r) => r.code === form.region), [form.region]);
  const communeInList = Boolean(region && form.commune && region.comunas.includes(form.commune));
  const [otherCommune, setOtherCommune] = useState(() => Boolean(user?.commune && !communeInList));
  const communeSelectValue = otherCommune ? OTHER : communeInList ? form.commune : "";

  // Carrito vacío → volver al carrito (salvo cuando ya enviamos el pedido y lo vaciamos nosotros).
  useEffect(() => {
    if (cart.hydrated && cart.items.length === 0 && !submitted.current) router.replace("/carrito");
  }, [cart.hydrated, cart.items.length, router]);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: "" }));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setGlobalError(null);
    setErrors({});

    if (!paymentMethod) {
      setGlobalError({ message: "No hay medios de pago disponibles en este momento. Escríbenos por WhatsApp para coordinar tu compra." });
      return;
    }
    if (!acceptTerms) {
      setErrors({ acceptTerms: "Debes aceptar los términos y condiciones para continuar." });
      return;
    }

    const payload = {
      ...form,
      shippingMethod,
      paymentMethod,
      acceptTerms,
      items: cart.items.map((i) => ({ productId: i.productId, qty: i.qty, name: i.name })),
    };

    startTransition(async () => {
      const res = await placeOrder(payload);
      if (res.ok) {
        submitted.current = true;
        cart.clear();
        window.location.href = res.redirectUrl;
        return;
      }
      if (res.field && res.field !== "items") setErrors({ [res.field]: res.error });
      setGlobalError({ message: res.error, details: res.details });
      requestAnimationFrame(() => errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
    });
  }

  if (!cart.hydrated || cart.items.length === 0) {
    return (
      <div className="container-x flex min-h-[50vh] items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-ink-400" aria-label="Cargando" />
      </div>
    );
  }

  const submitLabel = paymentMethod === "FLOW" ? "Pagar con Flow" : "Confirmar pedido";

  return (
    <div className="bg-ink-50/60">
      <div className="container-x py-6 md:py-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <Link href="/carrito" className="mb-2 inline-flex items-center gap-1 text-[13px] font-semibold text-ink-500 hover:text-ink">
              <ArrowLeft className="size-4" /> Volver al carrito
            </Link>
            <h1 className="text-2xl sm:text-3xl">Finalizar compra</h1>
          </div>
          <p className="flex items-center gap-1.5 text-[13px] font-medium text-ink-500">
            <Lock className="size-4 text-lime-700" /> Compra segura
          </p>
        </div>

        {/* Resumen colapsable en móvil */}
        <details className="card group mb-5 lg:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2 text-sm font-bold">
              <ShoppingBag className="size-4 text-lime-700" /> Ver resumen del pedido
              <span className="font-medium text-ink-400">({cart.count})</span>
            </span>
            <span className="flex items-center gap-2 text-sm font-extrabold">
              {formatCLP(cart.subtotal)}
              <ChevronDown className="size-4 transition group-open:rotate-180" />
            </span>
          </summary>
          <div className="border-t border-ink-100 px-4 pb-4 pt-3">
            <OrderSummary compact items={cart.items} subtotal={cart.subtotal} shippingMethod={shippingMethod} />
          </div>
        </details>

        <form onSubmit={onSubmit} noValidate className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-8">
          <div className="space-y-5">
            {globalError ? (
              <div ref={errorRef} role="alert" className="flex gap-3 rounded-2xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
                <AlertCircle className="mt-0.5 size-5 shrink-0" />
                <div>
                  <p className="font-semibold">{globalError.message}</p>
                  {globalError.details?.length ? (
                    <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-[13px]">
                      {globalError.details.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  ) : null}
                  {globalError.details?.length ? (
                    <Link href="/carrito" className="mt-2 inline-block font-bold underline underline-offset-2">
                      Ajustar carrito
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}

            {/* 1. Datos */}
            <Section number={1} title="Tus datos" subtitle={user ? "Prellenamos tus datos guardados. Puedes editarlos." : "Para enviarte la confirmación y coordinar la entrega."}>
              {!user ? (
                <p className="mb-4 rounded-xl bg-ink-50 px-4 py-3 text-[13px] text-ink-500">
                  ¿Ya tienes cuenta?{" "}
                  <Link href="/cuenta/ingresar?next=/checkout" className="font-bold text-ink underline underline-offset-2">
                    Ingresa
                  </Link>{" "}
                  para completar más rápido.
                </p>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nombre" id="firstName" error={errors.firstName}>
                  <input id="firstName" name="firstName" autoComplete="given-name" required value={form.firstName} onChange={(e) => set("firstName", e.target.value)} className={cn("input", errors.firstName && "border-danger")} />
                </Field>
                <Field label="Apellido" id="lastName" error={errors.lastName}>
                  <input id="lastName" name="lastName" autoComplete="family-name" required value={form.lastName} onChange={(e) => set("lastName", e.target.value)} className={cn("input", errors.lastName && "border-danger")} />
                </Field>
                <Field label="Email" id="email" error={errors.email} hint="Aquí te llegará la confirmación.">
                  <input id="email" name="email" type="email" inputMode="email" autoComplete="email" required value={form.email} onChange={(e) => set("email", e.target.value)} className={cn("input", errors.email && "border-danger")} />
                </Field>
                <Field label="Teléfono / WhatsApp" id="phone" error={errors.phone}>
                  <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+56 9 1234 5678" required value={form.phone} onChange={(e) => set("phone", e.target.value)} className={cn("input", errors.phone && "border-danger")} />
                </Field>
                <Field label="RUT" id="rut" error={errors.rut} hint="Lo necesitamos para la boleta y el envío.">
                  <input
                    id="rut"
                    name="rut"
                    inputMode="text"
                    placeholder="12.345.678-9"
                    required
                    value={form.rut}
                    onChange={(e) => set("rut", e.target.value)}
                    onBlur={(e) => set("rut", e.target.value.trim() ? formatRut(e.target.value) : "")}
                    className={cn("input", errors.rut && "border-danger")}
                  />
                </Field>
              </div>
            </Section>

            {/* 2. Entrega */}
            <Section number={2} title="Entrega" subtitle="Elige cómo quieres recibir tu pedido.">
              <div className="grid gap-3 sm:grid-cols-2">
                <RadioCard
                  name="shippingMethod"
                  value="DELIVERY_COD"
                  checked={shippingMethod === "DELIVERY_COD"}
                  onChange={() => setShippingMethod("DELIVERY_COD")}
                  icon={<Truck className="size-5" />}
                  title="Envío por pagar a todo Chile"
                  description="Pagas el courier al recibir; despachamos en 1 a 3 días hábiles."
                />
                <RadioCard
                  name="shippingMethod"
                  value="PICKUP"
                  checked={shippingMethod === "PICKUP"}
                  onChange={() => setShippingMethod("PICKUP")}
                  icon={<Package className="size-5" />}
                  title="Retiro"
                  badge="Gratis"
                  description="Metro El Llano o dirección comercial."
                />
              </div>

              {shippingMethod === "DELIVERY_COD" ? (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field label="Región" id="region" error={errors.region}>
                    <div className="relative">
                      <select
                        id="region"
                        name="region"
                        required
                        value={form.region}
                        onChange={(e) => {
                          set("region", e.target.value);
                          set("commune", "");
                          setOtherCommune(false);
                        }}
                        className={cn("input appearance-none pr-10", errors.region && "border-danger")}
                      >
                        <option value="">Elige tu región</option>
                        {REGIONS.map((r) => (
                          <option key={r.code} value={r.code}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
                    </div>
                  </Field>
                  <Field label="Comuna" id="commune" error={errors.commune}>
                    <div className="relative">
                      <select
                        id="commune"
                        required
                        disabled={!region}
                        value={communeSelectValue}
                        onChange={(e) => {
                          if (e.target.value === OTHER) {
                            setOtherCommune(true);
                            set("commune", "");
                          } else {
                            setOtherCommune(false);
                            set("commune", e.target.value);
                          }
                        }}
                        className={cn("input appearance-none pr-10", errors.commune && "border-danger")}
                      >
                        <option value="">{region ? "Elige tu comuna" : "Primero elige la región"}</option>
                        {region?.comunas.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                        {region ? <option value={OTHER}>Otra comuna (escribir)</option> : null}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
                    </div>
                    {otherCommune ? (
                      <input aria-label="Escribe tu comuna" name="commune" placeholder="Escribe tu comuna" required value={form.commune} onChange={(e) => set("commune", e.target.value)} className={cn("input mt-2", errors.commune && "border-danger")} />
                    ) : null}
                  </Field>
                  <Field label="Dirección" id="address1" error={errors.address1} className="sm:col-span-2">
                    <input id="address1" name="address1" autoComplete="street-address" placeholder="Calle y número" required value={form.address1} onChange={(e) => set("address1", e.target.value)} className={cn("input", errors.address1 && "border-danger")} />
                  </Field>
                  <Field label="Depto / casa / oficina" id="address2" optional className="sm:col-span-2">
                    <input id="address2" name="address2" placeholder="Ej: Depto 402, Torre B" value={form.address2} onChange={(e) => set("address2", e.target.value)} className="input" />
                  </Field>
                  <Field label="Nota para la entrega" id="customerNote" optional className="sm:col-span-2">
                    <textarea id="customerNote" name="customerNote" rows={2} placeholder="Referencias, horario, o cualquier dato útil para el courier" value={form.customerNote} onChange={(e) => set("customerNote", e.target.value)} className="input h-auto resize-none py-2.5" />
                  </Field>
                  <p className="text-xs text-ink-400 sm:col-span-2">{shippingNote}</p>
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  <p className="rounded-xl bg-lime-50 px-4 py-3 text-[13px] text-ink-700">
                    <span className="font-bold">Retiro gratis.</span> {pickupAddress}
                  </p>
                  <Field label="Nota para tu pedido" id="customerNote" optional>
                    <textarea id="customerNote" name="customerNote" rows={2} placeholder="Cuéntanos si prefieres algún horario o tienes alguna consulta" value={form.customerNote} onChange={(e) => set("customerNote", e.target.value)} className="input h-auto resize-none py-2.5" />
                  </Field>
                </div>
              )}
            </Section>

            {/* 3. Pago */}
            <Section number={3} title="Pago" subtitle="Elige cómo quieres pagar.">
              {!flowEnabled && !transferEnabled ? (
                <p className="rounded-xl border border-flame/40 bg-flame/10 px-4 py-3 text-sm text-ink-700">No hay medios de pago disponibles en este momento. Escríbenos por WhatsApp y coordinamos tu compra.</p>
              ) : (
                <div className="grid gap-3">
                  {flowEnabled ? (
                    <RadioCard
                      name="paymentMethod"
                      value="FLOW"
                      checked={paymentMethod === "FLOW"}
                      onChange={() => setPaymentMethod("FLOW")}
                      icon={<CreditCard className="size-5" />}
                      title="Flow"
                      badge="Inmediato"
                      description="Webpay, tarjetas de crédito/débito, y más. Confirmación al instante."
                    />
                  ) : null}
                  {transferEnabled ? (
                    <RadioCard
                      name="paymentMethod"
                      value="TRANSFER"
                      checked={paymentMethod === "TRANSFER"}
                      onChange={() => setPaymentMethod("TRANSFER")}
                      icon={<Landmark className="size-5" />}
                      title="Transferencia bancaria"
                      description="Te enviamos los datos y confirmamos tu pedido al recibir el pago."
                    />
                  ) : null}
                </div>
              )}
              {errors.paymentMethod ? <p className="mt-2 text-[13px] font-medium text-danger">{errors.paymentMethod}</p> : null}
            </Section>

            {/* Términos + submit (móvil: dentro del flujo) */}
            <div className="card p-5 sm:p-6">
              <label className="flex cursor-pointer items-start gap-3">
                <input type="checkbox" name="acceptTerms" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-0.5 size-5 shrink-0 rounded border-ink-300 accent-lime" />
                <span className="text-sm text-ink-700">
                  Acepto los{" "}
                  <Link href="/terminos" target="_blank" className="font-bold text-ink underline underline-offset-2">
                    términos y condiciones
                  </Link>{" "}
                  y la{" "}
                  <Link href="/privacidad" target="_blank" className="font-bold text-ink underline underline-offset-2">
                    política de privacidad
                  </Link>
                  .
                </span>
              </label>
              {errors.acceptTerms ? <p className="mt-2 text-[13px] font-medium text-danger">{errors.acceptTerms}</p> : null}
              <button type="submit" disabled={pending || !paymentMethod} className="btn-lime btn-lg mt-5 w-full">
                {pending ? (
                  <>
                    <Loader2 className="size-5 animate-spin" /> Procesando…
                  </>
                ) : (
                  <>
                    <Lock className="size-5" /> {submitLabel}
                  </>
                )}
              </button>
              <p className="mt-3 text-center text-xs text-ink-400">{paymentMethod === "FLOW" ? "Te llevaremos a Flow para completar el pago de forma segura." : "Recibirás los datos de transferencia al confirmar."}</p>
            </div>
          </div>

          {/* Resumen sticky en desktop */}
          <aside className="card hidden p-6 lg:sticky lg:top-24 lg:block">
            <OrderSummary items={cart.items} subtotal={cart.subtotal} shippingMethod={shippingMethod} />
          </aside>
        </form>
      </div>
    </div>
  );
}

function Section({ number, title, subtitle, children }: { number: number; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-6" aria-labelledby={`section-${number}`}>
      <div className="mb-4 flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-bold text-lime">{number}</span>
        <div>
          <h2 id={`section-${number}`} className="text-lg leading-tight">
            {title}
          </h2>
          {subtitle ? <p className="mt-0.5 text-[13px] text-ink-500">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({ label, id, error, hint, optional, className, children }: { label: string; id: string; error?: string; hint?: string; optional?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label} {optional ? <span className="font-medium text-ink-400">(opcional)</span> : null}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-[13px] font-medium text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-ink-400">{hint}</p>
      ) : null}
    </div>
  );
}
