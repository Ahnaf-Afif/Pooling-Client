"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import AuthRequired from "@/components/AuthRequired";
import StatusPanel from "@/components/StatusPanel";
import AuditHistory from "@/components/AuditHistory";
import { PollEditor } from "@/features/ModerationPage";
import { editModeratedPoll, getModeratedPoll } from "@/lib/api";

function ModeratePoll() {
  const { slug } = useParams();
  const [draft, setDraft] = useState(null);
  const [votes, setVotes] = useState(0);
  const [historyRevision, setHistoryRevision] = useState(0);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    getModeratedPoll(slug)
      .then((data) => {
        if (!active) return;
        setDraft({
          id: data.poll.slug,
          question: data.poll.question,
          category: data.poll.category,
          options: data.poll.options.map((option) => option.label),
          note: "",
        });
        setVotes(data.poll.totalVotes);
        setStatus("ready");
      })
      .catch((requestError) => {
        if (!active) return;
        setError(requestError.message);
        setStatus(requestError.status === 403 ? "forbidden" : "error");
      });
    return () => { active = false; };
  }, [slug]);

  async function save(event) {
    event.preventDefault();
    const options = draft.options.map((option) => option.trim()).filter(Boolean);
    if (draft.question.trim().length < 5 || options.length < 2 || draft.note.trim().length < 3) {
      setError("Use a valid question, at least two options, and an audit note of at least 3 characters.");
      return;
    }
    setStatus("saving");
    setError("");
    setMessage("");
    try {
      const data = await editModeratedPoll(slug, {
        question: draft.question,
        category: draft.category,
        options,
        note: draft.note,
      });
      setDraft({
        id: data.poll.slug,
        question: data.poll.question,
        category: data.poll.category,
        options: data.poll.options.map((option) => option.label),
        note: "",
      });
      setHistoryRevision((value) => value + 1);
      setMessage(data.message);
      setStatus("ready");
    } catch (requestError) {
      setError(requestError.message);
      setStatus("ready");
    }
  }

  if (status === "loading") return <main className="mx-auto min-h-[60vh] max-w-2xl animate-pulse px-6 py-16"><div className="h-12 rounded bg-[#F3F4F6]" /><div className="mt-10 h-96 rounded-2xl bg-[#F3F4F6]" /></main>;
  if (status === "forbidden") return <main className="mx-auto min-h-[65vh] max-w-2xl px-6 py-20"><StatusPanel title="Moderator access required" message="This editor is restricted to moderators and administrators." action={<Link href="/" className="text-sm font-semibold text-[#1B4332]">← Return home</Link>} /></main>;
  if (status === "error") return <main className="mx-auto min-h-[65vh] max-w-2xl px-6 py-20"><StatusPanel title="Poll unavailable" message={error} action={<Link href="/moderation" className="text-sm font-semibold text-[#1B4332]">← Moderation</Link>} /></main>;

  return (
    <main className="mx-auto min-h-[65vh] max-w-2xl px-6 py-14">
      <Link href="/moderation" className="text-sm text-[#6B7280] hover:text-[#1B4332]">← Moderation</Link>
      <p className="mt-8 text-xs font-semibold uppercase tracking-widest text-[#C9971A]">Staff content controls</p>
      <h1 className="font-display mt-2 text-4xl font-semibold">Edit Poll</h1>
      <p className="mt-3 text-sm leading-6 text-[#6B7280]">Correct policy-violating content without changing vote totals. Every edit requires a reason and is recorded.</p>

      <PollEditor draft={draft} setDraft={setDraft} votes={votes} busy={status === "saving"} onSave={save} resolvesReport={false} />
      {error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="mt-5 rounded-xl border border-[#BFD5C9] bg-[#F0F7F4] px-4 py-3 text-sm text-[#1B4332]">{message}</p>}

      <AuditHistory key={`${slug}:${historyRevision}`} resource="polls" id={slug} title="Poll action history" />
    </main>
  );
}

export default function ModeratePollPage() {
  return <AuthRequired message="Sign in with a moderator account to edit this poll."><ModeratePoll /></AuthRequired>;
}
