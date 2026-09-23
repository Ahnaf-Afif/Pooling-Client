"use client";

import Link from "next/link";
import { useState } from "react";

import AuthRequired from "@/components/AuthRequired";
import ShareButton from "@/components/ShareButton";
import { createPoll } from "@/lib/api";

const CATEGORIES = ["Tech", "Education", "Food", "Career", "Lifestyle", "Social"];

function CreatePollForm() {
  const [question, setQuestion] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [options, setOptions] = useState(["", ""]);
  const [error, setError] = useState("");
  const [createdPoll, setCreatedPoll] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const updateOption = (index, value) => setOptions((items) => items.map((item, itemIndex) => itemIndex === index ? value : item));
  const removeOption = (index) => setOptions((items) => items.filter((_, itemIndex) => itemIndex !== index));

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    const cleanOptions = options.map((option) => option.trim()).filter(Boolean);
    if (question.trim().length < 5) return setError("Write a question with at least 5 characters.");
    if (cleanOptions.length < 2) return setError("Add at least two options.");
    if (new Set(cleanOptions.map((option) => option.toLowerCase())).size !== cleanOptions.length) return setError("Each option must be different.");

    setSubmitting(true);
    try {
      const { poll } = await createPoll({ question, category, options: cleanOptions });
      setCreatedPoll(poll);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (createdPoll) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-24 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#F0F7F4] text-3xl" aria-hidden="true">✓</div>
        <h1 className="font-display mt-6 text-4xl font-semibold">Your poll is live</h1>
        <p className="mx-auto mt-3 max-w-lg text-[#6B7280]">Share it now and let the conversation begin.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ShareButton poll={createdPoll} />
          <Link href={`/poll/${createdPoll.id}`} className="rounded-full border border-[#1B4332] px-6 py-3 text-sm font-semibold text-[#1B4332] hover:bg-[#F0F7F4]">Open your poll</Link>
          <Link href="/my-polls" className="rounded-full px-6 py-3 text-sm font-semibold text-[#1B4332] hover:underline">My Polls</Link>
          <Link href="/" className="rounded-full px-6 py-3 text-sm font-semibold text-[#374151] hover:underline">Browse polls</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-14">
      <Link href="/" className="text-sm text-[#6B7280] hover:text-[#1B4332]">← Back to polls</Link>
      <div className="mt-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#C9971A]">Start a conversation</p>
        <h1 className="font-display mt-2 text-4xl font-semibold">Create a Poll</h1>
        <p className="mt-3 text-[#6B7280]">Ask one clear question and give people meaningful choices.</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="mt-10 space-y-8">
        <div>
          <label htmlFor="question" className="mb-2 block text-sm font-semibold text-[#374151]">Question</label>
          <textarea id="question" value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={240} rows={3} placeholder="e.g. Which city has the best street food?" className="w-full resize-none rounded-xl border border-[#D1D5DB] px-4 py-3 focus:border-[#1B4332] focus:ring-2 focus:ring-[#DDE8E2]" />
          <p className="mt-1 text-right text-xs text-[#9CA3AF]">{question.length}/240</p>
        </div>

        <fieldset>
          <legend className="mb-3 text-sm font-semibold text-[#374151]">Category</legend>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((item) => <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)} className={`rounded-full border px-4 py-2 text-sm font-medium ${category === item ? "border-[#1B4332] bg-[#1B4332] text-white" : "border-[#E5E7EB] text-[#6B7280]"}`}>{item}</button>)}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-sm font-semibold text-[#374151]">Answer options <span className="font-normal text-[#9CA3AF]">(2–6)</span></legend>
          <div className="space-y-3">
            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F3F4F6] text-xs text-[#6B7280]">{index + 1}</span>
                <label htmlFor={`option-${index}`} className="sr-only">Option {index + 1}</label>
                <input id={`option-${index}`} value={option} onChange={(event) => updateOption(index, event.target.value)} maxLength={100} placeholder={`Option ${index + 1}`} className="min-w-0 flex-1 rounded-xl border border-[#D1D5DB] px-4 py-3 text-sm focus:border-[#1B4332] focus:ring-2 focus:ring-[#DDE8E2]" />
                {options.length > 2 && <button type="button" onClick={() => removeOption(index)} aria-label={`Remove option ${index + 1}`} className="h-8 w-8 rounded-full text-[#9CA3AF] hover:bg-red-50 hover:text-red-600">×</button>}
              </div>
            ))}
          </div>
          {options.length < 6 && <button type="button" onClick={() => setOptions((items) => [...items, ""])} className="mt-4 text-sm font-semibold text-[#1B4332] hover:underline">+ Add another option</button>}
        </fieldset>

        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={submitting} className="w-full rounded-xl bg-[#1B4332] py-4 font-semibold text-white hover:bg-[#15362A] disabled:cursor-not-allowed disabled:opacity-60">{submitting ? "Publishing…" : "Publish Poll"}</button>
      </form>
    </main>
  );
}

export default function CreatePollPage() {
  return <AuthRequired message="Sign in with a verified account to create and manage polls."><CreatePollForm /></AuthRequired>;
}
