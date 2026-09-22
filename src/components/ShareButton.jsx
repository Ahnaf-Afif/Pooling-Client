"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";

export default function ShareButton({ poll, compact = false }) {
  const dialog = useRef(null);
  const linkInput = useRef(null);
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");
  const path = `/poll/${encodeURIComponent(poll.id)}`;

  function open() {
    setUrl(new URL(path, window.location.origin).href);
    setMessage("");
    dialog.current?.showModal();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Link copied. Paste it anywhere to share the poll card.");
    } catch {
      linkInput.current?.focus();
      linkInput.current?.select();
      setMessage("Select and copy the link above.");
    }
  }

  async function share() {
    if (!navigator.share) return copy();
    try {
      await navigator.share({ title: poll.question, text: "Vote on this poll", url });
      dialog.current?.close();
    } catch (error) {
      if (error.name !== "AbortError") setMessage("Could not open the share menu. You can copy the link instead.");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label={`Share poll: ${poll.question}`}
        className={compact
          ? "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium text-[#617369] hover:bg-[#F0F7F4] hover:text-[#1B4332] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]"
          : "inline-flex items-center gap-2 rounded-full bg-[#1B4332] px-5 py-3 text-sm font-semibold text-white hover:bg-[#15362A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]"}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.7 10.6 6.6-4.2M8.7 13.4l6.6 4.2" /></svg>
        {compact ? "Share" : "Share this poll"}
      </button>

      <dialog
        ref={dialog}
        onClick={(event) => { if (event.target === dialog.current) dialog.current.close(); }}
        className="fixed inset-0 m-auto w-[min(92vw,520px)] max-h-[90vh] overflow-y-auto rounded-2xl border border-[#DDE8E2] bg-white p-0 text-[#0F0F0F] shadow-2xl backdrop:bg-[#0F0F0F]/60"
        aria-label="Share poll preview"
      >
        <div className="flex items-center justify-between px-5 py-4">
          <div><h2 className="font-display text-lg font-semibold">Share this poll</h2><p className="text-xs text-[#6B7280]">Your link includes a preview card where supported.</p></div>
          <button type="button" onClick={() => dialog.current.close()} aria-label="Close share preview" className="rounded-full p-2 text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#0F0F0F]">✕</button>
        </div>
        <Link href={path} onClick={() => dialog.current.close()} aria-label={`Open poll: ${poll.question}`} className="block hover:opacity-95 focus-visible:outline-2 focus-visible:outline-[#1B4332]">
          <Image src={`${path}/opengraph-image`} alt={`Preview card for ${poll.question}`} width={1200} height={630} unoptimized className="h-auto w-full border-y border-[#DDE8E2]" />
        </Link>
        <div className="px-5 py-5">
          <label htmlFor={`share-link-${poll.id}`} className="mb-2 block text-xs font-semibold text-[#374151]">Poll link</label>
          <input id={`share-link-${poll.id}`} ref={linkInput} value={url} onFocus={(event) => event.target.select()} readOnly className="w-full rounded-lg border border-[#DDE8E2] bg-[#F7FBF9] px-3 py-2 text-sm text-[#374151]" />
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={share} className="rounded-full bg-[#1B4332] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#15362A]">Share</button>
            <button type="button" onClick={copy} className="rounded-full border border-[#1B4332] px-5 py-2.5 text-sm font-semibold text-[#1B4332] hover:bg-[#F0F7F4]">Copy link</button>
            <Link href={path} onClick={() => dialog.current.close()} className="rounded-full px-4 py-2.5 text-sm font-semibold text-[#1B4332] hover:underline">Open poll →</Link>
          </div>
          <p role="status" className="mt-3 min-h-5 text-xs text-[#617369]">{message}</p>
        </div>
      </dialog>
    </>
  );
}
