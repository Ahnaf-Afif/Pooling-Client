"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import StatusPanel from "./StatusPanel";
import { useSession } from "@/lib/auth-client";

export default function AuthRequired({ children, message = "Sign in to continue." }) {
  const pathname = usePathname();
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <main className="mx-auto min-h-[60vh] max-w-2xl animate-pulse px-6 py-16"><div className="h-10 rounded bg-[#F3F4F6]" /><div className="mt-8 h-64 rounded-2xl bg-[#F3F4F6]" /></main>;
  }

  if (!session?.user) {
    const href = `/sign-in?returnTo=${encodeURIComponent(pathname)}`;
    return (
      <main className="mx-auto min-h-[65vh] max-w-2xl px-6 py-20">
        <StatusPanel
          title="Sign in required"
          message={message}
          action={<Link href={href} className="rounded-full bg-[#1B4332] px-5 py-2.5 text-sm font-semibold text-white">Sign in securely</Link>}
        />
      </main>
    );
  }

  return children;
}
