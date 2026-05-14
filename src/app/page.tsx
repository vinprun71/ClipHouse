"use client";

import Link from "next/link";
import { BrandMark } from "@/app/BrandMark";
import { FormEvent, useEffect, useState } from "react";
import { CATEGORIES, Category, Platform, SavedVideo, detectPlatform, suggestCategory, tagsFromText } from "@/lib/videos";

const CREATE_NEW_PLAYLIST = "__new__";

const EMPTY_FORM = {
  url: "",
  title: "",
  creator: "",
  category: "Other" as Category,
  playlistId: "",
  newPlaylistName: "",
  tags: "",
  notes: "",
  thumbnail: "",
};

type PlaylistOption = { id: string; name: string };

export default function Home() {
  const [videos, setVideos] = useState<SavedVideo[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistOption[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [savedVideo, setSavedVideo] = useState<SavedVideo | null>(null);

  useEffect(() => {
    fetch("/api/videos")
      .then((response) => response.json())
      .then(setVideos)
      .catch(() => setStatus("Could not load saved video count."));
    fetch("/api/playlists")
      .then((response) => response.json())
      .then((data: PlaylistOption[]) => setPlaylists(data.map(({ id, name }) => ({ id, name }))))
      .catch(() => {});
  }, []);

  async function fetchMetadata() {
    if (!form.url.trim()) {
      setSavedVideo(null);
      setStatus("Paste a video URL first.");
      return;
    }

    setIsFetching(true);
    setSavedVideo(null);
    setStatus("Fetching metadata…");

    try {
      const response = await fetch("/api/metadata", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: form.url.trim() }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error ?? "Could not read metadata.");

      setForm((current) => ({
        ...current,
        title: current.title || data.title || "Untitled video",
        category: data.category || current.category,
        creator: current.creator || data.creator || "",
        tags: current.tags || (data.tags ?? []).join(", "),
        thumbnail: current.thumbnail || data.thumbnail || "",
      }));
      setStatus("Metadata added. Tweak anything, then save it.");
    } catch (error) {
      setForm((current) => ({
        ...current,
        title: current.title || fallbackTitle(current.url),
        category: suggestCategory(current.url),
        tags: current.tags || tagsFromText(current.url).join(", "),
      }));
      setStatus(error instanceof Error ? error.message : "Metadata fetch failed, but you can still save manually.");
    } finally {
      setIsFetching(false);
    }
  }

  async function saveVideo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const url = form.url.trim();
    if (!url) {
      setSavedVideo(null);
      setStatus("Paste a video URL before saving.");
      return;
    }

    const platform: Platform = detectPlatform(url);
    const playlistName = form.playlistId === CREATE_NEW_PLAYLIST ? form.newPlaylistName.trim() : "";
    if (form.playlistId === CREATE_NEW_PLAYLIST && !playlistName) {
      setSavedVideo(null);
      setStatus("Name the new playlist before saving.");
      return;
    }

    const payload = {
      url,
      title: form.title.trim() || fallbackTitle(url),
      creator: form.creator.trim() || undefined,
      thumbnail: form.thumbnail.trim() || undefined,
      platform,
      category: form.category,
      tags: form.tags
        .split(",")
        .map((tag) => tag.trim().replace(/^#/, ""))
        .filter(Boolean),
      notes: form.notes.trim() || undefined,
      playlistId: form.playlistId && form.playlistId !== CREATE_NEW_PLAYLIST ? form.playlistId : undefined,
      playlistName: playlistName || undefined,
    };

    setIsSaving(true);
    setSavedVideo(null);
    setStatus("Saving…");

    try {
      const response = await fetch("/api/videos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const savedVideo = await response.json();

      if (!response.ok) throw new Error(savedVideo.error ?? "Could not save video.");

      setVideos((current) => [savedVideo, ...current]);
      if (savedVideo.playlist && !playlists.some((playlist) => playlist.id === savedVideo.playlist.id)) {
        setPlaylists((current) => [...current, savedVideo.playlist]);
      }
      setForm(EMPTY_FORM);
      setSavedVideo(savedVideo);
      setStatus(
        savedVideo.playlist
          ? `${savedVideo.title} is saved in your library and added to ${savedVideo.playlist.name}.`
          : `${savedVideo.title} is saved in your library.`,
      );
    } catch (error) {
      setSavedVideo(null);
      setStatus(error instanceof Error ? error.message : "Could not save video.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070711] text-zinc-100">
      <Background />

      <section className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-6 sm:px-8 lg:px-10 lg:py-10">
        <TopNav savedCount={videos.length} />
        <Hero />

        <section className="mx-auto w-full max-w-5xl">
          <div className="glass-panel p-5 sm:p-7 lg:p-8">
            <div className="mb-6 flex flex-col gap-3 text-center sm:items-center">
              <p className="mx-auto grid size-12 place-items-center rounded-2xl bg-white/10 text-2xl">＋</p>
              <div>
                <h2 className="text-3xl font-black tracking-tight text-white">Save a video</h2>
                <p className="mt-2 text-sm text-zinc-400">Paste a link, autofill what we can, then add your own memory note.</p>
              </div>
            </div>

            <form className="space-y-4" onSubmit={saveVideo}>
              <Field label="Video URL">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    className="input"
                    placeholder="https://www.instagram.com/reel/..."
                    value={form.url}
                    onChange={(event) => setForm({ ...form, url: event.target.value })}
                  />
                  <button className="btn-secondary whitespace-nowrap" disabled={isFetching} onClick={fetchMetadata} type="button">
                    {isFetching ? "Reading…" : "Autofill"}
                  </button>
                </div>
              </Field>

              <Field label="Title">
                <input className="input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
              </Field>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <Field label="Creator">
                  <input className="input" placeholder="optional" value={form.creator} onChange={(event) => setForm({ ...form, creator: event.target.value })} />
                </Field>
                <Field label="Category">
                  <select className="input" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as Category })}>
                    {CATEGORIES.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Playlist">
                  <select
                    className="input"
                    value={form.playlistId}
                    onChange={(event) => setForm({ ...form, playlistId: event.target.value, newPlaylistName: event.target.value === CREATE_NEW_PLAYLIST ? form.newPlaylistName : "" })}
                  >
                    <option value="">No playlist</option>
                    {playlists.map((playlist) => (
                      <option key={playlist.id} value={playlist.id}>{playlist.name}</option>
                    ))}
                    <option value={CREATE_NEW_PLAYLIST}>＋ Create new playlist</option>
                  </select>
                </Field>
              </div>

              {form.playlistId === CREATE_NEW_PLAYLIST ? (
                <Field label="New playlist name">
                  <input
                    className="input"
                    placeholder="My Videos, Family Saves, Golf Ideas…"
                    value={form.newPlaylistName}
                    onChange={(event) => setForm({ ...form, newPlaylistName: event.target.value })}
                  />
                </Field>
              ) : null}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
                <Field label="Tags">
                  <input className="input" placeholder="funny, golf, dad" value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} />
                </Field>
                <Field label="Thumbnail URL">
                  <input className="input" placeholder="optional" value={form.thumbnail} onChange={(event) => setForm({ ...form, thumbnail: event.target.value })} />
                </Field>
              </div>

              <Field label="Memory note">
                <textarea
                  className="input min-h-24 resize-none"
                  placeholder="Why did you save this? e.g. guy falling off boat, hilarious golf swing…"
                  value={form.notes}
                  onChange={(event) => setForm({ ...form, notes: event.target.value })}
                />
              </Field>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button className="btn-primary flex-1" disabled={isSaving} type="submit">{isSaving ? "Saving…" : "Save to vault"}</button>
                <Link className="btn-secondary text-center" href="/library">View saved videos</Link>
              </div>
              <SaveFeedback savedVideo={savedVideo} status={status} />
            </form>
          </div>
        </section>
      </section>
    </main>
  );
}

function SaveFeedback({ savedVideo, status }: { savedVideo: SavedVideo | null; status: string }) {
  if (savedVideo) {
    return (
      <div
        aria-live="polite"
        className="rounded-3xl border border-emerald-300/30 bg-emerald-300/10 p-4 text-emerald-50 shadow-2xl shadow-emerald-950/25 sm:p-5"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-300 text-2xl text-emerald-950 shadow-lg shadow-emerald-950/30">
              ✓
            </div>
            <div>
              <p className="text-lg font-black text-white">Saved to your library</p>
              <p className="mt-1 text-sm text-emerald-100/85">
                “{savedVideo.title}” is ready whenever you need it.
              </p>
            </div>
          </div>
          <Link className="btn-primary shrink-0 text-center" href="/library">
            Open library
          </Link>
        </div>
      </div>
    );
  }

  return status ? (
    <p aria-live="polite" className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-zinc-300">
      {status}
    </p>
  ) : null;
}

function Background() {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.38),transparent_34%),radial-gradient(circle_at_70%_10%,rgba(34,211,238,0.22),transparent_28%),radial-gradient(circle_at_50%_95%,rgba(236,72,153,0.16),transparent_32%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:linear-gradient(to_bottom,black,transparent_78%)]" />
    </>
  );
}

function TopNav({ savedCount }: { savedCount: number }) {
  return (
    <nav className="flex flex-col gap-3 rounded-[1.75rem] border border-white/10 bg-white/[0.06] px-4 py-3 shadow-2xl shadow-black/25 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:rounded-full">
      <Link className="flex items-center gap-3" href="/">
        <BrandMark />
        <p className="text-sm font-bold tracking-wide">ClipHouse</p>
      </Link>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
        <Link className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-center text-sm text-zinc-300 transition hover:bg-white/10" href="/library">
          Library · {savedCount}
        </Link>
        <Link className="rounded-full border border-pink-300/25 bg-pink-300/10 px-4 py-2 text-center text-sm text-pink-100 transition hover:bg-pink-300/20" href="/playlists">
          Playlists
        </Link>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <header className="glass-panel p-6 text-center sm:p-8 lg:p-10">
      <h1 className="mx-auto max-w-4xl text-5xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
        Your searchable vault for short-form video.
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
        Paste a Reel, TikTok, Short, Facebook Reel, Spotlight, Thread, Kwai, or X clip. ClipHouse turns it into a card you can tag, search, and actually find again later.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3 text-sm text-zinc-300">
        <Pill>Cross-platform links</Pill>
        <Pill>Memory notes</Pill>
        <Pill>Category filters</Pill>
        <Pill>Local-first</Pill>
      </div>
    </header>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-zinc-300">{label}</span>
      {children}
    </label>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5">{children}</span>;
}

function fallbackTitle(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "Untitled video";
  }
}
