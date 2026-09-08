import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";

export const storeSettingsSchema = z.object({
  pickupAddress: z.string().trim().max(300).default(""),
  shippingNote: z.string().trim().max(600).default(""),
  transferEnabled: z.boolean().default(true),
  transferDetails: z.string().trim().max(1500).default(""),
});
export type StoreSettings = z.infer<typeof storeSettingsSchema>;

export async function getStoreSettings(): Promise<StoreSettings> {
  const row = await db.setting.findUnique({ where: { key: "store" } });
  const parsed = storeSettingsSchema.safeParse(row?.value ?? {});
  return parsed.success ? parsed.data : storeSettingsSchema.parse({});
}

export async function getNewsletterEmails(): Promise<string[]> {
  const row = await db.setting.findUnique({ where: { key: "newsletter" } });
  return Array.isArray(row?.value) ? (row!.value as unknown[]).filter((x): x is string => typeof x === "string") : [];
}
