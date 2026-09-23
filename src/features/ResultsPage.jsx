"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import CategoryBadge from "@/components/CategoryBadge";
import ReportButton from "@/components/ReportButton";
import ShareButton from "@/components/ShareButton";
import StatusPanel from "@/components/StatusPanel";
import { getPoll } from "@/lib/api";

function Results() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const [poll, setPoll] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getPoll(id)
      .then((data) => setPoll(data.poll))
      .catch((requestError) => setError(requestError.message));
  }, [id]);

  if (error) return <main className="mx-auto max-w-2xl px-6 py-20"><StatusPanel title="Results unavailable" message={error} action={<Link href="/" className="text-sm font-semibold text-[#1B4332]">← Back to all polls</Link>} /></main>;
  if (!poll) return <main className="mx-auto min-h-[60vh] max-w-2xl animate-pulse px-6 py-16"><div className="h-12 rounded bg-[#F3F4F6]" /><div className="mt-12 space-y-5">{[1, 2, 3].map((item) => <div key={item} className="h-14 rounded bg-[#F3F4F6]" />)}</div></main>;

  const sortedOptions = [...poll.options].sort((a, b) => b.votes - a.votes);
  const winner = poll.totalVotes ? sortedOptions[0] : null;
  const votedOption = searchParams.get("voted");
  const percentage = (votes) => poll.totalVotes ? Math.round((votes / poll.totalVotes) * 100) : 0;

  return (
    <main className="mx-auto max-w-2xl px-6 py-14">
      <Link href="/" className="text-sm text-[#6B7280] hover:text-[#1B4332]">← All polls</Link>
      <div className="mt-8"><CategoryBadge category={poll.category} /></div>
      <h1 className="font-display mt-4 text-3xl font-semibold leading-tight md:text-4xl">{poll.question}</h1>
      <p className="mt-3 text-sm text-[#9CA3AF]">{poll.totalVotes.toLocaleString("en-BD")} total votes · Live results</p>

      {winner && (
        <section className="mt-9 rounded-2xl border border-[#A7C4B5] bg-[#F0F7F4] p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#1B4332]">Leading answer</p>
          <p className="font-display mt-2 text-xl font-semibold">{winner.label}</p>
          <p className="mt-1 text-sm text-[#6B7280]">{winner.votes.toLocaleString("en-BD")} votes · {percentage(winner.votes)}%</p>
        </section>
      )}

      <section aria-label="Poll results" className="mt-10 space-y-5">
        {sortedOptions.map((option) => {
          const percent = percentage(option.votes);
          const isWinner = winner?.id === option.id;
          return (
            <div key={option.id}>
              <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                <span className={`min-w-0 truncate font-medium ${isWinner ? "text-[#1B4332]" : "text-[#374151]"}`}>{option.label}{votedOption === option.id && <span className="ml-2 rounded-full bg-[#FDF3D7] px-2 py-0.5 text-xs text-[#956D08]">Your vote</span>}</span>
                <span className="shrink-0"><strong className={isWinner ? "text-[#1B4332]" : "text-[#6B7280]"}>{percent}%</strong> <span className="text-xs text-[#9CA3AF]">({option.votes.toLocaleString("en-BD")})</span></span>
              </div>
              <div role="progressbar" aria-label={`${option.label}: ${percent}%`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={percent} className="h-3 overflow-hidden rounded-full bg-[#F3F4F6]"><div className={`h-full rounded-full ${isWinner ? "bg-[#1B4332]" : "bg-[#BFC8C3]"}`} style={{ width: `${percent}%` }} /></div>
            </div>
          );
        })}
      </section>

      {!winner && <p className="mt-8 rounded-xl bg-[#F5F5F4] px-5 py-4 text-sm text-[#6B7280]">No votes yet. Share this poll to collect the first response.</p>}
      <div className="mt-10 flex flex-wrap gap-3 border-t border-[#E5E7EB] pt-7">
        <ShareButton poll={poll} />
        <Link href="/create" className="rounded-full border border-[#1B4332] px-5 py-3 text-sm font-semibold text-[#1B4332] hover:bg-[#F0F7F4]">Create your own poll</Link>
      </div>
      <div className="mt-6 text-center"><ReportButton pollId={poll.id} /></div>
    </main>
  );
}

export default function ResultsPage() {
  return <Suspense fallback={<main className="min-h-[60vh]" />}><Results /></Suspense>;
}
