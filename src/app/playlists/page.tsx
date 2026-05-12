"use client";

import Link from "next/link";
import { BrandMark } from "@/app/BrandMark";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Platform, SavedVideo } from "@/lib/videos";

interface PlaylistVideo extends SavedVideo {
  addedAt: string;
}

interface Playlist {
  id: string;
  name: string;
  createdAt: string;
  videos: PlaylistVideo[];
}

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [copiedVideoId, setCopiedVideoId] = useState<string | null>(null);

  useEffect(() => {
    async function loadPlaylists() {
      try {
        const migrationResponse = await fetch("/api/playlists/migrate-favorites", { method: "POST" });
        if (!migrationResponse.ok) throw new Error("Could not migrate favorites.");

        const response = await fetch("/api/playlists");
        if (!response.ok) throw new Error("Could not load playlists.");

        setPlaylists(await response.json());
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Could not load playlists.");
      }
    }

    loadPlaylists();
  }, []);

  const filteredPlaylists = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return playlists;

    return playlists
      .map((playlist) => ({
        ...playlist,
        videos: playlist.videos.filter((video) => {
          const searchable = [video.title, video.platform, video.creator, video.category, video.notes, video.url, ...video.tags]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return searchable.includes(needle);
        }),
      }))
      .filter((playlist) => playlist.videos.length > 0 || playlist.name.toLowerCase().includes(needle));
  }, [playlists, query]);

  async function createPlaylist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = newPlaylistName.trim();
    if (!name) {
      setStatus("Playlist name is required.");
      return;
    }

    setIsCreating(true);
    setStatus("");

    try {
      const response = await fetch("/api/playlists", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const playlist = await response.json();

      if (!response.ok) throw new Error(playlist.error ?? "Could not create playlist.");

      setPlaylists((current) => [...current, playlist]);
      setNewPlaylistName("");
      setStatus(`Created “${playlist.name}”.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not create playlist.");
    } finally {
      setIsCreating(false);
    }
  }

  async function removeFromPlaylist(playlistId: string, videoId: string) {
    const previous = playlists;
    setPlaylists((current) =>
      current.map((playlist) =>
        playlist.id === playlistId ? { ...playlist, videos: playlist.videos.filter((video) => video.id !== videoId) } : playlist,
      ),
    );

    try {
      const response = await fetch(`/api/playlists/${playlistId}/videos`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ videoId }),
      });
      if (!response.ok) throw new Error("Could not remove video.");
    } catch (error) {
      setPlaylists(previous);
      setStatus(error instanceof Error ? error.message : "Could not remove video.");
    }
  }

  async function deletePlaylist(playlist: Playlist) {
    const warning =
      playlist.name === "My Videos"
        ? "Are you sure you want to delete My Videos?"
        : `Are you sure you want to delete “${playlist.name}”?`;

    if (!confirm(warning)) return;

    const previous = playlists;
    setPlaylists((current) => current.filter((item) => item.id !== playlist.id));

    try {
      const response = await fetch(`/api/playlists/${playlist.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Could not delete playlist.");
      setStatus(`Deleted “${playlist.name}”.`);
    } catch (error) {
      setPlaylists(previous);
      setStatus(error instanceof Error ? error.message : "Could not delete playlist.");
    }
  }

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
      setStatus(`Copied “${video.title}” link to clipboard.`);
      window.setTimeout(() => setCopiedVideoId((current) => (current === video.id ? null : current)), 1800);
    } catch {
      setStatus("Could not copy the video link.");
    }
  }

  const totalVideos = playlists.reduce((sum, playlist) => sum + playlist.videos.length, 0);

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
            <Link className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-center text-sm text-zinc-300 transition hover:bg-white/10" href="/library">
              Library
            </Link>
            <Link className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-center text-sm text-zinc-300 transition hover:bg-white/10" href="/">
              Save new video
            </Link>
          </div>
        </nav>

        <header className="glass-panel p-6 sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-4 inline-flex rounded-full border border-pink-300/25 bg-pink-300/10 px-3 py-1 text-sm text-pink-100">Playlists</p>
              <h1 className="text-4xl font-black tracking-tight text-white sm:text-6xl">Saved video lists</h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-zinc-300">
                Make separate lists for each person, trip, hobby, or rabbit hole — no login system required yet.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center sm:w-64">
              <MiniStat label="Playlists" value={playlists.length} />
              <MiniStat label="Videos" value={totalVideos} />
            </div>
          </div>
        </header>

        <section className="space-y-5">
          {status ? <p className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-zinc-300">{status}</p> : null}

          <div className="glass-panel p-4 sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">⌕</span>
                <input className="input pl-10" placeholder="Search playlist videos…" value={query} onChange={(event) => setQuery(event.target.value)} />
              </div>
              <form className="flex flex-col gap-2 sm:flex-row lg:min-w-96" onSubmit={createPlaylist}>
                <input
                  className="input"
                  placeholder="New playlist name"
                  value={newPlaylistName}
                  onChange={(event) => setNewPlaylistName(event.target.value)}
                />
                <button className="btn-primary whitespace-nowrap" disabled={isCreating} type="submit">
                  {isCreating ? "Creating…" : "Create list"}
                </button>
              </form>
            </div>
          </div>

          {playlists.length === 0 ? (
            <div className="glass-panel border-dashed p-12 text-center text-zinc-400">
              <div className="mx-auto mb-4 grid size-16 place-items-center rounded-3xl bg-white/10 text-3xl">📋</div>
              <p className="text-lg font-semibold text-zinc-100">You currently have no playlists.</p>
              <p className="mt-2">Create a list above, then add videos to it from the library.</p>
              <Link className="btn-primary mt-6 inline-flex" href="/library">
                Browse library
              </Link>
            </div>
          ) : filteredPlaylists.length ? (
            filteredPlaylists.map((playlist) => (
              <section className="glass-panel overflow-hidden p-5" key={playlist.id}>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-bold text-white">{playlist.name}</h2>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-400">
                      {playlist.videos.length} {playlist.videos.length === 1 ? "video" : "videos"}
                    </span>
                  </div>
                  <button
                    className="rounded-full border border-red-300/20 px-4 py-2 text-sm text-red-200 transition hover:bg-red-400/10"
                    onClick={() => deletePlaylist(playlist)}
                    type="button"
                  >
                    Delete playlist
                  </button>
                </div>

                {playlist.videos.length ? (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {playlist.videos.map((video) => (
                      <article
                        className="group overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.055] shadow-2xl shadow-black/20 backdrop-blur-xl transition hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.075]"
                        key={video.id}
                      >
                        <a
                          aria-label={`Open ${video.title}`}
                          className="relative block aspect-video overflow-hidden bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:ring-offset-2 focus:ring-offset-zinc-950"
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
                              <span className="rounded-full bg-pink-200 px-3 py-1 text-xs font-bold text-zinc-950">In playlist</span>
                            </div>
                          </div>
                        </a>
                        <div className="space-y-3 p-4">
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Added {new Date(video.addedAt).toLocaleDateString()}</p>
                            <h3 className="mt-1 text-xl font-bold leading-tight text-white">{video.title}</h3>
                          </div>
                          {video.creator ? <p className="text-sm text-zinc-400">Creator: {video.creator}</p> : null}
                          {video.notes ? <p className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm leading-6 text-zinc-300">{video.notes}</p> : null}
                          <div className="flex flex-wrap gap-2">
                            {video.tags.map((tag) => (
                              <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-zinc-300" key={tag}>#{tag}</span>
                            ))}
                          </div>
                          <div className="space-y-2 pt-2">
                            <div className="flex flex-wrap justify-center gap-2">
                              <a className="min-h-10 rounded-full border border-white/10 bg-white/[0.07] px-4 py-2 text-center text-sm font-semibold text-zinc-100 transition hover:bg-white/10" href={video.url} target="_blank" rel="noreferrer">
                                Open video
                              </a>
                              <button
                                className="min-h-10 rounded-full border border-cyan-200/25 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/10"
                                onClick={() => copyVideoUrl(video)}
                                type="button"
                              >
                                {copiedVideoId === video.id ? "Copied!" : "Share"}
                              </button>
                            </div>
                            <div className="flex justify-center">
                              <button
                                className="min-h-10 rounded-full border border-red-300/20 px-4 py-2 text-sm text-red-200 transition hover:bg-red-400/10"
                                onClick={() => removeFromPlaylist(playlist.id, video.id)}
                                type="button"
                              >
                                Remove from playlist
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-3xl border border-dashed border-white/10 bg-black/10 p-8 text-center text-zinc-400">
                    <p>No videos in this playlist yet.</p>
                    <Link className="btn-secondary mt-4 inline-flex" href="/library">
                      Add from library
                    </Link>
                  </div>
                )}
              </section>
            ))
          ) : (
            <div className="glass-panel border-dashed p-12 text-center text-zinc-400">
              <p className="text-lg font-semibold text-zinc-100">No playlist videos found.</p>
              <p className="mt-2">Try a different search.</p>
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
      return "𝕏";
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
