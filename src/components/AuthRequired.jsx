"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import StatusPanel from "./StatusPanel";
import { useSession } from "@/lib/auth-client";
import { getSecurity } from "@/lib/api";

function StaffAccess({ children }) {
  const [security, setSecurity] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const check = () => getSecurity().then((data) => {
      if (active) { setSecurity(data); setError(""); }
    }).catch((requestError) => { if (active) setError(requestError.message); });
    check();
    const timer = setInterval(check, 60_000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  if (!security && !error) return <main className="mx-auto min-h-[60vh] max-w-2xl px-6 py-20">Checking staff access…</main>;
  if (error || !security?.staff || !security.verified || security.staffSessionExpired) {
    return <main className="mx-auto min-h-[65vh] max-w-2xl px-6 py-20"><StatusPanel title="Verify staff access" message={error || (security?.staffSessionExpired ? "Sign out and sign in again to renew your staff session." : "Staff accounts must set up an authenticator and verify a fresh code in Account security.")} action={<Link href="/account#security" className="rounded-full bg-[#1B4332] px-5 py-2.5 text-sm font-semibold text-white">Account security</Link>} /></main>;
  }
  return children;
}

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

  const staffRoute = pathname.startsWith("/moderation") || pathname.startsWith("/admin");
  if (staffRoute) return <StaffAccess>{children}</StaffAccess>;

  return children;
}
