import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/playlists/[id]/videos - add video to playlist
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: playlistId } = await params;
  const body = (await request.json().catch(() => ({}))) as Partial<{ videoId: string }>;

  const videoId = body.videoId?.trim();
  if (!videoId) {
    return NextResponse.json({ error: "videoId is required." }, { status: 400 });
  }

  try {
    // Check if video already in playlist
    const existing = await prisma.videoToPlaylist.findUnique({
      where: { videoId_playlistId: { videoId, playlistId } },
    });

    if (existing) {
      return NextResponse.json({ error: "Video already in this playlist." }, { status: 409 });
    }

    await prisma.videoToPlaylist.create({
      data: { videoId, playlistId },
    });

    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Could not add video to playlist." }, { status: 404 });
  }
}

// DELETE /api/playlists/[id]/videos - remove video from playlist
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: playlistId } = await params;
  const body = (await request.json().catch(() => ({}))) as Partial<{ videoId: string }>;

  const videoId = body.videoId?.trim();
  if (!videoId) {
    return NextResponse.json({ error: "videoId is required." }, { status: 400 });
  }

  try {
    await prisma.videoToPlaylist.delete({
      where: { videoId_playlistId: { videoId, playlistId } },
    });

    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Video not found in playlist." }, { status: 404 });
  }
}
