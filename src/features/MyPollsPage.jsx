"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import AuthRequired from "@/components/AuthRequired";
import PollCard from "@/components/PollCard";
import StatusPanel from "@/components/StatusPanel";
import { getMyPolls } from "@/lib/api";

function MyPollsWorkspace() {
  const [polls, setPolls] = useState([]);
  const [status, setStatus] = useState("loading");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    getMyPolls()
      .then((data) => {
        if (!active) return;
        setPolls(data.polls);
        setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("error");
      });
    return () => { active = false; };
  }, [retryKey]);

  return (
    <main className="mx-auto min-h-[65vh] max-w-6xl px-6 py-14">
      <div className="flex flex-col justify-between gap-5 border-b border-[#E5E7EB] pb-8 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#C9971A]">Your workspace</p>
          <h1 className="font-display mt-2 text-4xl font-semibold">My Polls</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6B7280]">Polls created with your account are available here on every device. Open Manage to edit a new poll or close, archive, and delete it.</p>
        </div>
        <Link href="/create" className="w-fit rounded-full bg-[#1B4332] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#15362A]">Create a Poll</Link>
      </div>

      <section aria-label="Polls created by your account" className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {status === "loading" && Array.from({ length: 3 }, (_, index) => <div key={index} className="h-72 animate-pulse rounded-2xl bg-[#F5F5F4]" />)}
        {status === "error" && <StatusPanel title="We couldn't load your polls" message="Your account is safe, but the API may be temporarily unavailable." action={<button type="button" onClick={() => { setStatus("loading"); setRetryKey((value) => value + 1); }} className="rounded-full bg-[#1B4332] px-5 py-2.5 text-sm font-semibold text-white">Try again</button>} />}
        {status === "ready" && polls.map((poll) => <PollCard key={poll.id} poll={poll} isMine />)}
        {status === "ready" && polls.length === 0 && <StatusPanel title="You haven't created a poll yet" message="Create your first poll and it will appear here on every signed-in device." action={<Link href="/create" className="rounded-full bg-[#1B4332] px-5 py-2.5 text-sm font-semibold text-white">Create your first poll</Link>} />}
      </section>

      <p className="mt-8 text-xs leading-5 text-[#9CA3AF]">Polls created before accounts were introduced remain public, but cannot be claimed from a public link because that would not prove ownership.</p>
    </main>
  );
}

export default function MyPollsPage() {
  return <AuthRequired message="Sign in to see and manage polls owned by your account."><MyPollsWorkspace /></AuthRequired>;
}
