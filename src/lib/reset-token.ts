import { createHash } from "node:crypto";

/**
 * En la base se guarda solo el hash del token: si alguien lee la tabla no puede
 * usar los enlaces. El correo lleva el token en claro, así que hay que aplicar
 * esto mismo antes de buscarlo.
 */
export function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
