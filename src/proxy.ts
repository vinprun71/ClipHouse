import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, sessionIsValid } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PUBLIC_AUTH_APIS = new Set(["/api/auth/setup", "/api/auth/login", "/api/auth/logout"]);

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const ownerExists = (await prisma.owner.count()) > 0;
  const authenticated = ownerExists && await sessionIsValid(request.cookies.get(AUTH_COOKIE_NAME)?.value);

  if (!ownerExists) {
    if (pathname === "/setup" || pathname === "/api/auth/setup") return NextResponse.next();
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "ClipHouse setup is required." }, { status: 428 });
    }
    return NextResponse.redirect(new URL("/setup", request.url));
  }

  if (pathname === "/setup") {
    return NextResponse.redirect(new URL(authenticated ? "/" : "/login", request.url));
  }

  if (pathname === "/login" || PUBLIC_AUTH_APIS.has(pathname)) {
    if (pathname === "/login" && authenticated) return NextResponse.redirect(new URL("/", request.url));
    return NextResponse.next();
  }

  if (authenticated) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|cliphouse-logo(?:\\.svg|\\.jpg)).*)"],
};
