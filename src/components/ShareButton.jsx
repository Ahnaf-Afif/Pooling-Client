"use client";

import { useState } from "react";

export default function ShareButton({ question, pollId }) {
  const [message, setMessage] = useState("");

  async function share() {
    const url = `${window.location.origin}/poll/${pollId}`;
    try {
      if (navigator.share) await navigator.share({ title: question, text: question, url });
      else await navigator.clipboard.writeText(url);
      setMessage(navigator.share ? "Shared" : "Link copied");
    } catch (error) {
      if (error.name !== "AbortError") setMessage("Could not share");
    }
  }

  return (
    <div>
      <button type="button" onClick={share} className="rounded-full bg-[#1B4332] px-5 py-3 text-sm font-semibold text-white hover:bg-[#15362A]">{message || "Share this poll"}</button>
      <span className="sr-only" aria-live="polite">{message}</span>
    </div>
  );
}
