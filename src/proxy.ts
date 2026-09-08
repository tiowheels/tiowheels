import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

/**
 * Chequeo optimista de sesión para /admin y /cuenta.
 * La verificación definitiva (rol en BD) ocurre en los layouts con requireAdmin/requireUser.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("tw_session")?.value;
  let payload: { uid?: string; role?: string } | null = null;
  type Payload = { uid?: string; role?: string };
  if (token && process.env.AUTH_SECRET) {
    try {
      const r = await jwtVerify(token, new TextEncoder().encode(process.env.AUTH_SECRET));
      payload = r.payload as Payload;
    } catch {
      payload = null;
    }
  }

  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") {
      if (payload?.role === "ADMIN") return NextResponse.redirect(new URL("/admin", req.url));
      return NextResponse.next();
    }
    if (payload?.role !== "ADMIN") return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  if (pathname.startsWith("/cuenta") && !["/cuenta/ingresar", "/cuenta/registro", "/cuenta/recuperar"].some((p) => pathname.startsWith(p))) {
    if (!payload) {
      const url = new URL("/cuenta/ingresar", req.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/cuenta/:path*"],
};
