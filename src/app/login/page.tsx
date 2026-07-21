"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell, ErrorMessage, PasswordField } from "@/app/AuthCard";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not sign in.");
      const destination = new URLSearchParams(window.location.search).get("next");
      router.replace(destination?.startsWith("/") && !destination.startsWith("//") ? destination : "/");
      router.refresh();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Could not sign in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return <AuthShell eyebrow="Private library" title="Welcome home" description="Enter your household password to open ClipHouse.">
    <form className="mt-8 space-y-4" onSubmit={login}>
      <PasswordField label="Password" value={password} onChange={setPassword} autoFocus />
      {error ? <ErrorMessage>{error}</ErrorMessage> : null}
      <button className="btn-primary w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Opening…" : "Open ClipHouse"}
      </button>
    </form>
  </AuthShell>;
}
