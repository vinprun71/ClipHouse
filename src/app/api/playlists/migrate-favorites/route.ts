import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/playlists/migrate-favorites - migrate old favorites into the default playlist.
export async function POST() {
  try {
    const favoritedVideos = await prisma.video.findMany({
      where: { favorite: true },
      select: { id: true },
    });

    let playlist = await prisma.playlist.findFirst({
      where: { name: "My Videos" },
    });

    if (!playlist && favoritedVideos.length === 0) {
      return NextResponse.json({ migrated: 0, playlist: null });
    }

    if (!playlist) {
      playlist = await prisma.playlist.create({
        data: { name: "My Videos" },
      });
    }

    const existingVideoIds = new Set(
      (
        await prisma.videoToPlaylist.findMany({
          where: { playlistId: playlist.id },
          select: { videoId: true },
        })
      ).map((playlistVideo) => playlistVideo.videoId),
    );

    const videosToAdd = favoritedVideos.filter((video) => !existingVideoIds.has(video.id));

    for (const video of videosToAdd) {
      await prisma.videoToPlaylist.create({
        data: { videoId: video.id, playlistId: playlist.id },
      });
    }

    return NextResponse.json({
      migrated: videosToAdd.length,
      playlist: { id: playlist.id, name: playlist.name, createdAt: playlist.createdAt.toISOString() },
    });
  } catch {
    return NextResponse.json({ error: "Migration failed." }, { status: 500 });
  }
}
