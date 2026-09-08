/** Crea/actualiza el usuario administrador. Usa ADMIN_EMAIL / ADMIN_PASSWORD del entorno. */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  const email = (process.env.ADMIN_EMAIL || "admin@tiowheels.cl").toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error("Define ADMIN_PASSWORD para crear el administrador");
  const passwordHash = await bcrypt.hash(password, 10);
  await db.user.upsert({
    where: { email },
    create: { email, name: "Administrador", role: "ADMIN", passwordHash },
    update: { role: "ADMIN", passwordHash },
  });
  console.log("admin listo:", email);

  // Ajustes iniciales de la tienda
  const defaults: Record<string, unknown> = {
    store: {
      pickupAddress: "Coordinar retiro por WhatsApp",
      shippingNote: "Envío por pagar: el costo lo pagas al courier al recibir tu pedido. Despachamos en 1 a 3 días hábiles.",
      transferEnabled: true,
      transferDetails: "Banco: —\nTipo de cuenta: —\nN° de cuenta: —\nNombre: Tío Wheels\nRUT: —\nEmail: contacto@tiowheels.cl",
    },
  };
  for (const [key, value] of Object.entries(defaults)) {
    await db.setting.upsert({ where: { key }, create: { key, value: value as object }, update: {} });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
