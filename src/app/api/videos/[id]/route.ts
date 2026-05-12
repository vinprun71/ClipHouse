import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CATEGORIES, Category } from "@/lib/videos";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Partial<{
    favorite: boolean;
    tags: string[];
    category: Category;
    title: string;
    creator: string | null;
  }>;
  const data: { favorite?: boolean; tags?: string; category?: Category; title?: string; creator?: string | null } = {};

  if (typeof body.favorite === "boolean") data.favorite = body.favorite;
  if (typeof body.title === "string") {
    const title = body.title.trim();
    if (!title) return NextResponse.json({ error: "Title cannot be blank." }, { status: 400 });
    data.title = title;
  }
  if (typeof body.creator === "string") data.creator = body.creator.trim() || null;
  if (body.creator === null) data.creator = null;
  if (Array.isArray(body.tags)) {
    data.tags = JSON.stringify(body.tags.map((tag) => tag.trim().replace(/^#/, "")).filter(Boolean));
  }
  if (typeof body.category === "string") {
    if (!CATEGORIES.includes(body.category as Category)) {
      return NextResponse.json({ error: "Choose a valid category." }, { status: 400 });
    }
    data.category = body.category as Category;
  }

  if (!Object.keys(data).length) {
    return NextResponse.json({ error: "No video updates provided." }, { status: 400 });
  }

  try {
    const video = await prisma.video.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      id: video.id,
      title: video.title,
      creator: video.creator,
      favorite: video.favorite,
      category: video.category,
      tags: parseTags(video.tags),
    });
  } catch {
    return NextResponse.json({ error: "Video not found." }, { status: 404 });
  }
}

function parseTags(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((tag): tag is string => typeof tag === "string") : [];
  } catch {
    return [];
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    await prisma.video.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Video not found." }, { status: 404 });
  }
}
