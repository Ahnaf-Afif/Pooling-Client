"use client";

import { useState } from "react";

export default function EditConflict({ onReload }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function reload() {
    if (!window.confirm("Discard your unsaved edit and load the latest poll? Copy any text you want to keep first.")) return;
    setBusy(true);
    setError("");
    try { await onReload(); }
    catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }
  return <div className="mt-4 space-y-3">
    <p className="text-sm text-[#6B7280]">Your draft is still here. Copy anything you want to keep before reloading; changes will not be merged or submitted automatically.</p>
    <button type="button" disabled={busy} onClick={reload} className="rounded-full border border-[#1B4332] px-5 py-2.5 text-sm font-semibold text-[#1B4332] disabled:opacity-50">{busy ? "Loading latest poll…" : "Discard draft and load latest"}</button>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </div>;
}
