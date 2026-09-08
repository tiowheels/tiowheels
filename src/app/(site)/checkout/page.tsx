import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { flowConfigured } from "@/lib/flow";
import { getStoreSettings } from "@/lib/orders";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";

export const metadata: Metadata = { title: "Finalizar compra", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const [user, store] = await Promise.all([getCurrentUser(), getStoreSettings()]);
  return (
    <CheckoutForm
      flowEnabled={flowConfigured()}
      transferEnabled={store.transferEnabled}
      shippingNote={store.shippingNote}
      pickupAddress={store.pickupAddress}
      user={
        user
          ? {
              firstName: user.name ?? "",
              lastName: user.lastName ?? "",
              email: user.email,
              phone: user.phone ?? "",
              rut: user.rut ?? "",
              address1: user.address1 ?? "",
              address2: user.address2 ?? "",
              commune: user.commune ?? "",
              region: user.region ?? "",
            }
          : null
      }
    />
  );
}
