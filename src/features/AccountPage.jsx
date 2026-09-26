"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import AuthRequired from "@/components/AuthRequired";
import { signOut, useSession } from "@/lib/auth-client";
import { deleteAccount, exportAccount } from "@/lib/api";

function AccountDetails() {
  const router = useRouter();
  const { data: session } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const user = session.user;
  const role = user.role || "user";

  async function handleSignOut() {
    setBusy(true);
    setError("");
    const result = await signOut();
    if (result?.error) {
      setError(result.error.message || "Could not sign out.");
      setBusy(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  async function handleExport() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const data = await exportAccount();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "what-do-you-think-account-export.json";
      link.click();
      URL.revokeObjectURL(url);
      setMessage("Your account export has been downloaded.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (window.prompt("This permanently removes your account. Type DELETE to confirm.") !== "DELETE") return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await deleteAccount();
      router.push("/");
      router.refresh();
    } catch (requestError) {
      setError(requestError.message);
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto min-h-[65vh] max-w-2xl px-6 py-14">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#C9971A]">Your account</p>
      <h1 className="font-display mt-2 text-4xl font-semibold">Account</h1>
      <section className="mt-9 rounded-2xl border border-[#E5E7EB] p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1B4332] text-lg font-semibold text-white">{(user.name || user.email).slice(0, 1).toUpperCase()}</div>
          <div className="min-w-0"><p className="truncate font-semibold text-[#111827]">{user.name || "Community member"}</p><p className="truncate text-sm text-[#6B7280]">{user.email}</p></div>
        </div>
        <dl className="mt-6 grid gap-4 border-t border-[#E5E7EB] pt-6 text-sm sm:grid-cols-2">
          <div><dt className="text-[#9CA3AF]">Email status</dt><dd className="mt-1 font-medium text-[#1B4332]">{user.emailVerified ? "Verified" : "Verification required"}</dd></div>
          <div><dt className="text-[#9CA3AF]">Role</dt><dd className="mt-1 font-medium capitalize text-[#374151]">{role}</dd></div>
        </dl>
      </section>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/my-polls" className="rounded-full bg-[#1B4332] px-5 py-2.5 text-sm font-semibold text-white">Manage my polls</Link>
        {(role === "admin" || role === "moderator") && <Link href="/moderation" className="rounded-full border border-[#1B4332] px-5 py-2.5 text-sm font-semibold text-[#1B4332]">Moderation</Link>}
        {role === "admin" && <Link href="/admin/users" className="rounded-full border border-[#1B4332] px-5 py-2.5 text-sm font-semibold text-[#1B4332]">Manage users</Link>}
        <button type="button" onClick={handleSignOut} disabled={busy} className="rounded-full border border-[#D1D5DB] px-5 py-2.5 text-sm font-semibold text-[#374151] hover:bg-[#F9FAFB] disabled:opacity-60">{busy ? "Signing out…" : "Sign out"}</button>
      </div>
      <section className="mt-8 border-t border-[#E5E7EB] pt-7">
        <h2 className="font-display text-xl font-semibold">Your data</h2>
        <p className="mt-2 text-sm leading-6 text-[#6B7280]">Download a copy of your account, polls, votes, and reports, or permanently remove your account. Polls are archived and vote receipts are anonymized to preserve aggregate integrity.</p>
        <div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={handleExport} disabled={busy} className="rounded-full border border-[#1B4332] px-5 py-2.5 text-sm font-semibold text-[#1B4332] disabled:opacity-50">Download my data</button><button type="button" onClick={handleDelete} disabled={busy} className="rounded-full border border-red-300 px-5 py-2.5 text-sm font-semibold text-red-700 disabled:opacity-50">Delete account</button></div>
      </section>
      {message && <p role="status" className="mt-4 text-sm text-[#1B4332]">{message}</p>}
      {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
    </main>
  );
}

export default function AccountPage() {
  return <AuthRequired message="Sign in to view and manage your account."><AccountDetails /></AuthRequired>;
}
