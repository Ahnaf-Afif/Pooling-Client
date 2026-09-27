"use client";

import { useEffect, useState } from "react";
import { approveRecoveryRequest, getRecoveryRequests } from "@/lib/api";

export default function RecoveryRequests() {
  const [data, setData] = useState(null);
  const [cursor, setCursor] = useState("");
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    getRecoveryRequests(cursor).then((result) => { if (active) setData(result); })
      .catch((requestError) => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, [cursor, revision]);

  function refresh(after = "") {
    setData(null);
    setError("");
    setCursor(after);
    setRevision((value) => value + 1);
  }

  async function approve(event, request) {
    event.preventDefault();
    const note = new FormData(event.currentTarget).get("note").trim();
    if (!window.confirm(`Reset ${request.email}'s authenticator and revoke all their sessions? Only approve after independent identity verification.`)) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await approveRecoveryRequest(request.requestId, note);
      setMessage(result.message);
      refresh();
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }

  return <section aria-label="Authenticator recovery requests" className="mt-7 rounded-2xl border border-[#D1D5DB] p-5">
    <h2 className="font-display text-xl font-semibold">Authenticator recovery</h2>
    <p className="mt-2 text-sm leading-6 text-[#6B7280]">A request is not proof of identity. Contact the owner through a previously established channel, confirm their request reference, and record how you verified them. Never ask for passwords, authenticator secrets, or recovery codes. Your own recovery needs another administrator.</p>
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="mt-3 text-sm text-[#1B4332]">{message}</p>}
    {!data && !error && <p role="status" className="mt-3 text-sm">Loading recovery requests…</p>}
    {data?.requests.length === 0 && <p className="mt-3 text-sm">No pending requests on this page.</p>}
    {data?.requests.map((request) => <form key={request.requestId} onSubmit={(event) => approve(event, request)} className="mt-5 space-y-3 border-t border-[#E5E7EB] pt-4">
      <h3 className="font-semibold">{request.name}</h3>
      <p className="break-all text-sm">{request.email} · Reference: {request.requestId}</p>
      <p className="text-xs text-[#6B7280]">Expires {new Date(request.expiresAt).toLocaleString()}</p>
      {request.self ? <p className="text-sm">Another administrator must handle your request.</p> : <>
        <label className="block text-sm">Verification note (do not include secrets)
          <textarea name="note" required minLength={10} maxLength={500} disabled={busy} className="mt-2 block w-full rounded-lg border border-[#D1D5DB] p-3" />
        </label>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" required disabled={busy} className="mt-1" />I independently verified the account owner through a previously established channel.</label>
        <button disabled={busy} className="rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">Approve authenticator recovery</button>
      </>}
    </form>)}
    <div className="mt-5 flex gap-4 text-sm font-semibold text-[#1B4332]">
      <button type="button" disabled={busy} onClick={() => refresh()}>Refresh requests</button>
      {data?.nextCursor && <button type="button" disabled={busy} onClick={() => refresh(data.nextCursor)}>Next recovery requests</button>}
    </div>
  </section>;
}
