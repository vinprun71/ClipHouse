import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const playlists = await prisma.playlist.findMany({
    include: {
      videos: {
        include: { video: true },
        orderBy: { addedAt: "desc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(
    playlists.map((playlist) => ({
      id: playlist.id,
      name: playlist.name,
      createdAt: playlist.createdAt.toISOString(),
      videos: playlist.videos.map((vp) => ({
        id: vp.video.id,
        url: vp.video.url,
        title: vp.video.title,
        platform: vp.video.platform,
        creator: vp.video.creator ?? undefined,
        thumbnail: vp.video.thumbnail ?? undefined,
        category: vp.video.category,
        tags: parseTags(vp.video.tags),
        notes: vp.video.notes ?? undefined,
        favorite: vp.video.favorite,
        createdAt: vp.video.createdAt.toISOString(),
        addedAt: vp.addedAt.toISOString(),
      })),
    })),
  );
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Partial<{ name: string }>;

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "Playlist name is required." }, { status: 400 });
  }

  const playlist = await prisma.playlist.create({
    data: { name },
  });

  return NextResponse.json({ id: playlist.id, name: playlist.name, createdAt: playlist.createdAt.toISOString(), videos: [] }, { status: 201 });
}

function parseTags(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((tag): tag is string => typeof tag === "string") : [];
  } catch {
    return [];
  }
}
