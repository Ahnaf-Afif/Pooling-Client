"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import AuthRequired from "@/components/AuthRequired";
import StatusPanel from "@/components/StatusPanel";
import { archivePoll, closePoll, deletePoll, getOwnedPoll, updatePoll } from "@/lib/api";

const CATEGORIES = ["Tech", "Education", "Food", "Career", "Lifestyle", "Social"];

function ManagePoll() {
  const { id } = useParams();
  const router = useRouter();
  const [poll, setPoll] = useState(null);
  const [question, setQuestion] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [options, setOptions] = useState(["", ""]);
  const [status, setStatus] = useState("loading");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    getOwnedPoll(id)
      .then(({ poll: loadedPoll }) => {
        setPoll(loadedPoll);
        setQuestion(loadedPoll.question);
        setCategory(loadedPoll.category);
        setOptions(loadedPoll.options.map((option) => option.label));
        setStatus("ready");
      })
      .catch((requestError) => {
        setError(requestError.message);
        setStatus("error");
      });
  }, [id]);

  async function save(event) {
    event.preventDefault();
    const cleanOptions = options.map((option) => option.trim()).filter(Boolean);
    setError("");
    setMessage("");
    if (question.trim().length < 5) return setError("Write a question with at least 5 characters.");
    if (cleanOptions.length < 2) return setError("Add at least two options.");
    if (new Set(cleanOptions.map((option) => option.toLowerCase())).size !== cleanOptions.length) return setError("Each option must be different.");
    setBusy("save");
    try {
      const data = await updatePoll(id, { question, category, options: cleanOptions });
      setPoll(data.poll);
      setMessage("Poll changes saved.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy("");
    }
  }

  async function runAction(action) {
    setBusy(action);
    setError("");
    setMessage("");
    try {
      if (action === "delete") {
        if (!window.confirm("Delete this poll? It will disappear publicly and this cannot be undone from the website.")) return;
        await deletePoll(id);
        router.push("/my-polls");
        router.refresh();
        return;
      }
      const data = action === "close" ? await closePoll(id) : await archivePoll(id);
      setPoll(data.poll);
      setMessage(action === "close" ? "Voting is now closed. Results remain public." : "Poll archived and removed from public listings.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy("");
    }
  }

  if (status === "loading") return <main className="mx-auto min-h-[60vh] max-w-2xl animate-pulse px-6 py-16"><div className="h-12 rounded bg-[#F3F4F6]" /><div className="mt-10 h-96 rounded-2xl bg-[#F3F4F6]" /></main>;
  if (status === "error") return <main className="mx-auto max-w-2xl px-6 py-20"><StatusPanel title="Poll unavailable" message={error} action={<Link href="/my-polls" className="text-sm font-semibold text-[#1B4332]">← Back to My Polls</Link>} /></main>;

  const canEdit = poll.totalVotes === 0 && (!poll.status || poll.status === "active");
  const updateOption = (index, value) => setOptions((items) => items.map((item, itemIndex) => itemIndex === index ? value : item));

  return (
    <main className="mx-auto max-w-2xl px-6 py-14">
      <Link href="/my-polls" className="text-sm text-[#6B7280] hover:text-[#1B4332]">← My Polls</Link>
      <div className="mt-8 flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-widest text-[#C9971A]">Owner controls</p><h1 className="font-display mt-2 text-4xl font-semibold">Manage Poll</h1></div>
        <span className="rounded-full bg-[#F3F4F6] px-3 py-1 text-xs font-semibold capitalize text-[#6B7280]">{poll.status || "active"}</span>
      </div>
      <p className="mt-3 text-sm text-[#6B7280]">{poll.totalVotes.toLocaleString("en-BD")} votes · {canEdit ? "Editable until the first vote" : "Question and choices are locked"}</p>

      <form onSubmit={save} className="mt-9 space-y-7">
        <div><label htmlFor="manage-question" className="mb-2 block text-sm font-semibold text-[#374151]">Question</label><textarea id="manage-question" value={question} onChange={(event) => setQuestion(event.target.value)} disabled={!canEdit} maxLength={240} rows={3} className="w-full resize-none rounded-xl border border-[#D1D5DB] px-4 py-3 disabled:bg-[#F9FAFB] disabled:text-[#6B7280]" /></div>
        <fieldset disabled={!canEdit}><legend className="mb-3 text-sm font-semibold text-[#374151]">Category</legend><div className="flex flex-wrap gap-2">{CATEGORIES.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`rounded-full border px-4 py-2 text-sm font-medium ${category === item ? "border-[#1B4332] bg-[#1B4332] text-white" : "border-[#E5E7EB] text-[#6B7280]"}`}>{item}</button>)}</div></fieldset>
        <fieldset disabled={!canEdit}><legend className="mb-3 text-sm font-semibold text-[#374151]">Answer options</legend><div className="space-y-3">{options.map((option, index) => <div key={index} className="flex items-center gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F3F4F6] text-xs text-[#6B7280]">{index + 1}</span><input aria-label={`Option ${index + 1}`} value={option} onChange={(event) => updateOption(index, event.target.value)} maxLength={100} className="min-w-0 flex-1 rounded-xl border border-[#D1D5DB] px-4 py-3 text-sm disabled:bg-[#F9FAFB]" />{canEdit && options.length > 2 && <button type="button" onClick={() => setOptions((items) => items.filter((_, itemIndex) => itemIndex !== index))} className="h-8 w-8 rounded-full text-[#9CA3AF] hover:bg-red-50 hover:text-red-600">×</button>}</div>)}</div>{canEdit && options.length < 6 && <button type="button" onClick={() => setOptions((items) => [...items, ""])} className="mt-4 text-sm font-semibold text-[#1B4332]">+ Add another option</button>}</fieldset>
        {canEdit && <button type="submit" disabled={Boolean(busy)} className="w-full rounded-xl bg-[#1B4332] py-4 font-semibold text-white disabled:opacity-60">{busy === "save" ? "Saving…" : "Save changes"}</button>}
      </form>

      {error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="mt-5 rounded-xl border border-[#BFD5C9] bg-[#F0F7F4] px-4 py-3 text-sm text-[#1B4332]">{message}</p>}

      <section className="mt-10 border-t border-[#E5E7EB] pt-7"><h2 className="font-display text-xl font-semibold">Poll lifecycle</h2><p className="mt-2 text-sm leading-6 text-[#6B7280]">Closing stops new votes but keeps the poll and results visible. Archiving also removes it from public listings. Delete is a soft deletion retained for moderation and integrity.</p><div className="mt-5 flex flex-wrap gap-3">{(!poll.status || poll.status === "active") && <button type="button" onClick={() => runAction("close")} disabled={Boolean(busy)} className="rounded-full border border-[#1B4332] px-5 py-2.5 text-sm font-semibold text-[#1B4332] disabled:opacity-50">{busy === "close" ? "Closing…" : "Close voting"}</button>}{poll.status !== "archived" && <button type="button" onClick={() => runAction("archive")} disabled={Boolean(busy)} className="rounded-full border border-[#D1D5DB] px-5 py-2.5 text-sm font-semibold text-[#374151] disabled:opacity-50">{busy === "archive" ? "Archiving…" : "Archive"}</button>}<button type="button" onClick={() => runAction("delete")} disabled={Boolean(busy)} className="rounded-full border border-red-200 px-5 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">Delete poll</button><Link href={`/poll/${poll.id}/results`} className="rounded-full px-4 py-2.5 text-sm font-semibold text-[#1B4332] hover:underline">View results →</Link></div></section>
    </main>
  );
}

export default function ManagePollPage() {
  return <AuthRequired message="Sign in with the poll owner's account to manage this poll."><ManagePoll /></AuthRequired>;
}
