import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, createSession, hashPassword, sessionCookieOptions, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const owner = await prisma.owner.findUnique({ where: { id: "owner" } });
  if (!owner) return NextResponse.json({ error: "ClipHouse setup is required." }, { status: 428 });

  const body = (await request.json().catch(() => null)) as { currentPassword?: unknown; newPassword?: unknown } | null;
  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";
  if (!(await verifyPassword(currentPassword, owner.passwordHash))) {
    return NextResponse.json({ error: "Your current password is incorrect." }, { status: 401 });
  }
  if (newPassword.length < 10) {
    return NextResponse.json({ error: "Use at least 10 characters for the new password." }, { status: 400 });
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.owner.update({ where: { id: "owner" }, data: { passwordHash } }),
    prisma.session.deleteMany(),
  ]);

  const session = await createSession();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE_NAME, session.token, sessionCookieOptions(request));
  return response;
}
