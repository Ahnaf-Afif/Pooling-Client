"use client";

import { useRef, useState } from "react";

import { reportPoll } from "@/lib/api";

const REASONS = [
  ["spam", "Spam or scam"],
  ["harassment", "Harassment"],
  ["hate", "Hateful content"],
  ["misinformation", "Harmful misinformation"],
  ["other", "Other"],
];

export default function ReportButton({ pollId }) {
  const dialog = useRef(null);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function open() {
    setReason("");
    setDetails("");
    setMessage("");
    setError("");
    dialog.current?.showModal();
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await reportPoll(pollId, { reason, details });
      setMessage(result.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" onClick={open} className="text-xs font-medium text-[#9CA3AF] hover:text-red-700">Report poll</button>
      <dialog ref={dialog} onClick={(event) => { if (event.target === dialog.current) dialog.current.close(); }} className="fixed inset-0 m-auto w-[min(92vw,480px)] rounded-2xl border border-[#E5E7EB] bg-white p-0 text-[#0F0F0F] shadow-2xl backdrop:bg-[#0F0F0F]/60">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-4"><div><h2 className="font-display text-xl font-semibold">Report this poll</h2><p className="mt-1 text-xs text-[#6B7280]">Reports are reviewed by moderators.</p></div><button type="button" onClick={() => dialog.current.close()} aria-label="Close report form" className="rounded-full p-2 text-[#6B7280] hover:bg-[#F3F4F6]">✕</button></div>
        {message ? <div className="p-6 text-center"><p className="font-semibold text-[#1B4332]">{message}</p><button type="button" onClick={() => dialog.current.close()} className="mt-5 rounded-full bg-[#1B4332] px-5 py-2.5 text-sm font-semibold text-white">Done</button></div> : (
          <form onSubmit={submit} className="space-y-5 p-5">
            <fieldset><legend className="mb-2 text-sm font-semibold text-[#374151]">Reason</legend><div className="space-y-2">{REASONS.map(([value, label]) => <label key={value} className="flex items-center gap-3 rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-sm"><input type="radio" name="report-reason" value={value} checked={reason === value} onChange={() => setReason(value)} className="accent-[#1B4332]" />{label}</label>)}</div></fieldset>
            <div><label htmlFor={`report-details-${pollId}`} className="mb-2 block text-sm font-semibold text-[#374151]">Details <span className="font-normal text-[#9CA3AF]">(optional)</span></label><textarea id={`report-details-${pollId}`} value={details} onChange={(event) => setDetails(event.target.value)} maxLength={500} rows={3} className="w-full resize-none rounded-xl border border-[#D1D5DB] px-3 py-2.5 text-sm" /></div>
            {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <button type="submit" disabled={!reason || busy} className="w-full rounded-xl bg-[#1B4332] py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Submitting…" : "Submit report"}</button>
          </form>
        )}
      </dialog>
    </>
  );
}
