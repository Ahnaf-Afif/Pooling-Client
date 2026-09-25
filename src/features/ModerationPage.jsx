"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import AuthRequired from "@/components/AuthRequired";
import StatusPanel from "@/components/StatusPanel";
import {
  addReportNote,
  editReportedPoll,
  getReports,
  removeReportedPoll,
  suspendReportedOwner,
  updateReport,
} from "@/lib/api";

const STATUSES = ["pending", "resolved", "dismissed"];
const CATEGORIES = ["Tech", "Education", "Food", "Career", "Lifestyle", "Social"];
const dateFormatter = new Intl.DateTimeFormat("en-BD", {
  dateStyle: "medium",
  timeStyle: "short",
});
const actionLabels = {
  note_added: "Added an internal note",
  report_dismissed: "Dismissed the report and kept the poll",
  report_reopened: "Reopened the report",
  poll_edited: "Edited the poll and resolved the report",
  poll_removed: "Removed the poll and resolved the report",
  owner_suspended: "Suspended the poll owner",
};

export function PollEditor({ draft, setDraft, votes, busy, onCancel, onSave }) {
  const canChangeOptionCount = votes === 0;
  const updateOption = (index, value) => {
    setDraft((current) => ({
      ...current,
      options: current.options.map((option, optionIndex) => optionIndex === index ? value : option),
    }));
  };

  return (
    <form onSubmit={onSave} className="mt-5 space-y-4 rounded-xl border border-[#BFD5C9] bg-[#F7FBF9] p-4">
      <div>
        <label htmlFor={`question-${draft.id}`} className="mb-1.5 block text-xs font-semibold text-[#374151]">Question</label>
        <textarea id={`question-${draft.id}`} value={draft.question} onChange={(event) => setDraft((current) => ({ ...current, question: event.target.value }))} maxLength={240} rows={2} className="w-full resize-none rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm" />
      </div>
      <div>
        <label htmlFor={`category-${draft.id}`} className="mb-1.5 block text-xs font-semibold text-[#374151]">Category</label>
        <select id={`category-${draft.id}`} value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))} className="w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm">
          {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
        </select>
      </div>
      <fieldset>
        <legend className="mb-1.5 text-xs font-semibold text-[#374151]">Answer options</legend>
        <div className="space-y-2">
          {draft.options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <input aria-label={`Option ${index + 1}`} value={option} onChange={(event) => updateOption(index, event.target.value)} maxLength={100} className="min-w-0 flex-1 rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm" />
              {canChangeOptionCount && draft.options.length > 2 && <button type="button" onClick={() => setDraft((current) => ({ ...current, options: current.options.filter((_, optionIndex) => optionIndex !== index) }))} className="h-8 w-8 rounded-full text-[#9CA3AF] hover:bg-red-50 hover:text-red-700" aria-label={`Remove option ${index + 1}`}>×</button>}
            </div>
          ))}
        </div>
        {canChangeOptionCount && draft.options.length < 6 && <button type="button" onClick={() => setDraft((current) => ({ ...current, options: [...current.options, ""] }))} className="mt-2 text-xs font-semibold text-[#1B4332]">+ Add option</button>}
        {!canChangeOptionCount && <p className="mt-2 text-xs text-[#6B7280]">Labels can be corrected, but options cannot be added or removed after voting starts. Vote counts and option IDs are preserved.</p>}
      </fieldset>
      <div>
        <label htmlFor={`edit-note-${draft.id}`} className="mb-1.5 block text-xs font-semibold text-[#374151]">Reason for the edit</label>
        <textarea id={`edit-note-${draft.id}`} value={draft.note} onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))} maxLength={500} rows={2} placeholder="Required for the audit history" className="w-full resize-none rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm" />
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className="rounded-full bg-[#1B4332] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Save edit & resolve"}</button>
        {onCancel && <button type="button" onClick={onCancel} disabled={busy} className="rounded-full border border-[#D1D5DB] px-4 py-2 text-xs font-semibold text-[#374151] disabled:opacity-50">Cancel</button>}
      </div>
    </form>
  );
}

function ModerationQueue() {
  const router = useRouter();
  const [activeStatus, setActiveStatus] = useState("pending");
  const [reports, setReports] = useState([]);
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("loading");
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notes, setNotes] = useState({});
  const [editing, setEditing] = useState(null);
  const [pollLookup, setPollLookup] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    getReports(activeStatus)
      .then((data) => {
        if (!active) return;
        setReports(data.reports);
        setRole(data.role);
        setStatus("ready");
      })
      .catch((requestError) => {
        if (!active) return;
        setError(requestError.message);
        setStatus(requestError.status === 403 ? "forbidden" : "error");
      });
    return () => { active = false; };
  }, [activeStatus, reloadKey]);

  function reload() {
    setEditing(null);
    setStatus("loading");
    setReloadKey((value) => value + 1);
  }

  async function act(report, action) {
    const note = notes[report.id] || "";
    if (action === "remove" && !window.confirm("Remove this poll and resolve the report? The poll will no longer be public.")) return;
    if (action === "suspend" && !window.confirm("Suspend this poll owner's account and revoke their sessions?")) return;
    setBusyId(`${report.id}:${action}`);
    setError("");
    try {
      if (action === "remove") await removeReportedPoll(report.id, note);
      else if (action === "suspend") await suspendReportedOwner(report.id, note);
      else if (action === "note") await addReportNote(report.id, note);
      else await updateReport(report.id, action, note);
      setNotes((current) => ({ ...current, [report.id]: "" }));
      reload();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyId("");
    }
  }

  async function saveEdit(event) {
    event.preventDefault();
    const options = editing.options.map((option) => option.trim()).filter(Boolean);
    if (editing.question.trim().length < 5 || options.length < 2 || editing.note.trim().length < 3) {
      setError("Use a valid question, at least two options, and an audit note of at least 3 characters.");
      return;
    }
    setBusyId(`${editing.id}:edit`);
    setError("");
    try {
      await editReportedPoll(editing.id, {
        question: editing.question,
        category: editing.category,
        options,
        note: editing.note,
      });
      reload();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyId("");
    }
  }

  function openPollEditor(event) {
    event.preventDefault();
    let slug = pollLookup.trim();
    try {
      const url = new URL(slug);
      const match = url.pathname.match(/^\/poll\/([^/]+)/);
      slug = match ? decodeURIComponent(match[1]) : "";
    } catch {
      slug = slug.replace(/^\/?poll\//, "").split(/[/?#]/)[0];
    }
    if (!/^[a-z0-9-]{1,80}$/.test(slug)) {
      setError("Paste a valid poll link or poll slug.");
      return;
    }
    router.push(`/moderation/polls/${encodeURIComponent(slug)}`);
  }

  if (status === "forbidden") {
    return <main className="mx-auto min-h-[65vh] max-w-2xl px-6 py-20"><StatusPanel title="Moderator access required" message="This area is restricted to moderators and administrators." action={<Link href="/" className="text-sm font-semibold text-[#1B4332]">← Return home</Link>} /></main>;
  }

  return (
    <main className="mx-auto min-h-[65vh] max-w-5xl px-6 py-14">
      <div className="flex flex-col justify-between gap-5 border-b border-[#E5E7EB] pb-8 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#C9971A]">Safety tools</p>
          <h1 className="font-display mt-2 text-4xl font-semibold">Moderation</h1>
          <p className="mt-3 text-sm text-[#6B7280]">Review reports, record decisions, and keep reporter identities private.</p>
        </div>
        <div className="flex items-center gap-3">
          {role === "admin" && <Link href="/admin/users" className="rounded-full border border-[#1B4332] px-4 py-2 text-xs font-semibold text-[#1B4332]">Manage users</Link>}
          {role && <span className="w-fit rounded-full bg-[#F0F7F4] px-3 py-1 text-xs font-semibold capitalize text-[#1B4332]">{role}</span>}
        </div>
      </div>

      <div className="mt-7 flex flex-wrap gap-2">
        {STATUSES.map((item) => <button key={item} type="button" onClick={() => { setStatus("loading"); setError(""); setEditing(null); setActiveStatus(item); }} className={`rounded-full border px-4 py-2 text-sm font-semibold capitalize ${activeStatus === item ? "border-[#1B4332] bg-[#1B4332] text-white" : "border-[#E5E7EB] text-[#6B7280]"}`}>{item}</button>)}
      </div>

      <form onSubmit={openPollEditor} className="mt-6 flex flex-col gap-2 rounded-2xl bg-[#F9FAFB] p-4 sm:flex-row sm:items-center">
        <label htmlFor="poll-lookup" className="shrink-0 text-sm font-semibold text-[#374151]">Edit any poll</label>
        <input id="poll-lookup" value={pollLookup} onChange={(event) => setPollLookup(event.target.value)} placeholder="Paste a poll link or slug" className="min-w-0 flex-1 rounded-xl border border-[#D1D5DB] bg-white px-4 py-2.5 text-sm" />
        <button type="submit" className="rounded-xl border border-[#1B4332] px-4 py-2.5 text-sm font-semibold text-[#1B4332]">Open editor</button>
      </form>

      {error && status !== "forbidden" && <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <section className="mt-8 space-y-4" aria-label={`${activeStatus} reports`}>
        {status === "loading" && Array.from({ length: 3 }, (_, index) => <div key={index} className="h-56 animate-pulse rounded-2xl bg-[#F3F4F6]" />)}
        {status === "error" && <StatusPanel title="Reports unavailable" message="The moderation queue could not be loaded." action={<button type="button" onClick={reload} className="rounded-full bg-[#1B4332] px-5 py-2.5 text-sm font-semibold text-white">Try again</button>} />}
        {status === "ready" && reports.length === 0 && <StatusPanel title={`No ${activeStatus} reports`} message="There is nothing in this queue right now." />}
        {status === "ready" && reports.map((report) => {
          const isEditing = editing?.id === report.id;
          return (
            <article key={report.id} className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="rounded-full bg-[#FDF3D7] px-2.5 py-1 text-xs font-semibold capitalize text-[#8A5C00]">{report.reason}</span>
                  <h2 className="font-display mt-3 text-xl font-semibold">{report.poll?.question || "Poll no longer available"}</h2>
                </div>
                <time className="text-xs text-[#9CA3AF]">{dateFormatter.format(new Date(report.createdAt))}</time>
              </div>
              {report.details && <p className="mt-3 rounded-lg bg-[#F9FAFB] px-3 py-2 text-sm leading-6 text-[#4B5563]">{report.details}</p>}
              <p className="mt-3 text-xs text-[#9CA3AF]">Poll status: {report.poll?.deleted ? "deleted" : report.poll?.status || "missing"}{report.poll ? ` · ${report.poll.totalVotes.toLocaleString("en-BD")} votes` : ""}</p>

              {isEditing && <PollEditor draft={editing} setDraft={setEditing} votes={report.poll.totalVotes} busy={busyId.endsWith(":edit")} onCancel={() => setEditing(null)} onSave={saveEdit} />}

              {report.history.length > 0 && (
                <details className="mt-5 rounded-xl bg-[#F9FAFB] px-4 py-3">
                  <summary className="cursor-pointer text-xs font-semibold text-[#374151]">Action history ({report.history.length})</summary>
                  <ol className="mt-3 space-y-3 border-l border-[#D1D5DB] pl-4">
                    {report.history.map((entry) => <li key={entry.id} className="text-xs leading-5 text-[#6B7280]"><span className="font-semibold text-[#374151]">{entry.actorName}</span> · {actionLabels[entry.action] || entry.action.replaceAll("_", " ")}<br /><time>{dateFormatter.format(new Date(entry.createdAt))}</time>{entry.changedFields.length > 0 && ` · Changed ${entry.changedFields.join(", ")}`}{entry.note && <p className="mt-1 text-[#4B5563]">“{entry.note}”</p>}</li>)}
                  </ol>
                </details>
              )}

              <div className="mt-5">
                <label htmlFor={`note-${report.id}`} className="mb-1.5 block text-xs font-semibold text-[#374151]">Internal note</label>
                <textarea id={`note-${report.id}`} value={notes[report.id] || ""} onChange={(event) => setNotes((current) => ({ ...current, [report.id]: event.target.value }))} maxLength={500} rows={2} placeholder="Shared with moderators; never shown publicly" className="w-full resize-none rounded-lg border border-[#D1D5DB] px-3 py-2 text-sm" />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {report.poll && !report.poll.deleted && <Link href={`/poll/${report.pollSlug}`} className="rounded-full border border-[#D1D5DB] px-4 py-2 text-xs font-semibold text-[#374151]">Open poll</Link>}
                <button type="button" onClick={() => act(report, "note")} disabled={Boolean(busyId) || !(notes[report.id] || "").trim()} className="rounded-full border border-[#D1D5DB] px-4 py-2 text-xs font-semibold text-[#374151] disabled:opacity-50">Add note</button>
                {activeStatus === "pending" ? <>
                  <button type="button" onClick={() => act(report, "dismissed")} disabled={Boolean(busyId)} className="rounded-full border border-[#D1D5DB] px-4 py-2 text-xs font-semibold text-[#374151] disabled:opacity-50">Dismiss & keep</button>
                  {report.poll && !report.poll.deleted && <button type="button" onClick={() => setEditing({ id: report.id, question: report.poll.question, category: report.poll.category, options: report.poll.options.map((option) => option.label), note: notes[report.id] || "" })} disabled={Boolean(busyId)} className="rounded-full border border-[#1B4332] px-4 py-2 text-xs font-semibold text-[#1B4332] disabled:opacity-50">Edit & resolve</button>}
                  <button type="button" onClick={() => act(report, "remove")} disabled={Boolean(busyId)} className="rounded-full bg-red-700 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{report.poll?.deleted || !report.poll ? "Resolve removed poll" : "Remove & resolve"}</button>
                  {role === "admin" && report.poll?.creatorId && <button type="button" onClick={() => act(report, "suspend")} disabled={Boolean(busyId)} className="rounded-full border border-red-300 px-4 py-2 text-xs font-semibold text-red-700 disabled:opacity-50">Suspend owner</button>}
                </> : <button type="button" onClick={() => act(report, "pending")} disabled={Boolean(busyId)} className="rounded-full border border-[#1B4332] px-4 py-2 text-xs font-semibold text-[#1B4332] disabled:opacity-50">Reopen</button>}
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}

export default function ModerationPage() {
  return <AuthRequired message="Sign in with a moderator account to review reports."><ModerationQueue /></AuthRequired>;
}
