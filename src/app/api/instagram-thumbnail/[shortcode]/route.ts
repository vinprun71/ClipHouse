import { NextRequest, NextResponse } from "next/server";
import { mkdir, readFile, stat } from "node:fs/promises";
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
    const videoUrl = `https://vxinstagram.com/offload/${shortcode}/0.mp4`;
    try {
      await extractFrame(videoUrl, outputPath);
    } catch {
      // vxinstagram sometimes returns 404 until the reel page has been requested once.
      await warmInstagramProxy(shortcode);
      await extractFrame(videoUrl, outputPath);
    }
  }

  const image = await readFile(outputPath);
  return new NextResponse(image, {
    headers: {
      "content-type": "image/jpeg",
      "cache-control": `public, max-age=${MAX_AGE}, immutable`,
    },
  });
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
