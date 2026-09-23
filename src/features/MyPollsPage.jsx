"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import PollCard from "@/components/PollCard";
import StatusPanel from "@/components/StatusPanel";
import { getMyPolls, getPoll } from "@/lib/api";
import {
  readMyPollIds,
  rememberMyPoll,
  replaceMyPollIds,
} from "@/lib/my-polls";

export default function MyPollsPage() {
  const [polls, setPolls] = useState([]);
  const [status, setStatus] = useState("loading");
  const [retryKey, setRetryKey] = useState(0);
  const [olderPollLink, setOlderPollLink] = useState("");
  const [recoveryStatus, setRecoveryStatus] = useState("");

  useEffect(() => {
    let active = true;
    Promise.resolve().then(async () => {
      const ids = readMyPollIds();
      if (!active) return;
      if (!ids.length) {
        setPolls([]);
        setStatus("ready");
        return;
      }

      setStatus("loading");
      try {
        const data = await getMyPolls(ids);
        if (!active) return;
        setPolls(data.polls);
        setStatus("ready");
        const existingIds = new Set(data.polls.map((poll) => poll.id));
        const cleanedIds = ids.filter((id) => existingIds.has(id));
        if (cleanedIds.length !== ids.length) replaceMyPollIds(cleanedIds);
      } catch {
        if (active) setStatus("error");
      }
    });

    return () => {
      active = false;
    };
  }, [retryKey]);

  async function recoverPoll(event) {
    event.preventDefault();
    setRecoveryStatus("Checking…");
    try {
      const value = olderPollLink.trim();
      const pathname = value.includes("/")
        ? new URL(value, window.location.origin).pathname
        : `/poll/${value}`;
      const match = pathname.match(/^\/poll\/([^/]+)(?:\/results)?\/?$/);
      const id = match ? decodeURIComponent(match[1]) : "";
      if (!/^[a-z0-9-]{1,80}$/.test(id))
        throw new Error("Paste a valid poll link.");

      await getPoll(id);
      if (!rememberMyPoll(id))
        throw new Error("This browser blocked local storage.");
      setOlderPollLink("");
      setRecoveryStatus("Poll added to My Polls.");
      setRetryKey((value) => value + 1);
    } catch (error) {
      setRecoveryStatus(error.message || "We couldn't find that poll.");
    }
  }

  return (
    <main className="mx-auto min-h-[65vh] max-w-6xl px-6 py-14">
      <div className="flex flex-col justify-between gap-5 border-b border-[#E5E7EB] pb-8 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#C9971A]">
            Your workspace
          </p>
          <h1 className="font-display mt-2 text-4xl font-semibold">My Polls</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6B7280]">
            Polls created in this browser are kept here. They are marked subtly
            throughout the main poll lists.
          </p>
        </div>
        <Link
          href="/create"
          className="w-fit rounded-full bg-[#1B4332] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#15362A]"
        >
          Create a Poll
        </Link>
      </div>

      <section
        aria-label="Polls created in this browser"
        className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        {status === "loading" &&
          Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="h-72 animate-pulse rounded-2xl bg-[#F5F5F4]"
            />
          ))}
        {status === "error" && (
          <StatusPanel
            title="We couldn't load your polls"
            message="The API may be temporarily unavailable. Your saved poll list is still on this browser."
            action={
              <button
                type="button"
                onClick={() => setRetryKey((value) => value + 1)}
                className="rounded-full bg-[#1B4332] px-5 py-2.5 text-sm font-semibold text-white"
              >
                Try again
              </button>
            }
          />
        )}
        {status === "ready" &&
          polls.map((poll) => <PollCard key={poll.id} poll={poll} isMine />)}
        {status === "ready" && polls.length === 0 && (
          <StatusPanel
            title="No polls saved on this browser yet"
            message="Create your first poll here and it will appear on this page automatically."
            action={
              <Link
                href="/create"
                className="rounded-full bg-[#1B4332] px-5 py-2.5 text-sm font-semibold text-white"
              >
                Create your first poll
              </Link>
            }
          />
        )}
      </section>

      <p className="mt-8 text-xs leading-5 text-[#9CA3AF]">
        My Polls is stored privately in this browser. Clearing site data or
        using another device will reset this list; an account would be required
        for cross-device ownership.
      </p>

      <details className="mt-6 max-w-2xl rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] px-5 py-4">
        <summary className="cursor-pointer text-sm font-semibold text-[#374151]">
          Missing a poll you created earlier?
        </summary>
        <p className="mt-3 text-sm leading-6 text-[#6B7280]">
          Paste its poll or results link to save it on this browser.
        </p>
        <form
          onSubmit={recoverPoll}
          className="mt-4 flex flex-col gap-2 sm:flex-row"
        >
          <label htmlFor="older-poll-link" className="sr-only">
            Older poll link
          </label>
          <input
            id="older-poll-link"
            type="text"
            value={olderPollLink}
            onChange={(event) => setOlderPollLink(event.target.value)}
            placeholder="https://…/poll/your-poll"
            className="min-w-0 flex-1 rounded-lg border border-[#D1D5DB] bg-white px-3 py-2.5 text-sm focus:border-[#1B4332] focus:ring-2 focus:ring-[#DDE8E2]"
          />
          <button
            type="submit"
            disabled={!olderPollLink.trim() || recoveryStatus === "Checking…"}
            className="rounded-full border border-[#1B4332] px-5 py-2.5 text-sm font-semibold text-[#1B4332] hover:bg-[#F0F7F4] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add poll
          </button>
        </form>
        <p
          role="status"
          className={`mt-2 min-h-5 text-xs ${recoveryStatus.startsWith("Poll added") ? "text-[#1B4332]" : "text-[#8A5C00]"}`}
        >
          {recoveryStatus}
        </p>
      </details>
    </main>
  );
}
