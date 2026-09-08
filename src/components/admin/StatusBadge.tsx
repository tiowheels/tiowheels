import { Badge } from "@/components/ui/Badge";
import type { OrderStatus, OrderChannel, PaymentStatus, ProductStatus } from "@/generated/prisma/enums";
import { ORDER_STATUS, ORDER_CHANNEL, PAYMENT_STATUS, PRODUCT_STATUS } from "./labels";

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const s = ORDER_STATUS[status];
  return (
    <Badge tone={s.tone} className={className}>
      {s.label}
    </Badge>
  );
}

export function ChannelBadge({ channel, className }: { channel: OrderChannel; className?: string }) {
  const c = ORDER_CHANNEL[channel];
  return (
    <Badge tone={channel === "MANUAL" ? "dark" : channel === "WEB" ? "lime" : "outline"} className={className}>
      {c.short}
    </Badge>
  );
}

export function PaymentStatusBadge({ status, className }: { status: PaymentStatus; className?: string }) {
  const s = PAYMENT_STATUS[status];
  return (
    <Badge tone={s.tone} className={className}>
      {s.label}
    </Badge>
  );
}

export function ProductStatusBadge({ status, className }: { status: ProductStatus; className?: string }) {
  const s = PRODUCT_STATUS[status];
  return (
    <Badge tone={s.tone} className={className}>
      {s.label}
    </Badge>
  );
}
