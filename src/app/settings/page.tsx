"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AuthShell, ErrorMessage, PasswordField } from "@/app/AuthCard";

export default function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");
    if (newPassword !== confirmation) {
      setError("The new passwords do not match.");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not change the password.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
      setStatus("Password changed. All other devices have been signed out.");
    } catch (passwordError) {
      setError(passwordError instanceof Error ? passwordError.message : "Could not change the password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return <AuthShell eyebrow="Household settings" title="Change password" description="Changing it signs out every other device while keeping this one connected.">
    <form className="mt-8 space-y-4" onSubmit={changePassword}>
      <PasswordField label="Current password" value={currentPassword} onChange={setCurrentPassword} />
      <PasswordField label="New password (10+ characters)" value={newPassword} onChange={setNewPassword} newPassword />
      <PasswordField label="Confirm new password" value={confirmation} onChange={setConfirmation} newPassword />
      {error ? <ErrorMessage>{error}</ErrorMessage> : null}
      {status ? <p className="text-sm font-semibold text-emerald-300" role="status">{status}</p> : null}
      <button className="btn-primary w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Updating…" : "Change password"}
      </button>
      <Link className="block text-center text-sm font-bold text-zinc-400 hover:text-white" href="/">Back to ClipHouse</Link>
    </form>
  </AuthShell>;
}
