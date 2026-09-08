/** Genera íconos PWA / favicon a partir del logo. pnpm tsx scripts/make-icons.ts */
import sharp from "sharp";
import path from "node:path";
import { mkdirSync } from "node:fs";

const ROOT = path.resolve(__dirname, "..");
const LOGO = path.join(ROOT, "public/brand/logo.png");
const OUT = path.join(ROOT, "public/icons");
mkdirSync(OUT, { recursive: true });

async function icon(size: number, name: string, padding = 0.12, bg = "#ffffff") {
  const inner = Math.round(size * (1 - padding * 2));
  const logo = await sharp(LOGO).resize({ width: inner, height: inner, fit: "inside" }).toBuffer();
  const meta = await sharp(logo).metadata();
  await sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    .composite([{ input: logo, left: Math.round((size - (meta.width ?? inner)) / 2), top: Math.round((size - (meta.height ?? inner)) / 2) }])
    .png()
    .toFile(path.join(OUT, name));
}

async function main() {
  await icon(192, "icon-192.png");
  await icon(512, "icon-512.png");
  await icon(512, "icon-maskable-512.png", 0.22);
  await icon(180, "apple-touch-icon.png", 0.1);
  await icon(32, "favicon-32.png", 0.02);
  await icon(64, "favicon-64.png", 0.02);
  console.log("íconos generados en public/icons");
}
main();
