import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CATEGORIES, Category, detectPlatform } from "@/lib/videos";

export async function GET() {
  const videos = await prisma.video.findMany({ orderBy: { createdAt: "desc" } });

  return NextResponse.json(videos.map(toClientVideo));
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Partial<{
    url: string;
    title: string;
    platform: string;
    creator: string;
    thumbnail: string;
    category: string;
    tags: string[];
    notes: string;
    favorite: boolean;
    playlistId: string;
    playlistName: string;
  }>;

  const url = body.url?.trim();
  if (!url || !isHttpUrl(url)) {
    return NextResponse.json({ error: "Enter a valid public URL." }, { status: 400 });
  }

  const category = normalizeCategory(body.category);
  const title = body.title?.trim() || fallbackTitle(url);
  const tags = Array.isArray(body.tags) ? body.tags.map((tag) => tag.trim()).filter(Boolean) : [];
  const detectedPlatform = detectPlatform(url);
  const platform = detectedPlatform !== "Other" ? detectedPlatform : body.platform?.trim() || "Other";

  const playlistId = body.playlistId?.trim();
  const playlistName = body.playlistName?.trim();

  let targetPlaylistId = playlistId || null;
  let targetPlaylistName: string | null = null;

  if (playlistName) {
    const playlist = await prisma.playlist.create({ data: { name: playlistName } });
    targetPlaylistId = playlist.id;
    targetPlaylistName = playlist.name;
  } else if (playlistId) {
    const playlist = await prisma.playlist.findUnique({ where: { id: playlistId } });
    if (!playlist) return NextResponse.json({ error: "Choose a valid playlist." }, { status: 400 });
    targetPlaylistName = playlist.name;
  }

  const video = await prisma.video.create({
    data: {
      url,
      title,
      platform,
      creator: body.creator?.trim() || null,
      thumbnail: body.thumbnail?.trim() || null,
      category,
      tags: JSON.stringify(tags),
      notes: body.notes?.trim() || null,
      favorite: Boolean(body.favorite),
    },
  });

  if (targetPlaylistId) {
    await prisma.videoToPlaylist.create({
      data: { videoId: video.id, playlistId: targetPlaylistId },
    });
  }

  return NextResponse.json({ ...toClientVideo(video), playlist: targetPlaylistId ? { id: targetPlaylistId, name: targetPlaylistName } : undefined }, { status: 201 });
}

function toClientVideo(video: {
  id: string;
  url: string;
  title: string;
  platform: string;
  creator: string | null;
  thumbnail: string | null;
  category: string;
  tags: string;
  notes: string | null;
  favorite: boolean;
  createdAt: Date;
}) {
  return {
    id: video.id,
    url: video.url,
    title: video.title,
    platform: video.platform,
    creator: video.creator ?? undefined,
    thumbnail: video.thumbnail ?? undefined,
    category: video.category,
    tags: parseTags(video.tags),
    notes: video.notes ?? undefined,
    favorite: video.favorite,
    createdAt: video.createdAt.toISOString(),
  };
}

function parseTags(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((tag): tag is string => typeof tag === "string") : [];
  } catch {
    return [];
  }
}

function normalizeCategory(value?: string): Category {
  return CATEGORIES.includes(value as Category) ? (value as Category) : "Other";
}

function isHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function fallbackTitle(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "Untitled video";
  }
}
