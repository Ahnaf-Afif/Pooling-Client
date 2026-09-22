"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import PollCard from "@/components/PollCard";
import ShareButton from "@/components/ShareButton";
import StatusPanel from "@/components/StatusPanel";
import { getPolls } from "@/lib/api";

const CATEGORIES = ["All", "Tech", "Education", "Food", "Career", "Lifestyle", "Social"];
const EMPTY_STATS = { totalVotes: 0, activePolls: 0, categories: 0, trending: 0 };
const STEPS = [
  ["01", "Create a Poll", "Ask a clear question, add your choices, and publish it in seconds."],
  ["02", "Share It", "Send the poll link to friends and communities wherever they already gather."],
  ["03", "See Results", "Watch every vote update the results and discover the community's view."],
];

export default function HomePage({ showTrending = false, initialCategory, initialData }) {
  const validCategory = CATEGORIES.includes(initialCategory) ? initialCategory : "All";
  const [activeCategory, setActiveCategory] = useState(validCategory);
  const [polls, setPolls] = useState(initialData?.polls || []);
  const [stats, setStats] = useState(initialData?.stats || EMPTY_STATS);
  const [status, setStatus] = useState(initialData ? "ready" : "loading");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialData?.hasMore || false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const requestVersion = useRef(0);
  const useInitialData = useRef(Boolean(initialData));

  useEffect(() => {
    if (useInitialData.current) {
      useInitialData.current = false;
      return;
    }
    let active = true;
    getPolls({ category: activeCategory, trending: showTrending })
      .then((data) => {
        if (!active) return;
        setPolls(data.polls);
        setStats(data.stats);
        setHasMore(data.hasMore);
        setPage(1);
        setStatus("ready");
      })
      .catch(() => { if (active) setStatus("error"); });
    return () => { active = false; };
  }, [activeCategory, showTrending, retryKey]);

  function chooseCategory(category) {
    if (category === activeCategory) return;
    requestVersion.current += 1;
    setActiveCategory(category);
    setPolls([]);
    setHasMore(false);
    setLoadingMore(false);
    setStatus("loading");
    setLoadMoreError("");
  }

  function retry() {
    requestVersion.current += 1;
    setStatus("loading");
    setLoadingMore(false);
    setRetryKey((value) => value + 1);
  }

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    const version = requestVersion.current;
    setLoadingMore(true);
    setLoadMoreError("");
    try {
      const nextPage = page + 1;
      const data = await getPolls({ category: activeCategory, trending: showTrending, page: nextPage });
      if (version !== requestVersion.current) return;
      setPolls((current) => [...current, ...data.polls]);
      setPage(nextPage);
      setHasMore(data.hasMore);
      setStats(data.stats);
    } catch {
      if (version === requestVersion.current) setLoadMoreError("Could not load more polls. Please try again.");
    } finally {
      if (version === requestVersion.current) setLoadingMore(false);
    }
  }

  const featuredPoll = polls.find((poll) => poll.trending) || polls[0];

  return (
    <main>
      <section className="relative overflow-hidden border-b border-[#E5E7EB] bg-white">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -right-40 -top-48 h-[520px] w-[520px] rounded-full bg-[#F0F7F4]" />
          <div className="absolute -bottom-36 -left-28 h-72 w-72 rounded-full bg-[#FDF8EC]" />
        </div>

        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 py-20 md:grid-cols-2 md:py-24">
          <div>
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#F3E0A2] bg-[#FDF8EC] px-3 py-1 text-xs font-semibold text-[#A97700]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#C9971A]" />
              Community-powered polling
            </span>
            <h1 className="font-display max-w-xl text-5xl font-semibold leading-[1.08] tracking-tight md:text-6xl">
              What does <span className="text-[#1B4332]">Bangladesh</span> think?
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-8 text-[#6B7280]">
              Ask honest questions, vote on topics that matter, and see what your community really thinks.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#polls" className="rounded-full bg-[#1B4332] px-6 py-3 text-sm font-semibold text-white hover:bg-[#15362A]">
                Explore Polls
              </a>
              <Link href="/create" className="rounded-full border border-[#1B4332] px-6 py-3 text-sm font-semibold text-[#1B4332] hover:bg-[#F0F7F4]">
                Create a Poll
              </Link>
            </div>
          </div>

          <div className="hidden md:block">
            {featuredPoll ? (
              <div className="rounded-3xl border border-[#E5E7EB] bg-white p-7 shadow-[0_20px_60px_rgba(27,67,50,0.1)]">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#C9971A]">Community poll</p>
                <h2 className="font-display mt-3 text-2xl font-semibold leading-snug">{featuredPoll.question}</h2>
                <div className="mt-6 space-y-3">
                  {featuredPoll.options.slice(0, 3).map((option) => {
                    const percent = Math.round((option.votes / Math.max(featuredPoll.totalVotes, 1)) * 100);
                    return (
                      <div key={option.id}>
                        <div className="mb-1 flex justify-between text-sm"><span>{option.label}</span><strong className="text-[#1B4332]">{percent}%</strong></div>
                        <div className="h-2 overflow-hidden rounded-full bg-[#F3F4F6]"><div className="h-full rounded-full bg-[#1B4332]" style={{ width: `${percent}%` }} /></div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-6 flex items-center justify-between gap-3">
                  <Link href={`/poll/${featuredPoll.id}`} className="text-sm font-semibold text-[#1B4332] hover:underline">Vote now →</Link>
                  <ShareButton poll={featuredPoll} compact />
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-[#DDE8E2] bg-[#F7FBF9] p-8">
                <p className="font-display text-2xl font-semibold text-[#1B4332]">Your question can start the conversation.</p>
                <p className="mt-3 text-sm leading-6 text-[#6B7280]">Be the first to create a poll and share it with your community.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section aria-label="Platform statistics" className="border-b border-[#DDE8E2] bg-[#F0F7F4]">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 py-6 md:grid-cols-4">
          {[
            ["Total Votes", stats.totalVotes],
            ["Active Polls", stats.activePolls],
            ["Categories", stats.categories],
            ["Trending", stats.trending],
          ].map(([label, value]) => (
            <div key={label}><strong className="font-display text-2xl text-[#1B4332]">{value.toLocaleString("en-BD")}</strong><p className="text-xs text-[#6B7280]">{label}</p></div>
          ))}
        </div>
      </section>

      <section id="polls" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-16">
        <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#C9971A]">Have your say</p>
            <h2 className="font-display mt-2 text-3xl font-semibold">{showTrending ? "Trending Polls" : "Explore Polls"}</h2>
          </div>
          <div aria-label="Filter by category" className="flex flex-wrap gap-2">
            {CATEGORIES.map((category) => (
              <button key={category} type="button" aria-pressed={activeCategory === category} onClick={() => chooseCategory(category)} className={`rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors ${activeCategory === category ? "border-[#1B4332] bg-[#1B4332] text-white" : "border-[#E5E7EB] text-[#6B7280] hover:border-[#1B4332] hover:text-[#1B4332]"}`}>
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {status === "loading" && Array.from({ length: 6 }, (_, index) => <div key={index} className="h-72 animate-pulse rounded-2xl bg-[#F5F5F4]" />)}
          {status === "error" && <StatusPanel title="We couldn't load the polls" message="The API may be starting up or temporarily unavailable." action={<button type="button" onClick={retry} className="rounded-full bg-[#1B4332] px-5 py-2.5 text-sm font-semibold text-white">Try again</button>} />}
          {status === "ready" && polls.map((poll) => <PollCard key={poll.id} poll={poll} />)}
          {status === "ready" && polls.length === 0 && <StatusPanel title={showTrending ? "No trending polls yet" : "No polls here yet"} message="Start a thoughtful conversation. Your poll will appear here as soon as it is published." action={<Link href="/create" className="rounded-full bg-[#1B4332] px-5 py-2.5 text-sm font-semibold text-white">Create the first poll</Link>} />}
        </div>
        {status === "ready" && hasMore && <div className="mt-9 text-center"><button type="button" onClick={loadMore} disabled={loadingMore} className="rounded-full border border-[#1B4332] px-6 py-2.5 text-sm font-semibold text-[#1B4332] hover:bg-[#F0F7F4] disabled:opacity-60">{loadingMore ? "Loading…" : "Load more polls"}</button>{loadMoreError && <p role="alert" className="mt-3 text-sm text-red-700">{loadMoreError}</p>}</div>}
      </section>

      <section id="how-it-works" className="scroll-mt-20 bg-[#0F0F0F] py-20 text-white">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-[#D4A017]">Simple by design</p>
          <h2 className="font-display mt-3 text-center text-4xl font-semibold">How it works</h2>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {STEPS.map(([step, title, description]) => (
              <article key={step} className="rounded-2xl border border-[#292929] p-7">
                <span className="font-mono text-xs text-[#D4A017]">{step}</span>
                <h3 className="font-display mt-5 text-xl font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#9CA3AF]">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
