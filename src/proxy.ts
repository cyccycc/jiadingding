import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, sessionSecret, verifySession } from "@/lib/session";

export async function proxy(request: NextRequest) {
  const secret = sessionSecret();
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = secret && token ? await verifySession(token, secret) : null;
  if (session) return NextResponse.next();

  const login = request.nextUrl.clone();
  login.pathname = "/login";
  login.search = "";
  const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  login.searchParams.set("next", next);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
