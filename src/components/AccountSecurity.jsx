"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { getSecurity, getSessions, securityAction } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

const buttonClass = "rounded-full border border-[#1B4332] px-4 py-2 text-sm font-semibold text-[#1B4332] disabled:opacity-50";

export default function AccountSecurity() {
  const [security, setSecurity] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [setup, setSetup] = useState(null);
  const [code, setCode] = useState("");
  const [backup, setBackup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const [state, devices] = await Promise.all([getSecurity(), getSessions()]);
    setSecurity(state);
    setSessions(devices.sessions);
  }

  useEffect(() => {
    let active = true;
    Promise.all([getSecurity(), getSessions()]).then(([state, devices]) => {
      if (active) { setSecurity(state); setSessions(devices.sessions); }
    }).catch((requestError) => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, []);

  async function act(action, body) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await securityAction(action, body);
      if (action === "enable") setSetup(result);
      if (action === "verify") {
        setCode("");
        // Hide the authenticator secret after enrollment; recovery codes remain
        // on this page until acknowledged and are never stored in the browser.
        setSetup((current) => current ? { backupCodes: current.backupCodes } : null);
      }
      setMessage(result.message || "Scan the QR code, then enter a code to finish setup.");
      await authClient.getSession({ query: { disableCookieCache: true } });
      await load();
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }

  return (
    <section id="security" className="mt-8 scroll-mt-24 border-t border-[#E5E7EB] pt-7">
      <h2 className="font-display text-xl font-semibold">Account security</h2>
      <p className="mt-2 text-sm leading-6 text-[#6B7280]">Use an authenticator app to protect your account. Staff must verify before accessing moderation, and again after 15 minutes before making changes.</p>
      {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="mt-4 text-sm text-[#1B4332]">{message}</p>}
      {!security && !error && <p className="mt-4 text-sm">Loading security settings…</p>}
      {!security && error && <button type="button" className={`${buttonClass} mt-3`} onClick={() => load().catch((requestError) => setError(requestError.message))}>Retry</button>}
      {security?.staff && security.staffSessionExpired && <p className="mt-4 text-sm text-amber-800">Your staff session has expired. Use Sign out above, then sign in again.</p>}
      {security && !security.enabled && !setup && <button type="button" className={`${buttonClass} mt-4`} disabled={busy} onClick={() => act("enable")}>Set up authenticator</button>}
      {setup?.totpURI && <div className="mt-5 space-y-3 rounded-xl border border-[#D1D5DB] p-4">
        <p className="text-sm">Scan this with your authenticator app. Keep the setup key private.</p>
        <QRCode value={setup.totpURI} size={180} title="Authenticator setup QR code" />
        <details><summary className="cursor-pointer text-sm">Enter a setup key manually</summary><code className="mt-2 block break-all text-sm">{new URL(setup.totpURI).searchParams.get("secret")}</code></details>
      </div>}
      {(security?.enabled || setup?.totpURI) && <form className="mt-5 flex flex-wrap items-end gap-3" onSubmit={(event) => { event.preventDefault(); act("verify", { code, backup }); }}>
        <div><label htmlFor="security-code" className="mb-2 block text-sm font-semibold">{backup ? "Recovery code" : "Authenticator code"}</label><input id="security-code" value={code} onChange={(event) => setCode(event.target.value)} autoComplete="one-time-code" inputMode={backup ? "text" : "numeric"} maxLength={backup ? 40 : 6} required className="w-52 rounded-lg border border-[#D1D5DB] px-3 py-2" /></div>
        <button type="submit" disabled={busy} className={buttonClass}>{busy ? "Verifying…" : "Verify"}</button>
        {security?.enabled && <button type="button" onClick={() => { setBackup(!backup); setCode(""); }} className="text-sm underline">{backup ? "Use authenticator" : "Use a recovery code"}</button>}
      </form>}
      {setup?.backupCodes && <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold">Save these recovery codes somewhere private. Each works once.</p>
        <ul className="mt-3 grid grid-cols-2 gap-2 font-mono text-sm">{setup.backupCodes.map((value) => <li key={value}>{value}</li>)}</ul>
        {!setup.totpURI && <button type="button" className={`${buttonClass} mt-4`} onClick={() => setSetup(null)}>I saved my recovery codes</button>}
      </div>}
      {security?.verified && <p role="status" className="mt-4 text-sm text-[#1B4332]">Verified for sensitive actions.{security.staff && <> <Link href="/moderation" className="font-semibold underline">Open moderation</Link></>}</p>}
      {security?.enabled && !security.staff && <button type="button" className={`${buttonClass} mt-4`} disabled={busy} onClick={() => { if (window.confirm("Disable your authenticator and sign out other sessions?")) act("disable"); }}>Disable authenticator</button>}

      <h3 className="mt-8 font-semibold">Signed-in devices</h3>
      <ul className="mt-3 space-y-3">{sessions.map((session) => <li key={session.id} className="rounded-xl border border-[#E5E7EB] p-3 text-sm">
        <p className="break-words">{session.device}</p>
        <p className="mt-1 text-xs text-[#6B7280]">{session.current ? "This device · " : ""}Signed in {new Date(session.createdAt).toLocaleString()}</p>
        {!session.current && <button type="button" className={`${buttonClass} mt-2`} disabled={busy} onClick={() => act("sessions/revoke", { id: session.id })}>Sign out device</button>}
      </li>)}</ul>
      {sessions.length > 1 && <button type="button" className={`${buttonClass} mt-4`} disabled={busy} onClick={() => act("sessions/revoke", { others: true })}>Sign out all other devices</button>}
    </section>
  );
}
