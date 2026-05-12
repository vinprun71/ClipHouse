"use client";

import Link from "next/link";
import { BrandMark } from "@/app/BrandMark";
import { useEffect, useMemo, useState } from "react";
import { CATEGORIES, Category, Platform, SavedVideo } from "@/lib/videos";

export default function LibraryPage() {
  const [videos, setVideos] = useState<SavedVideo[]>([]);
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category | "All">("All");
  const [activePlatform, setActivePlatform] = useState<Platform | "All">("All");
  const [copiedVideoId, setCopiedVideoId] = useState<string | null>(null);
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [creatorDraft, setCreatorDraft] = useState("");
  const [categoryDraft, setCategoryDraft] = useState<Category>("Other");
  const [tagDraft, setTagDraft] = useState("");
  const [playlists, setPlaylists] = useState<{ id: string; name: string }[]>([]);
  const [playlistPickerVideoId, setPlaylistPickerVideoId] = useState<string | null>(null);
  const [playlistDraftName, setPlaylistDraftName] = useState("");
  const [playlistFeedback, setPlaylistFeedback] = useState<{ videoId: string; message: string } | null>(null);

  useEffect(() => {
    fetch("/api/videos")
      .then((response) => response.json())
      .then(setVideos)
      .catch(() => setStatus("Could not load saved videos."));
    fetch("/api/playlists")
      .then((response) => response.json())
      .then((data: { id: string; name: string }[]) => setPlaylists(data))
      .catch(() => {});
  }, []);

  const filteredVideos = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return videos.filter((video) => {
      const matchesCategory = activeCategory === "All" || video.category === activeCategory;
      const matchesPlatform = activePlatform === "All" || video.platform === activePlatform;
      const searchable = [
        video.title,
        video.platform,
        video.creator,
        video.category,
        video.notes,
        video.url,
        ...video.tags,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesCategory && matchesPlatform && (!needle || searchable.includes(needle));
    });
  }, [activeCategory, activePlatform, query, videos]);

  const categoryCounts = useMemo(() => {
    const byCategory = new Map<Category | "All", number>([["All", videos.length]]);
    for (const category of CATEGORIES) byCategory.set(category, 0);
    for (const video of videos) byCategory.set(video.category, (byCategory.get(video.category) ?? 0) + 1);
    return byCategory;
  }, [videos]);

  const platformCounts = useMemo(() => {
    const byPlatform = new Map<Platform | "All", number>([["All", videos.length]]);
    for (const video of videos) byPlatform.set(video.platform, (byPlatform.get(video.platform) ?? 0) + 1);
    return byPlatform;
  }, [videos]);

  const platforms = useMemo(() => Array.from(new Set(videos.map((video) => video.platform))).sort(), [videos]);

  async function copyVideoUrl(video: SavedVideo) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(video.url);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = video.url;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const copied = document.execCommand("copy");
        document.body.removeChild(textArea);
        if (!copied) throw new Error("Copy command failed.");
      }

      setCopiedVideoId(video.id);
      setStatus(`Copied "${video.title}" link to clipboard.`);
      window.setTimeout(() => setCopiedVideoId((current) => (current === video.id ? null : current)), 1800);
    } catch {
      setStatus("Could not copy the video link. Try opening the video and copying it manually.");
    }
  }

  async function addToPlaylist(video: SavedVideo, playlistId: string, playlistName?: string) {
    try {
      const response = await fetch(`/api/playlists/${playlistId}/videos`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ videoId: video.id }),
      });

      if (response.status === 409) {
        setPlaylistFeedback({ videoId: video.id, message: `Already in ${playlistName ?? playlists.find((item) => item.id === playlistId)?.name ?? "that playlist"}.` });
      } else if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not add to playlist.");
      } else {
        const playlist = playlists.find((item) => item.id === playlistId);
        setPlaylistFeedback({ videoId: video.id, message: `Added to ${playlistName ?? playlist?.name ?? "playlist"}.` });
      }
    } catch (error) {
      setPlaylistFeedback({ videoId: video.id, message: error instanceof Error ? error.message : "Could not add to playlist." });
    } finally {
      setPlaylistPickerVideoId(null);
      setPlaylistDraftName("");
    }
  }

  async function createPlaylistAndAdd(video: SavedVideo) {
    const name = playlistDraftName.trim();
    if (!name) {
      setPlaylistFeedback({ videoId: video.id, message: "Name the new playlist first." });
      return;
    }

    try {
      const response = await fetch("/api/playlists", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const playlist = await response.json();
      if (!response.ok) throw new Error(playlist.error ?? "Could not create playlist.");

      setPlaylists((current) => [...current, { id: playlist.id, name: playlist.name }]);
      await addToPlaylist(video, playlist.id, playlist.name);
    } catch (error) {
      setPlaylistFeedback({ videoId: video.id, message: error instanceof Error ? error.message : "Could not create playlist." });
    }
  }

  function startEditingDetails(video: SavedVideo) {
    setEditingVideoId(video.id);
    setTitleDraft(video.title);
    setCreatorDraft(video.creator ?? "");
    setCategoryDraft(video.category);
    setTagDraft(video.tags.join(", "));
  }

  function cancelEditingDetails() {
    setEditingVideoId(null);
    setTitleDraft("");
    setCreatorDraft("");
    setCategoryDraft("Other");
    setTagDraft("");
  }

  async function saveDetails(video: SavedVideo) {
    const title = titleDraft.trim();
    if (!title) {
      setStatus("Title cannot be blank.");
      return;
    }

    const previous = videos;
    const creator = creatorDraft.trim();
    const tags = tagDraft
      .split(",")
      .map((tag) => tag.trim().replace(/^#/, ""))
      .filter(Boolean);

    setVideos((current) => current.map((item) => (item.id === video.id ? { ...item, title, creator: creator || undefined, category: categoryDraft, tags } : item)));

    try {
      const response = await fetch(`/api/videos/${video.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, creator: creator || null, category: categoryDraft, tags }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error ?? "Could not update video details.");

      setVideos((current) =>
        current.map((item) =>
          item.id === video.id
            ? {
                ...item,
                title: data.title ?? title,
                creator: data.creator ?? undefined,
                category: data.category ?? categoryDraft,
                tags: data.tags ?? tags,
              }
            : item,
        ),
      );
      cancelEditingDetails();
      setStatus(`Updated "${data.title ?? title}".`);
    } catch (error) {
      setVideos(previous);
      setStatus(error instanceof Error ? error.message : "Could not update video details.");
    }
  }

  async function removeVideo(id: string) {
    const previous = videos;
    setVideos((current) => current.filter((video) => video.id !== id));

    try {
      const response = await fetch(`/api/videos/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Could not delete video.");
    } catch (error) {
      setVideos(previous);
      setStatus(error instanceof Error ? error.message : "Could not delete video.");
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070711] text-zinc-100">
      <Background />

      <section className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-6 sm:px-8 lg:px-10 lg:py-10">
        <nav className="flex flex-col gap-3 rounded-[1.75rem] border border-white/10 bg-white/[0.06] px-4 py-3 shadow-2xl shadow-black/25 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:rounded-full">
          <Link className="flex items-center gap-3" href="/">
            <BrandMark />
            <p className="text-sm font-bold tracking-wide">ClipHouse</p>
          </Link>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <Link className="rounded-full border border-pink-300/25 bg-pink-300/10 px-4 py-2 text-center text-sm text-pink-100 transition hover:bg-pink-300/20" href="/playlists">
              Playlists
            </Link>
            <Link className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-center text-sm text-zinc-300 transition hover:bg-white/10" href="/">
              Save new video
            </Link>
          </div>
        </nav>

        <header className="glass-panel p-6 sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-4 inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-sm text-cyan-100">
                Library
              </p>
              <h1 className="text-4xl font-black tracking-tight text-white sm:text-6xl">Saved videos</h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-zinc-300">
                Search and filter everything you saved before the algorithm buried it.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center sm:w-64">
              <MiniStat label="Saved" value={videos.length} />
              <MiniStat label="Categories" value={new Set(videos.map((video) => video.category)).size} />
            </div>
          </div>
        </header>

        <section className="space-y-5">
          {status ? <p className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-zinc-300">{status}</p> : null}
          <div className="glass-panel p-4 sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">⌕</span>
                <input
                  className="input pl-10"
                  placeholder="Search: funny golf swing, tech setup, Taylor Swift..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:flex sm:items-end">
                <label className="space-y-1.5">
                  <span className="block px-2 text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">Category</span>
                  <span className="relative block">
                    <select
                      className="min-h-12 w-full appearance-none rounded-full border border-white/10 bg-white/[0.07] px-4 py-2 pr-9 text-sm font-semibold text-zinc-100 outline-none transition hover:bg-white/10 focus:border-cyan-200/70 focus:ring-4 focus:ring-cyan-300/10 sm:w-44"
                      value={activeCategory}
                      onChange={(event) => setActiveCategory(event.target.value as Category | "All")}
                    >
                      <option value="All">All</option>
                      {CATEGORIES.map((category) => (
                        <option key={category} value={category}>{category} · {categoryCounts.get(category) ?? 0}</option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-zinc-400">▾</span>
                  </span>
                </label>
                <label className="space-y-1.5">
                  <span className="block px-2 text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">Platform</span>
                  <span className="relative block">
                    <select
                      className="min-h-12 w-full appearance-none rounded-full border border-white/10 bg-white/[0.07] px-4 py-2 pr-9 text-sm font-semibold text-zinc-100 outline-none transition hover:bg-white/10 focus:border-cyan-200/70 focus:ring-4 focus:ring-cyan-300/10 sm:w-44"
                      value={activePlatform}
                      onChange={(event) => setActivePlatform(event.target.value as Platform | "All")}
                    >
                      <option value="All">All</option>
                      {platforms.map((platform) => (
                        <option key={platform} value={platform}>{platform} · {platformCounts.get(platform) ?? 0}</option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-zinc-400">▾</span>
                  </span>
                </label>
                <Link className="btn-primary col-span-2 text-center sm:col-span-1" href="/">Save another</Link>
              </div>
            </div>
          </div>

          {filteredVideos.length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredVideos.map((video) => (
                <article className="group overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.055] shadow-2xl shadow-black/20 backdrop-blur-xl transition hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.075]" key={video.id}>
                  <a
                    aria-label={`Open ${video.title}`}
                    className="relative block aspect-video overflow-hidden bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:ring-offset-2 focus:ring-offset-zinc-950"
                    href={video.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {video.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" src={video.thumbnail} />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-violet-500/30 via-cyan-500/10 to-fuchsia-500/20 text-6xl">
                        {platformEmoji(video.platform)}
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="rounded-full border border-white/10 bg-black/45 px-3 py-1 text-xs font-medium text-zinc-200 backdrop-blur-md">
                          {platformEmoji(video.platform)} {video.platform}
                        </span>
                        <span className="rounded-full bg-cyan-200 px-3 py-1 text-xs font-bold text-zinc-950">{video.category}</span>
                      </div>
                    </div>
                  </a>
                  <div className="space-y-3 p-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{new Date(video.createdAt).toLocaleDateString()}</p>
                      <h3 className="mt-1 text-xl font-bold leading-tight text-white">{video.title}</h3>
                    </div>
                    {video.creator ? <p className="text-sm text-zinc-400">Creator: {video.creator}</p> : null}
                    {video.notes ? <p className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm leading-6 text-zinc-300">{video.notes}</p> : null}
                    {editingVideoId === video.id ? (
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="sm:col-span-2">
                            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500" htmlFor={`title-${video.id}`}>
                              Title
                            </label>
                            <input
                              className="input mt-2"
                              id={`title-${video.id}`}
                              placeholder="Video title"
                              value={titleDraft}
                              onChange={(event) => setTitleDraft(event.target.value)}
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500" htmlFor={`creator-${video.id}`}>
                              Creator
                            </label>
                            <input
                              className="input mt-2"
                              id={`creator-${video.id}`}
                              placeholder="Creator name or @handle"
                              value={creatorDraft}
                              onChange={(event) => setCreatorDraft(event.target.value)}
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500" htmlFor={`category-${video.id}`}>
                              Category
                            </label>
                            <select
                              className="input mt-2"
                              id={`category-${video.id}`}
                              value={categoryDraft}
                              onChange={(event) => setCategoryDraft(event.target.value as Category)}
                            >
                              {CATEGORIES.map((category) => (
                                <option className="bg-zinc-950 text-zinc-100" key={category} value={category}>
                                  {category}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500" htmlFor={`tags-${video.id}`}>
                              Tags
                            </label>
                            <input
                              className="input mt-2"
                              id={`tags-${video.id}`}
                              placeholder="funny, golf, dad"
                              value={tagDraft}
                              onChange={(event) => setTagDraft(event.target.value)}
                            />
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button className="rounded-full border border-cyan-200/25 px-4 py-2 text-sm text-cyan-100 transition hover:bg-cyan-300/10" onClick={() => saveDetails(video)} type="button">
                            Save details
                          </button>
                          <button
                            className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/10"
                            onClick={cancelEditingDetails}
                            type="button"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {video.tags.map((tag) => (
                          <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-zinc-300" key={tag}>#{tag}</span>
                        ))}
                      </div>
                    )}
                    <div className="space-y-2 pt-2">
                      <div className="flex flex-wrap justify-center gap-2">
                        <a className="min-h-10 rounded-full border border-white/10 bg-white/[0.07] px-4 py-2 text-center text-sm font-semibold text-zinc-100 transition hover:bg-white/10" href={video.url} target="_blank" rel="noreferrer">Open video</a>
                        <button
                          className="min-h-10 rounded-full border border-cyan-200/25 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/10"
                          onClick={() => copyVideoUrl(video)}
                          type="button"
                        >
                          {copiedVideoId === video.id ? "Copied!" : "Share"}
                        </button>
                        <button
                          className="min-h-10 rounded-full border border-pink-300/25 px-4 py-2 text-sm font-semibold text-pink-100 transition hover:bg-pink-300/10"
                          onClick={() => {
                            setPlaylistPickerVideoId((current) => (current === video.id ? null : video.id));
                            setPlaylistFeedback(null);
                          }}
                          type="button"
                        >
                          Add to playlist
                        </button>
                      </div>

                      {playlistPickerVideoId === video.id ? (
                        <div className="rounded-3xl border border-pink-300/20 bg-pink-300/5 p-3">
                          <p className="mb-3 text-sm font-semibold text-pink-100">Add to playlist</p>
                          {playlists.length ? (
                            <div className="mb-3 flex flex-wrap gap-2">
                              {playlists.map((playlist) => (
                                <button
                                  key={playlist.id}
                                  className="rounded-full border border-pink-300/25 bg-pink-300/10 px-4 py-2 text-sm text-pink-100 transition hover:bg-pink-300/20"
                                  onClick={() => addToPlaylist(video, playlist.id)}
                                  type="button"
                                >
                                  {playlist.name}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <p className="mb-3 text-sm text-zinc-400">You currently have no playlists. Create one here and I’ll add this video to it.</p>
                          )}
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <input
                              className="input sm:flex-1"
                              placeholder="New playlist name"
                              value={playlistDraftName}
                              onChange={(event) => setPlaylistDraftName(event.target.value)}
                            />
                            <button
                              className="rounded-full border border-pink-300/25 bg-pink-300/10 px-4 py-2 text-sm font-semibold text-pink-100 transition hover:bg-pink-300/20"
                              onClick={() => createPlaylistAndAdd(video)}
                              type="button"
                            >
                              Create + add
                            </button>
                            <button
                              className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-400 transition hover:bg-white/10"
                              onClick={() => {
                                setPlaylistPickerVideoId(null);
                                setPlaylistDraftName("");
                              }}
                              type="button"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : null}
                      {playlistFeedback?.videoId === video.id ? (
                        <p className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-3 text-sm text-emerald-100" aria-live="polite">
                          {playlistFeedback.message}
                        </p>
                      ) : null}
                      <div className="flex flex-wrap justify-center gap-2">
                        <button
                          className="min-h-10 min-w-32 rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/10"
                          onClick={() => startEditingDetails(video)}
                          type="button"
                        >
                          Edit details
                        </button>
                        <button
                          className="min-h-10 min-w-24 rounded-full border border-red-300/20 px-4 py-2 text-sm text-red-200 transition hover:bg-red-400/10"
                          onClick={() => removeVideo(video.id)}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="glass-panel border-dashed p-12 text-center text-zinc-400">
              <div className="mx-auto mb-4 grid size-16 place-items-center rounded-3xl bg-white/10 text-3xl">🎬</div>
              <p className="text-lg font-semibold text-zinc-100">No clips found.</p>
              <p className="mt-2">Save your first link or loosen the search/category filter.</p>
              <Link className="btn-primary mt-6 inline-flex" href="/">Save a video</Link>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function Background() {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.38),transparent_34%),radial-gradient(circle_at_70%_10%,rgba(34,211,238,0.22),transparent_28%),radial-gradient(circle_at_50%_95%,rgba(236,72,153,0.16),transparent_32%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:linear-gradient(to_bottom,black,transparent_78%)]" />
    </>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="text-xs text-zinc-400">{label}</p>
    </div>
  );
}

function platformEmoji(platform: Platform) {
  switch (platform) {
    case "Instagram":
      return "📸";
    case "TikTok":
      return "🎵";
    case "YouTube":
      return "▶️";
    case "X / Twitter":
      return "X";
    case "Facebook":
      return "f";
    case "Facebook Reels":
      return "f▶";
    case "Snapchat Spotlight":
      return "👻";
    case "Threads":
      return "@";
    case "Kwai":
      return "K";
    default:
      return "🎬";
  }
}
