import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, createSession, hashPassword, sessionCookieOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { setupTokenMatches } from "@/lib/setup-token";

export async function POST(request: NextRequest) {
  if ((await prisma.owner.count()) > 0) {
    return NextResponse.json({ error: "ClipHouse is already configured." }, { status: 409 });
  }

  const body = (await request.json().catch(() => null)) as { token?: unknown; password?: unknown } | null;
  const token = typeof body?.token === "string" ? body.token : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!(await setupTokenMatches(token))) {
    return NextResponse.json({ error: "The one-time setup token is incorrect." }, { status: 401 });
  }
  if (password.length < 10) {
    return NextResponse.json({ error: "Use at least 10 characters for your password." }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  try {
    await prisma.owner.create({ data: { passwordHash } });
  } catch {
    return NextResponse.json({ error: "ClipHouse was already claimed by another setup request." }, { status: 409 });
  }

  const session = await createSession();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE_NAME, session.token, sessionCookieOptions(request));
  return response;
}
