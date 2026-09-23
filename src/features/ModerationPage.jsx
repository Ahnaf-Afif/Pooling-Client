"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import AuthRequired from "@/components/AuthRequired";
import StatusPanel from "@/components/StatusPanel";
import { getReports, removeReportedPoll, suspendReportedOwner, updateReport } from "@/lib/api";

const STATUSES = ["pending", "resolved", "dismissed"];
const dateFormatter = new Intl.DateTimeFormat("en-BD", { dateStyle: "medium", timeStyle: "short" });

function ModerationQueue() {
  const [activeStatus, setActiveStatus] = useState("pending");
  const [reports, setReports] = useState([]);
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("loading");
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
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

  async function act(report, action) {
    if (action === "remove" && !window.confirm("Remove this poll from the website and resolve the report?")) return;
    if (action === "suspend" && !window.confirm("Suspend this poll owner's account?")) return;
    setBusyId(`${report.id}:${action}`);
    setError("");
    try {
      if (action === "remove") await removeReportedPoll(report.id);
      else if (action === "suspend") await suspendReportedOwner(report.id);
      else await updateReport(report.id, action);
      setStatus("loading");
      setReloadKey((value) => value + 1);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyId("");
    }
  }

  if (status === "forbidden") return <main className="mx-auto min-h-[65vh] max-w-2xl px-6 py-20"><StatusPanel title="Moderator access required" message="This area is restricted to moderators and administrators." action={<Link href="/" className="text-sm font-semibold text-[#1B4332]">← Return home</Link>} /></main>;

  return (
    <main className="mx-auto min-h-[65vh] max-w-5xl px-6 py-14">
      <div className="flex flex-col justify-between gap-5 border-b border-[#E5E7EB] pb-8 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-widest text-[#C9971A]">Safety tools</p><h1 className="font-display mt-2 text-4xl font-semibold">Moderation</h1><p className="mt-3 text-sm text-[#6B7280]">Review community reports without exposing reporter identities.</p></div>{role && <span className="w-fit rounded-full bg-[#F0F7F4] px-3 py-1 text-xs font-semibold capitalize text-[#1B4332]">{role}</span>}</div>
      <div className="mt-7 flex flex-wrap gap-2">{STATUSES.map((item) => <button key={item} type="button" onClick={() => { setStatus("loading"); setError(""); setActiveStatus(item); }} className={`rounded-full border px-4 py-2 text-sm font-semibold capitalize ${activeStatus === item ? "border-[#1B4332] bg-[#1B4332] text-white" : "border-[#E5E7EB] text-[#6B7280]"}`}>{item}</button>)}</div>
      {error && status !== "forbidden" && <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <section className="mt-8 space-y-4" aria-label={`${activeStatus} reports`}>
        {status === "loading" && Array.from({ length: 3 }, (_, index) => <div key={index} className="h-48 animate-pulse rounded-2xl bg-[#F3F4F6]" />)}
        {status === "error" && <StatusPanel title="Reports unavailable" message="The moderation queue could not be loaded." action={<button type="button" onClick={() => { setStatus("loading"); setError(""); setReloadKey((value) => value + 1); }} className="rounded-full bg-[#1B4332] px-5 py-2.5 text-sm font-semibold text-white">Try again</button>} />}
        {status === "ready" && reports.length === 0 && <StatusPanel title={`No ${activeStatus} reports`} message="There is nothing in this queue right now." />}
        {status === "ready" && reports.map((report) => (
          <article key={report.id} className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><span className="rounded-full bg-[#FDF3D7] px-2.5 py-1 text-xs font-semibold capitalize text-[#8A5C00]">{report.reason}</span><h2 className="font-display mt-3 text-xl font-semibold">{report.poll?.question || "Poll no longer available"}</h2></div><time className="text-xs text-[#9CA3AF]">{dateFormatter.format(new Date(report.createdAt))}</time></div>
            {report.details && <p className="mt-3 rounded-lg bg-[#F9FAFB] px-3 py-2 text-sm leading-6 text-[#4B5563]">{report.details}</p>}
            <p className="mt-3 text-xs text-[#9CA3AF]">Poll status: {report.poll?.deleted ? "deleted" : report.poll?.status || "missing"}</p>
            <div className="mt-5 flex flex-wrap gap-2"><Link href={`/poll/${report.pollSlug}`} className="rounded-full border border-[#D1D5DB] px-4 py-2 text-xs font-semibold text-[#374151]">Open poll</Link>{activeStatus === "pending" && <><button type="button" onClick={() => act(report, "dismissed")} disabled={Boolean(busyId)} className="rounded-full border border-[#D1D5DB] px-4 py-2 text-xs font-semibold text-[#374151] disabled:opacity-50">Dismiss</button><button type="button" onClick={() => act(report, "resolved")} disabled={Boolean(busyId)} className="rounded-full border border-[#1B4332] px-4 py-2 text-xs font-semibold text-[#1B4332] disabled:opacity-50">Resolve</button><button type="button" onClick={() => act(report, "remove")} disabled={Boolean(busyId) || report.poll?.deleted} className="rounded-full bg-red-700 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">Remove poll</button>{role === "admin" && report.poll?.creatorId && <button type="button" onClick={() => act(report, "suspend")} disabled={Boolean(busyId)} className="rounded-full border border-red-300 px-4 py-2 text-xs font-semibold text-red-700 disabled:opacity-50">Suspend owner</button>}</>}</div>
          </article>
        ))}
      </section>
    </main>
  );
}

export default function ModerationPage() {
  return <AuthRequired message="Sign in with a moderator account to review reports."><ModerationQueue /></AuthRequired>;
}
