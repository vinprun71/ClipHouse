import { NextResponse } from "next/server";
import { readCachedThumbnail } from "@/lib/thumbnail-cache";

export const runtime = "nodejs";

const MAX_AGE = 60 * 60 * 24 * 365;

export async function GET(_request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  const cachedThumbnail = await readCachedThumbnail(filename);

  if (!cachedThumbnail) {
    return NextResponse.json({ error: "Thumbnail not found." }, { status: 404 });
  }

  return new NextResponse(cachedThumbnail.image, {
    headers: {
      "content-type": cachedThumbnail.contentType,
      "cache-control": `public, max-age=${MAX_AGE}, immutable`,
    },
  });
}
