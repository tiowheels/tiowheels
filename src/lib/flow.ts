import "server-only";
import { createHmac } from "node:crypto";

/**
 * Cliente mínimo de Flow.cl (https://www.flow.cl/docs/api.html)
 * - Firma HMAC-SHA256 sobre los parámetros ordenados alfabéticamente.
 * - Sandbox: https://sandbox.flow.cl/api  ·  Producción: https://www.flow.cl/api
 */

const API_URL = () => (process.env.FLOW_API_URL || "https://sandbox.flow.cl/api").replace(/\/$/, "");

export function flowConfigured() {
  return Boolean(process.env.FLOW_API_KEY && process.env.FLOW_SECRET_KEY);
}

function sign(params: Record<string, string>) {
  const keys = Object.keys(params).sort();
  const toSign = keys.map((k) => `${k}${params[k]}`).join("");
  return createHmac("sha256", process.env.FLOW_SECRET_KEY!).update(toSign).digest("hex");
}

function withSignature(params: Record<string, string>) {
  const p = { ...params, apiKey: process.env.FLOW_API_KEY! };
  return { ...p, s: sign(p) };
}

async function post<T>(path: string, params: Record<string, string>): Promise<T> {
  const body = new URLSearchParams(withSignature(params));
  const res = await fetch(`${API_URL()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const json = (await res.json()) as T & { code?: number; message?: string };
  if (!res.ok || (json && typeof json.code === "number" && json.code !== 0 && json.message)) {
    throw new Error(`Flow ${path}: ${json?.message ?? res.statusText}`);
  }
  return json;
}

async function get<T>(path: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams(withSignature(params));
  const res = await fetch(`${API_URL()}${path}?${qs}`, { cache: "no-store" });
  const json = (await res.json()) as T & { code?: number; message?: string };
  if (!res.ok) throw new Error(`Flow ${path}: ${json?.message ?? res.statusText}`);
  return json;
}

export type FlowCreateResponse = { url: string; token: string; flowOrder: number };

export type FlowStatus = {
  flowOrder: number;
  commerceOrder: string;
  requestDate: string;
  /** 1 pendiente · 2 pagada · 3 rechazada · 4 anulada */
  status: 1 | 2 | 3 | 4;
  subject: string;
  currency: string;
  amount: number;
  payer: string;
  optional?: string;
  pending_info?: { media: string; date: string };
  paymentData?: {
    date: string;
    media: string;
    conversionDate: string;
    conversionRate: number;
    amount: number;
    currency: string;
    fee: number;
    balance: number;
    transferDate: string;
  };
  merchantId?: string;
};

export async function createFlowPayment(input: {
  commerceOrder: string;
  subject: string;
  amount: number;
  email: string;
  urlConfirmation: string;
  urlReturn: string;
  optional?: Record<string, string>;
}) {
  const data = await post<FlowCreateResponse>("/payment/create", {
    commerceOrder: input.commerceOrder,
    subject: input.subject,
    currency: "CLP",
    amount: String(input.amount),
    email: input.email,
    paymentMethod: "9", // 9 = todos los medios habilitados en la cuenta Flow
    urlConfirmation: input.urlConfirmation,
    urlReturn: input.urlReturn,
    ...(input.optional ? { optional: JSON.stringify(input.optional) } : {}),
  });
  return { ...data, redirectUrl: `${data.url}?token=${data.token}` };
}

export async function getFlowStatus(token: string) {
  return get<FlowStatus>("/payment/getStatus", { token });
}

export async function getFlowStatusByCommerceOrder(commerceOrder: string) {
  return get<FlowStatus>("/payment/getStatusByCommerceId", { commerceId: commerceOrder });
}

export const FLOW_STATUS_LABEL: Record<number, string> = {
  1: "Pendiente",
  2: "Pagada",
  3: "Rechazada",
  4: "Anulada",
};
