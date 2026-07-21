import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, deleteSession, sessionCookieOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  await deleteSession(request.cookies.get(AUTH_COOKIE_NAME)?.value);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE_NAME, "", { ...sessionCookieOptions(request), maxAge: 0 });
  return response;
}
