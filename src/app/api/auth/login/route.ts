import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, createSession, sessionCookieOptions, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Attempt = { failures: number; blockedUntil: number };
const attempts = new Map<string, Attempt>();
const MAX_FAILURES = 5;
const BLOCK_DURATION_MS = 15 * 60 * 1000;

function clientKey(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function POST(request: NextRequest) {
  const owner = await prisma.owner.findUnique({ where: { id: "owner" } });
  if (!owner) return NextResponse.json({ error: "ClipHouse setup is required." }, { status: 428 });

  const key = clientKey(request);
  const now = Date.now();
  const current = attempts.get(key);
  if (current?.blockedUntil && current.blockedUntil > now) {
    return NextResponse.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as { password?: unknown } | null;
  const password = typeof body?.password === "string" ? body.password : "";
  if (!(await verifyPassword(password, owner.passwordHash))) {
    const failures = (current?.blockedUntil && current.blockedUntil <= now ? 0 : current?.failures ?? 0) + 1;
    attempts.set(key, { failures, blockedUntil: failures >= MAX_FAILURES ? now + BLOCK_DURATION_MS : 0 });
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  attempts.delete(key);
  const session = await createSession();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE_NAME, session.token, sessionCookieOptions(request));
  return response;
}
