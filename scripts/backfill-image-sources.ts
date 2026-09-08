/** Rellena ProductImage.sourceUrl a partir de data/legacy/image-map.json (por producto y posición). */
import "dotenv/config";
import { readFileSync } from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const map: Record<string, { file: string; alt: string; src: string }[]> = JSON.parse(readFileSync(path.resolve(__dirname, "../data/legacy/image-map.json"), "utf8"));

async function main() {
  const images = await db.productImage.findMany({ where: { sourceUrl: null }, select: { id: true, productId: true, position: true } });
  let n = 0;
  for (const img of images) {
    const src = map[img.productId]?.[img.position]?.src;
    if (!src) continue;
    await db.productImage.update({ where: { id: img.id }, data: { sourceUrl: src } });
    n++;
  }
  console.log("sourceUrl rellenados:", n, "de", images.length);
}
main().finally(() => db.$disconnect());
