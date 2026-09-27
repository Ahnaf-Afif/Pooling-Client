"use client";

import { useEffect, useId, useState } from "react";
import { getAuditHistory } from "@/lib/api";
import CursorPager from "./CursorPager";

const dateFormatter = new Intl.DateTimeFormat("en-BD", { dateStyle: "medium", timeStyle: "short" });
const actionLabels = {
  note_added: "Added an internal note", report_dismissed: "Dismissed a report", report_reopened: "Reopened a report",
  poll_edited: "Edited a poll", poll_removed: "Removed a poll", owner_suspended: "Suspended a poll owner",
  user_suspended: "Suspended an account", user_reactivated: "Reactivated an account",
  role_changed: "Changed an account's role", factor_recovered: "Approved authenticator recovery",
};

export default function AuditHistory({ resource, id, title = "Action history" }) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [cursors, setCursors] = useState([null]);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const cursor = cursors.at(-1);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    getAuditHistory(resource, id, cursor, { signal: controller.signal }).then((result) => {
      if (!controller.signal.aborted) { setData(result); setError(""); }
    }).catch((requestError) => { if (!controller.signal.aborted) setError(requestError.message); });
    return () => controller.abort();
  }, [resource, id, open, cursor, revision]);

  function changePage(values) { setData(null); setError(""); setCursors(values); }

  return <section className="mt-5 rounded-xl bg-[#F9FAFB] px-4 py-3">
    <button type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)} className="text-sm font-semibold text-[#374151]">{title}</button>
    <div id={panelId} hidden={!open}>
      <p className="mt-3 text-xs text-[#6B7280]">Newest first. Use Next for older records; refresh to see new actions.</p>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      {!data && !error && <p role="status" className="mt-3 text-sm">Loading history…</p>}
      {data?.actions.length === 0 && <p className="mt-3 text-sm">No actions on this page.</p>}
      <ol className="mt-4 space-y-4 border-l border-[#D1D5DB] pl-4">
        {data?.actions.map((entry) => <li key={entry.id} className="break-words text-sm leading-6 text-[#6B7280]">
          <span className="font-semibold text-[#374151]">{entry.actorName}</span> · {actionLabels[entry.action] || entry.action.replaceAll("_", " ")}
          <p className="text-xs"><time dateTime={entry.createdAt}>{dateFormatter.format(new Date(entry.createdAt))}</time> · {entry.actorRole}</p>
          {entry.pollSlug && <p className="text-xs">Poll: {entry.pollSlug}</p>}
          {entry.reportId && <p className="text-xs">Report: {entry.reportId}</p>}
          {entry.targetUserId && <p className="text-xs">Account: {entry.targetUserId}</p>}
          {entry.previousRole && <p>{entry.previousRole} → {entry.newRole}</p>}
          {entry.changedFields?.length > 0 && <p>Changed {entry.changedFields.join(", ")}</p>}
          {entry.note && <p className="mt-1 text-[#4B5563]">{entry.note}</p>}
          {(entry.before || entry.after) && <details className="mt-2 rounded-lg border border-[#E5E7EB] bg-white p-3">
            <summary className="cursor-pointer font-semibold">View recorded change</summary>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">{[["Before", entry.before], ["After", entry.after]].map(([label, value]) => <div key={label}>
              <p className="font-semibold">{label}</p><pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify(value, null, 2)}</pre>
            </div>)}</div>
          </details>}
        </li>)}
      </ol>
      <CursorPager cursors={cursors} nextCursor={data?.nextCursor} onChange={changePage} disabled={!data && !error} label={`${title} pages`} />
      <div className="mt-4 flex gap-4 text-sm font-semibold text-[#1B4332]">
        {error && <button type="button" onClick={() => { setError(""); setRevision((value) => value + 1); }}>Retry history</button>}
        <button type="button" onClick={() => { changePage([null]); setRevision((value) => value + 1); }}>Refresh history</button>
      </div>
    </div>
  </section>;
}
