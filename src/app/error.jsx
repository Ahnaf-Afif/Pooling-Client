"use client";

export default function ErrorPage({ reset }) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-3xl font-semibold">Something went wrong</h1>
      <p className="mt-3 text-sm text-[#6B7280]">The page could not be displayed. Please try again.</p>
      <button type="button" onClick={reset} className="mt-6 rounded-full bg-[#1B4332] px-5 py-2.5 text-sm font-semibold text-white">Try again</button>
    </main>
  );
}
