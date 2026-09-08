import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cache } from "react";
import { db, Role } from "./db";

const COOKIE = "tw_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 días

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("AUTH_SECRET no configurado");
  if (process.env.NODE_ENV === "production" && (s.length < 32 || /dev-secret|change-me|genera-un-secreto/i.test(s))) {
    throw new Error("AUTH_SECRET débil: en producción usa un secreto aleatorio de al menos 32 caracteres (openssl rand -base64 48)");
  }
  return new TextEncoder().encode(s);
}

/** sv = versión de sesión del usuario; si cambia (nueva contraseña), las sesiones anteriores dejan de valer. */
export type SessionPayload = { uid: string; role: Role; sv: number };

export async function signSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.uid !== "string") return null;
    return { uid: payload.uid, role: payload.role as Role, sv: typeof payload.sv === "number" ? payload.sv : 0 };
  } catch {
    return null;
  }
}

export async function createSession(user: { id: string; role: Role; sessionVersion?: number }) {
  const token = await signSession({ uid: user.id, role: user.role, sv: user.sessionVersion ?? 0 });
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/** Usuario actual (o null). Cacheado por request. */
export const getCurrentUser = cache(async () => {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload) return null;
  const user = await db.user.findUnique({
    where: { id: payload.uid },
    select: {
      id: true,
      email: true,
      name: true,
      lastName: true,
      phone: true,
      rut: true,
      role: true,
      sessionVersion: true,
      address1: true,
      address2: true,
      commune: true,
      city: true,
      region: true,
    },
  });
  if (!user || user.sessionVersion !== payload.sv) return null;
  const { sessionVersion: _sv, ...safe } = user;
  void _sv;
  return safe;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function requireUser(next = "/cuenta") {
  const user = await getCurrentUser();
  if (!user) redirect(`/cuenta/ingresar?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/admin/login");
  return user;
}

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}

/**
 * Cambia la contraseña e invalida todas las sesiones anteriores del usuario.
 * Devuelve el usuario con la nueva sessionVersion para volver a iniciar sesión.
 */
export async function setPasswordAndRotateSessions(userId: string, newPassword: string) {
  const passwordHash = await hashPassword(newPassword);
  return db.user.update({ where: { id: userId }, data: { passwordHash, sessionVersion: { increment: 1 } } });
}

export async function verifyPassword(pw: string, hash: string | null | undefined) {
  if (!hash) return false;
  return bcrypt.compare(pw, hash);
}

export async function authenticate(email: string, password: string) {
  const user = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user) return null;
  const ok = await verifyPassword(password, user.passwordHash);
  return ok ? user : null;
}

export const SESSION_COOKIE = COOKIE;
