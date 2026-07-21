"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export function AccountControls() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  if (pathname === "/login" || pathname === "/setup" || pathname === "/settings") return null;

  async function logout() {
    setIsLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
    <Link className="rounded-full border border-white/10 bg-zinc-950/80 px-4 py-2 text-xs font-bold text-zinc-300 shadow-xl backdrop-blur hover:text-white" href="/settings">Settings</Link>
    <button className="rounded-full border border-white/10 bg-zinc-950/80 px-4 py-2 text-xs font-bold text-zinc-300 shadow-xl backdrop-blur hover:text-white disabled:opacity-60" disabled={isLoggingOut} onClick={logout} type="button">
      {isLoggingOut ? "Signing out…" : "Sign out"}
    </button>
  </div>;
}
