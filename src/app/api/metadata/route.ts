import { NextRequest, NextResponse } from "next/server";
import { cacheThumbnail } from "@/lib/thumbnail-cache";
import { detectPlatform, suggestCategory, tagsFromText } from "@/lib/videos";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { url } = (await request.json().catch(() => ({}))) as { url?: string };

  if (!url || !isHttpUrl(url)) {
    return NextResponse.json({ error: "Enter a valid public URL." }, { status: 400 });
  }

  const platform = detectPlatform(url);
  let title = fallbackTitle(url);
  let description = "";
  let image = "";
  let creator = "";

  try {
    const response = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; ClipHouse/0.1; +https://example.local/cliphouse)",
        accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(7000),
    });

    const contentType = response.headers.get("content-type") ?? "";
    if (response.ok && contentType.includes("text/html")) {
      const html = await response.text();
      title = pickMeta(html, ["og:title", "twitter:title"]) || pickTitle(html) || title;
      description = pickMeta(html, ["og:description", "twitter:description", "description"]);
      image = pickMeta(html, ["og:image", "twitter:image"]);
      creator = pickMeta(html, ["twitter:creator", "author"]);
    }
  } catch {
    // Many social platforms block anonymous metadata fetches. v0 still works with URL-derived fallback data.
  }

  if (platform === "X / Twitter" && (!image || title === fallbackTitle(url) || !creator)) {
    const xMetadata = await fetchXMetadata(url);
    title = cleanMeaningfulTitle(xMetadata.title) || title;
    description = xMetadata.description || description;
    image = xMetadata.thumbnail || image;
    creator = xMetadata.creator || creator;
  }

  const instagramShortcode = platform === "Instagram" ? parseInstagramShortcode(url) : null;
  if (instagramShortcode) image = `/api/instagram-thumbnail/${instagramShortcode}`;
  else image = await cacheThumbnail(image);

  const combined = `${title} ${description} ${url}`;

  return NextResponse.json({
    url,
    title: clean(title),
    description: clean(description),
    thumbnail: image,
    creator: clean(creator),
    platform,
    category: suggestCategory(combined),
    tags: tagsFromText(combined),
  });
}

type XMetadata = {
  title?: string;
  description?: string;
  thumbnail?: string;
  creator?: string;
};

type VxTwitterMedia = {
  thumbnail_url?: unknown;
  type?: unknown;
};

type VxTwitterResponse = {
  text?: unknown;
  user_name?: unknown;
  user_screen_name?: unknown;
  media_extended?: unknown;
};

async function fetchXMetadata(url: string): Promise<XMetadata> {
  const status = parseXStatus(url);
  if (!status) return {};

  try {
    const response = await fetch(`https://api.vxtwitter.com/${status.username}/status/${status.id}`, {
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; ClipHouse/0.1; +https://example.local/cliphouse)",
        accept: "application/json",
      },
      signal: AbortSignal.timeout(7000),
    });

    if (!response.ok) return {};

    const data = (await response.json()) as VxTwitterResponse;
    const media = Array.isArray(data.media_extended) ? (data.media_extended as VxTwitterMedia[]) : [];
    const firstThumbnail = media
      .map((item) => (typeof item.thumbnail_url === "string" ? item.thumbnail_url : ""))
      .find(Boolean);
    const screenName = typeof data.user_screen_name === "string" ? data.user_screen_name : status.username;
    const displayName = typeof data.user_name === "string" ? data.user_name : "";
    const tweetText = typeof data.text === "string" ? cleanTweetText(data.text) : "";

    const creator = displayName ? `${displayName} (@${screenName})` : `@${screenName}`;

    return {
      title: tweetText || `${displayName || `@${screenName}`} on X`,
      description: tweetText,
      thumbnail: firstThumbnail,
      creator,
    };
  } catch {
    return {};
  }
}

function parseInstagramShortcode(value: string) {
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.replace(/^www\./, "").replace(/^m\./, "");
    if (!hostname.endsWith("instagram.com")) return null;

    const parts = parsed.pathname.split("/").filter(Boolean);
    const shortcodeIndex = parts.findIndex((part) => ["p", "reel", "tv"].includes(part.toLowerCase()));
    const shortcode = shortcodeIndex >= 0 ? parts[shortcodeIndex + 1] : null;
    return shortcode && /^[A-Za-z0-9_-]{5,32}$/.test(shortcode) ? shortcode : null;
  } catch {
    return null;
  }
}

function parseXStatus(value: string) {
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.replace(/^www\./, "").replace(/^mobile\./, "");
    if (!hostname.endsWith("x.com") && !hostname.endsWith("twitter.com")) return null;

    const parts = parsed.pathname.split("/").filter(Boolean);
    const statusIndex = parts.findIndex((part) => part.toLowerCase() === "status");
    if (statusIndex < 1) return null;

    const username = parts[statusIndex - 1];
    const id = parts[statusIndex + 1];
    if (!username || !/^\d+$/.test(id ?? "")) return null;

    return { username, id };
  } catch {
    return null;
  }
}

function cleanTweetText(value: string) {
  const cleaned = clean(value).replace(/https?:\/\/t\.co\/\S+/gi, "").trim();
  return cleaned.length > 2 ? cleaned : "";
}

function cleanMeaningfulTitle(value?: string) {
  if (!value) return "";
  const cleaned = clean(value);
  return cleaned.length > 2 ? cleaned : "";
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
    const host = parsed.hostname.replace(/^www\./, "");
    const path = parsed.pathname.split("/").filter(Boolean).slice(-2).join(" / ");
    return path ? `${host} · ${path}` : host;
  } catch {
    return "Untitled video";
  }
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

function pickTitle(html: string) {
  return decodeHtml(html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? "");
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

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}
