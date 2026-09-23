"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { signIn, useSession } from "@/lib/auth-client";
import { getAuthConfiguration } from "@/lib/api";

function safeReturnTo(value) {
  return value?.startsWith("/") && !value.startsWith("//") && !value.startsWith("/sign-in")
    ? value
    : "/my-polls";
}

function SignInForm() {
  const searchParams = useSearchParams();
  const { data: session, isPending } = useSession();
  const [configuration, setConfiguration] = useState(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(searchParams.get("error") ? "The sign-in link could not be completed. Please try again." : "");
  const returnTo = safeReturnTo(searchParams.get("returnTo"));

  useEffect(() => {
    getAuthConfiguration()
      .then(setConfiguration)
      .catch(() => setError("Authentication is temporarily unavailable."));
  }, []);

  async function continueWithGoogle() {
    setBusy("google");
    setError("");
    const result = await signIn.social({
      provider: "google",
      callbackURL: returnTo,
      errorCallbackURL: `/sign-in?returnTo=${encodeURIComponent(returnTo)}&error=oauth`,
    });
    if (result?.error) {
      setError(result.error.message || "Google sign-in could not be started.");
      setBusy("");
    }
  }

  async function sendLink(event) {
    event.preventDefault();
    setBusy("email");
    setError("");
    setMessage("");
    const result = await signIn.magicLink({
      email: email.trim(),
      name: email.trim().split("@")[0],
      callbackURL: returnTo,
      errorCallbackURL: `/sign-in?returnTo=${encodeURIComponent(returnTo)}&error=magic-link`,
    });
    if (result?.error) {
      setError(result.error.message || "The sign-in email could not be sent.");
    } else {
      setMessage("Check your inbox. The secure sign-in link expires in 10 minutes.");
      setEmail("");
    }
    setBusy("");
  }

  if (isPending || !configuration) {
    return <div className="h-96 animate-pulse rounded-3xl bg-[#F3F4F6]" />;
  }

  if (session?.user) {
    return (
      <div className="rounded-3xl border border-[#DDE8E2] bg-[#F7FBF9] p-8 text-center">
        <h1 className="font-display text-3xl font-semibold">You are signed in</h1>
        <p className="mt-3 text-sm text-[#6B7280]">Continue as {session.user.name || session.user.email}.</p>
        <Link href={returnTo} className="mt-7 inline-block rounded-full bg-[#1B4332] px-6 py-3 text-sm font-semibold text-white">Continue</Link>
      </div>
    );
  }

  const hasProvider = configuration.google || configuration.magicLink;

  return (
    <div className="rounded-3xl border border-[#E5E7EB] bg-white p-7 shadow-[0_20px_60px_rgba(27,67,50,0.08)] sm:p-9">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#C9971A]">Secure account</p>
      <h1 className="font-display mt-2 text-4xl font-semibold">Sign in</h1>
      <p className="mt-3 text-sm leading-6 text-[#6B7280]">Create and manage polls across all your devices. Browsing and voting stay open to everyone.</p>

      {configuration.google && (
        <button type="button" onClick={continueWithGoogle} disabled={Boolean(busy)} className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl border border-[#D1D5DB] px-4 py-3.5 text-sm font-semibold text-[#374151] hover:bg-[#F9FAFB] disabled:opacity-60">
          <span aria-hidden="true" className="font-bold text-[#4285F4]">G</span>
          {busy === "google" ? "Opening Google…" : "Continue with Google"}
        </button>
      )}

      {configuration.google && configuration.magicLink && <div className="my-6 flex items-center gap-3 text-xs text-[#9CA3AF]"><span className="h-px flex-1 bg-[#E5E7EB]" />or<span className="h-px flex-1 bg-[#E5E7EB]" /></div>}

      {configuration.magicLink && (
        <form onSubmit={sendLink} className={configuration.google ? "" : "mt-8"}>
          <label htmlFor="sign-in-email" className="mb-2 block text-sm font-semibold text-[#374151]">Email address</label>
          <input id="sign-in-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="w-full rounded-xl border border-[#D1D5DB] px-4 py-3 focus:border-[#1B4332] focus:ring-2 focus:ring-[#DDE8E2]" />
          <button type="submit" disabled={Boolean(busy) || !email.trim()} className="mt-3 w-full rounded-xl bg-[#1B4332] py-3.5 text-sm font-semibold text-white hover:bg-[#15362A] disabled:opacity-60">{busy === "email" ? "Sending secure link…" : "Email me a sign-in link"}</button>
        </form>
      )}

      {!hasProvider && (
        <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">Authentication code is ready, but the Google and email provider credentials have not been added to the server yet.</div>
      )}
      {error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="mt-5 rounded-xl border border-[#BFD5C9] bg-[#F0F7F4] px-4 py-3 text-sm text-[#1B4332]">{message}</p>}
      <p className="mt-6 text-center text-xs leading-5 text-[#9CA3AF]">We only use your account to secure ownership and moderation. Your email is never displayed on polls.</p>
    </div>
  );
}

export default function SignInPage() {
  return (
    <main className="mx-auto min-h-[70vh] max-w-lg px-6 py-16">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-[#F3F4F6]" />}><SignInForm /></Suspense>
    </main>
  );
}
