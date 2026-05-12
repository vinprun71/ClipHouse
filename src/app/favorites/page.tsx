import Link from "next/link";
import { BrandMark } from "@/app/BrandMark";

export default function DeprecatedFavoritesPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070711] text-zinc-100">
      <Background />

      <section className="relative mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-6 sm:px-8 lg:px-10 lg:py-10">
        <nav className="flex flex-col gap-3 rounded-[1.75rem] border border-white/10 bg-white/[0.06] px-4 py-3 shadow-2xl shadow-black/25 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:rounded-full">
          <Link className="flex items-center gap-3" href="/">
            <BrandMark />
            <p className="text-sm font-bold tracking-wide">ClipHouse</p>
          </Link>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <Link className="rounded-full border border-pink-300/25 bg-pink-300/10 px-4 py-2 text-center text-sm text-pink-100 transition hover:bg-pink-300/20" href="/playlists">
              Playlists
            </Link>
            <Link className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-center text-sm text-zinc-300 transition hover:bg-white/10" href="/library">
              Library
            </Link>
          </div>
        </nav>

        <section className="glass-panel border-dashed p-8 text-center sm:p-12">
          <div className="mx-auto mb-5 grid size-16 place-items-center rounded-3xl bg-white/10 text-3xl">★</div>
          <p className="mb-4 inline-flex rounded-full border border-pink-300/25 bg-pink-300/10 px-3 py-1 text-sm text-pink-100">
            Favorites moved
          </p>
          <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">Favorites are now playlists.</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-zinc-300">
            Existing favorites are migrated into a playlist called “My Videos”. New saves can be added to any playlist from the library.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link className="btn-primary text-center" href="/playlists">
              Open playlists
            </Link>
            <Link className="btn-secondary text-center" href="/library">
              Browse library
            </Link>
          </div>
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
