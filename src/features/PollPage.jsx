"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import CategoryBadge from "@/components/CategoryBadge";
import ReportButton from "@/components/ReportButton";
import StatusPanel from "@/components/StatusPanel";
import { getPoll, submitVote } from "@/lib/api";

const dateFormatter = new Intl.DateTimeFormat("en-BD", { day: "numeric", month: "long", year: "numeric" });

export default function PollPage() {
  const { id } = useParams();
  const router = useRouter();
  const [poll, setPoll] = useState(null);
  const [selected, setSelected] = useState("");
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [previousVote, setPreviousVote] = useState("");
  const [alreadyVoted, setAlreadyVoted] = useState(false);

  useEffect(() => {
    getPoll(id)
      .then((data) => {
        setPoll(data.poll);
        try { setPreviousVote(localStorage.getItem(`voted:${id}`) || ""); } catch { /* Voting still works when storage is disabled. */ }
        setStatus("ready");
      })
      .catch((requestError) => {
        setError(requestError.message);
        setStatus("error");
      });
  }, [id]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!selected) return;
    setStatus("submitting");
    setError("");
    try {
      await submitVote(id, selected);
      try { localStorage.setItem(`voted:${id}`, selected); } catch { /* The server has already recorded the vote. */ }
      router.push(`/poll/${id}/results?voted=${encodeURIComponent(selected)}`);
    } catch (requestError) {
      setError(requestError.message);
      if (requestError.status === 409 && /already voted/i.test(requestError.message)) setAlreadyVoted(true);
      setStatus("ready");
    }
  }

  if (status === "loading") return <main className="mx-auto min-h-[60vh] max-w-2xl animate-pulse px-6 py-16"><div className="h-5 w-24 rounded bg-[#F3F4F6]" /><div className="mt-8 h-12 rounded bg-[#F3F4F6]" /><div className="mt-12 space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-16 rounded-xl bg-[#F3F4F6]" />)}</div></main>;
  if (status === "error" && !poll) return <main className="mx-auto max-w-2xl px-6 py-20"><StatusPanel title="Poll unavailable" message={error} action={<Link href="/" className="text-sm font-semibold text-[#1B4332]">← Back to all polls</Link>} /></main>;

  return (
    <main className="mx-auto max-w-2xl px-6 py-14">
      <Link href="/" className="text-sm text-[#6B7280] hover:text-[#1B4332]">← All polls</Link>
      <div className="mt-8"><CategoryBadge category={poll.category} /></div>
      <h1 className="font-display mt-4 text-3xl font-semibold leading-tight md:text-4xl">{poll.question}</h1>
      <p className="mt-3 text-sm text-[#9CA3AF]">{poll.totalVotes.toLocaleString("en-BD")} votes · Created {dateFormatter.format(new Date(poll.createdAt))}</p>

      {previousVote ? (
        <div className="mt-10 rounded-2xl border border-[#A7C4B5] bg-[#F0F7F4] p-6 text-center">
          <p className="font-display text-xl font-semibold text-[#1B4332]">Your vote is recorded</p>
          <p className="mt-2 text-sm text-[#6B7280]">You can return to the live results at any time.</p>
          <Link href={`/poll/${id}/results?voted=${encodeURIComponent(previousVote)}`} className="mt-5 inline-block rounded-full bg-[#1B4332] px-5 py-2.5 text-sm font-semibold text-white">View results</Link>
        </div>
      ) : poll.status && poll.status !== "active" ? (
        <div className="mt-10 rounded-2xl border border-[#D1D5DB] bg-[#F9FAFB] p-6 text-center"><p className="font-display text-xl font-semibold">Voting is {poll.status}</p><p className="mt-2 text-sm text-[#6B7280]">This poll is no longer accepting responses.</p><Link href={`/poll/${id}/results`} className="mt-5 inline-block rounded-full bg-[#1B4332] px-5 py-2.5 text-sm font-semibold text-white">View final results</Link></div>
      ) : <form onSubmit={handleSubmit} className="mt-10">
        <fieldset className="space-y-3">
          <legend className="sr-only">Choose your answer</legend>
          {poll.options.map((option) => (
            <label key={option.id} className={`block rounded-xl border-2 px-5 py-4 transition-colors ${selected === option.id ? "border-[#1B4332] bg-[#F0F7F4]" : "border-[#E5E7EB] hover:border-[#A7C4B5]"}`}>
              <span className="flex items-center gap-3">
                <input type="radio" name="poll-option" value={option.id} checked={selected === option.id} onChange={() => setSelected(option.id)} className="h-5 w-5 accent-[#1B4332]" />
                <span className="font-medium text-[#374151]">{option.label}</span>
              </span>
            </label>
          ))}
        </fieldset>
        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {alreadyVoted && <Link href={`/poll/${id}/results`} className="mt-4 block text-center text-sm font-semibold text-[#1B4332] hover:underline">View results →</Link>}
        <button type="submit" disabled={!selected || status === "submitting"} className="mt-7 w-full rounded-xl bg-[#1B4332] py-4 font-semibold text-white hover:bg-[#15362A] disabled:cursor-not-allowed disabled:bg-[#E5E7EB] disabled:text-[#9CA3AF]">{status === "submitting" ? "Submitting…" : "Submit Vote"}</button>
      </form>}
      {!previousVote && (!poll.status || poll.status === "active") && <p className="mt-4 text-center text-xs text-[#9CA3AF]">Results are revealed after you vote.</p>}
      <div className="mt-8 border-t border-[#E5E7EB] pt-5 text-center"><ReportButton pollId={poll.id} /></div>
    </main>
  );
}
