import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-6xl font-semibold text-[#1B4332]">404</p>
      <h1 className="font-display mt-4 text-3xl font-semibold">Page not found</h1>
      <Link href="/" className="mt-6 rounded-full bg-[#1B4332] px-5 py-2.5 text-sm font-semibold text-white">Back to polls</Link>
    </main>
  );
}
