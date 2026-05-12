import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Partial<{ name: string }>;

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "Playlist name is required." }, { status: 400 });
  }

  try {
    const playlist = await prisma.playlist.update({
      where: { id },
      data: { name },
    });

    return NextResponse.json({ id: playlist.id, name: playlist.name });
  } catch {
    return NextResponse.json({ error: "Playlist not found." }, { status: 404 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    await prisma.playlist.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Playlist not found." }, { status: 404 });
  }
}
