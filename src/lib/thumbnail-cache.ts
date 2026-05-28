import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const THUMBNAIL_CACHE_DIR = path.join(process.cwd(), ".cache", "thumbnails");
const LEGACY_PUBLIC_THUMBNAIL_DIR = path.join(process.cwd(), "public", "cached-thumbnails");
const THUMBNAIL_ROUTE = "/api/thumbnails";
const MAX_THUMBNAIL_BYTES = 5 * 1024 * 1024;

const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const IMAGE_CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export async function cacheThumbnail(thumbnailUrl?: string | null) {
  const url = thumbnailUrl?.trim();
  if (!url || !isRemoteHttpUrl(url)) return url || "";

  try {
    await mkdir(THUMBNAIL_CACHE_DIR, { recursive: true });

    const response = await fetch(url, {
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; ClipHouse/0.1; +https://example.local/cliphouse)",
        accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return url;

    const contentType = normalizeContentType(response.headers.get("content-type"));
    const extension = IMAGE_EXTENSIONS[contentType];
    if (!extension) return url;

    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > MAX_THUMBNAIL_BYTES) return url;

    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length || bytes.length > MAX_THUMBNAIL_BYTES) return url;

    const hash = createHash("sha256").update(url).digest("hex").slice(0, 32);
    const filename = `${hash}.${extension}`;
    const outputPath = path.join(THUMBNAIL_CACHE_DIR, filename);

    if (!(await existingFileHasBytes(outputPath))) {
      await writeFile(outputPath, bytes, { flag: "wx" }).catch(async (error: NodeJS.ErrnoException) => {
        if (error.code !== "EEXIST") throw error;
      });
    }

    return `${THUMBNAIL_ROUTE}/${filename}`;
  } catch {
    return url;
  }
}

export async function readCachedThumbnail(filename: string) {
  if (!isSafeThumbnailFilename(filename)) return null;

  for (const directory of [THUMBNAIL_CACHE_DIR, LEGACY_PUBLIC_THUMBNAIL_DIR]) {
    try {
      const image = await readFile(path.join(directory, filename));
      return { image, contentType: contentTypeForFilename(filename) };
    } catch {
      // Try the next cache location. Public thumbnails are legacy files from older builds.
    }
  }

  return null;
}

function isRemoteHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeContentType(value: string | null) {
  return (value ?? "").split(";")[0].trim().toLowerCase();
}

async function existingFileHasBytes(filePath: string) {
  try {
    const stats = await stat(filePath);
    return stats.isFile() && stats.size > 0;
  } catch {
    return false;
  }
}

function isSafeThumbnailFilename(value: string) {
  return /^[a-f0-9]{32}\.(jpg|png|webp|gif)$/.test(value);
}

function contentTypeForFilename(filename: string) {
  const extension = filename.split(".").pop() ?? "";
  return IMAGE_CONTENT_TYPES[extension] ?? "application/octet-stream";
}
