import { NextRequest, NextResponse } from "next/server";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

export const runtime = "nodejs";

const CACHE_DIR = path.join(process.cwd(), ".cache", "instagram-thumbnails");
const MAX_AGE = 60 * 60 * 24 * 30;

export async function GET(_request: NextRequest, { params }: { params: Promise<{ shortcode: string }> }) {
  const { shortcode } = await params;

  if (!/^[A-Za-z0-9_-]{5,32}$/.test(shortcode)) {
    return NextResponse.json({ error: "Invalid Instagram shortcode." }, { status: 400 });
  }

  await mkdir(CACHE_DIR, { recursive: true });
  const outputPath = path.join(CACHE_DIR, `${shortcode}.jpg`);

  if (!(await fileExists(outputPath))) {
    try {
      await cacheInstagramOgImage(shortcode, outputPath);
    } catch {
      const videoUrl = `https://vxinstagram.com/offload/${shortcode}/0.mp4`;
      try {
        await extractFrame(videoUrl, outputPath);
      } catch {
        // vxinstagram sometimes returns 404 until the reel page has been requested once.
        await warmInstagramProxy(shortcode);
        await extractFrame(videoUrl, outputPath);
      }
    }
  }

  let image: Buffer;
  try {
    image = await readFile(outputPath);
  } catch {
    return NextResponse.json({ error: "Thumbnail not found." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(image), {
    headers: {
      "content-type": "image/jpeg",
      "cache-control": `public, max-age=${MAX_AGE}, immutable`,
    },
  });
}

async function cacheInstagramOgImage(shortcode: string, outputPath: string) {
  const response = await fetch(`https://www.instagram.com/reel/${shortcode}/`, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; ClipHouse/0.1; +https://example.local/cliphouse)",
      accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) throw new Error(`Instagram returned ${response.status}`);

  const html = await response.text();
  const imageUrl = pickMeta(html, ["og:image", "twitter:image"]);
  if (!imageUrl) throw new Error("Instagram page did not include an image thumbnail.");

  const imageResponse = await fetch(imageUrl, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; ClipHouse/0.1; +https://example.local/cliphouse)",
      accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(10000),
  });

  const contentType = imageResponse.headers.get("content-type") ?? "";
  if (!imageResponse.ok || !contentType.toLowerCase().startsWith("image/")) {
    throw new Error(`Instagram image returned ${imageResponse.status}`);
  }

  const bytes = Buffer.from(await imageResponse.arrayBuffer());
  if (!bytes.length) throw new Error("Instagram image response was empty.");

  await writeFile(outputPath, bytes);
}

async function warmInstagramProxy(shortcode: string) {
  await fetch(`https://vxinstagram.com/reel/${shortcode}/`, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; ClipHouse/0.1; +https://example.local/cliphouse)",
      accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(7000),
  }).catch(() => null);
}

async function fileExists(filePath: string) {
  try {
    const stats = await stat(filePath);
    return stats.isFile() && stats.size > 0;
  } catch {
    return false;
  }
}

function extractFrame(videoUrl: string, outputPath: string) {
  return new Promise<void>((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-ss",
      "00:00:00.5",
      "-i",
      videoUrl,
      "-frames:v",
      "1",
      "-vf",
      "scale=720:-1",
      "-q:v",
      "3",
      outputPath,
    ]);

    let stderr = "";
    ffmpeg.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    ffmpeg.on("error", reject);
    ffmpeg.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr || `ffmpeg exited with ${code}`));
    });
  });
}

function pickMeta(html: string, names: string[]) {
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const patterns = [
      new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
      new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escaped}["'][^>]*>`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${escaped}["'][^>]*>`, "i"),
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern)?.[1];
      if (match) return decodeHtml(match);
    }
  }

  return "";
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}
