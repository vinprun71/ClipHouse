"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell, ErrorMessage, PasswordField } from "@/app/AuthCard";

export default function SetupPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function setup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }
    setIsSubmitting(true);
    try {
      const queryToken = new URLSearchParams(window.location.search).get("token");
      const response = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: queryToken || token, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not finish setup.");
      router.replace("/");
      router.refresh();
    } catch (setupError) {
      setError(setupError instanceof Error ? setupError.message : "Could not finish setup.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return <AuthShell eyebrow="First-run setup" title="Make it yours" description="Use the one-time token from the server logs, then choose a household password.">
    <form className="mt-8 space-y-4" onSubmit={setup}>
      <label className="block">
        <span className="mb-2 block text-sm font-bold text-zinc-200">Setup token</span>
        <input autoComplete="off" className="input font-mono" onChange={(event) => setToken(event.target.value)} placeholder="Included automatically in the setup link" value={token} />
      </label>
      <PasswordField label="Password (10+ characters)" value={password} onChange={setPassword} newPassword />
      <PasswordField label="Confirm password" value={confirmation} onChange={setConfirmation} newPassword />
      {error ? <ErrorMessage>{error}</ErrorMessage> : null}
      <button className="btn-primary w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Setting up…" : "Create my ClipHouse"}
      </button>
    </form>
  </AuthShell>;
}
