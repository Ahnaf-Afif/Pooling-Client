"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { signOut, useSession } from "@/lib/auth-client";

function getFirstName(user) {
  const name = user?.name?.trim();
  return name ? name.split(/\s+/)[0] : "Account";
}

function getGooglePhoto(user) {
  if (!user?.image) return "";
  try {
    const url = new URL(user.image);
    const isGoogleImage = url.hostname === "googleusercontent.com" || url.hostname.endsWith(".googleusercontent.com");
    return url.protocol === "https:" && isGoogleImage ? url.href : "";
  } catch {
    return "";
  }
}

function ProfilePhoto({ src }) {
  const [failedSrc, setFailedSrc] = useState("");
  if (!src || failedSrc === src) return null;
  return (
    // The browser loads this directly from Google; the app never stores or proxies the image file.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" width="28" height="28" referrerPolicy="no-referrer" onError={() => setFailedSrc(src)} className="h-7 w-7 shrink-0 rounded-full object-cover" />
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const role = session?.user?.role;
  const firstName = getFirstName(session?.user);
  const profilePhoto = getGooglePhoto(session?.user);

  async function handleSignOut() {
    await signOut();
    setIsMenuOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#E5E7EB]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <span className="w-7 h-7 rounded-full bg-[#1B4332] flex items-center justify-center">
              <span className="text-white text-xs font-bold">?</span>
            </span>

            <span
              className="text-[#1B4332] font-semibold text-base tracking-tight"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              What Do You Think?
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#6B7280]">
            <Link
              href="/"
              className={`hover:text-[#0F0F0F] transition-colors ${
                pathname === "/" ? "text-[#0F0F0F]" : ""
              }`}
            >
              Home
            </Link>

            <Link
              href="/?filter=trending"
              className="hover:text-[#0F0F0F] transition-colors"
            >
              Trending
            </Link>

            <Link
              href="/create"
              className={`hover:text-[#0F0F0F] transition-colors ${
                pathname === "/create" ? "text-[#0F0F0F]" : ""
              }`}
            >
              Create Poll
            </Link>

            <Link
              href="/my-polls"
              className={`hover:text-[#0F0F0F] transition-colors ${
                pathname === "/my-polls" ? "text-[#0F0F0F]" : ""
              }`}
            >
              My Polls
            </Link>

            {(role === "admin" || role === "moderator") && (
              <Link href="/moderation" className={`hover:text-[#0F0F0F] transition-colors ${pathname === "/moderation" ? "text-[#0F0F0F]" : ""}`}>Moderation</Link>
            )}
          </nav>

          <div className="hidden md:block">
            {isPending ? <span className="block h-9 w-24 animate-pulse rounded-full bg-[#F3F4F6]" /> : session?.user ? (
              <Link href="/account" className={`inline-flex max-w-40 items-center gap-2 rounded-full border border-[#BFD5C9] bg-[#F7FBF9] py-1.5 pr-4 text-sm font-semibold text-[#1B4332] hover:bg-[#F0F7F4] ${profilePhoto ? "pl-1.5" : "pl-4"}`}>
                <ProfilePhoto src={profilePhoto} />
                <span className="truncate">{firstName}</span>
              </Link>
            ) : (
              <Link href={`/sign-in?returnTo=${encodeURIComponent(pathname)}`} className="rounded-full bg-[#1B4332] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#15362A]">Sign in</Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg text-[#1B4332] hover:bg-[#F0F7F4] transition-colors"
            aria-label="Toggle navigation menu"
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? (
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            ) : (
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 6h16" />
                <path d="M4 12h16" />
                <path d="M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-[#E5E7EB] py-4">
            <nav className="flex flex-col text-sm font-medium text-[#6B7280]">
              <Link
                href="/"
                onClick={() => setIsMenuOpen(false)}
                className={`py-3 hover:text-[#0F0F0F] transition-colors ${
                  pathname === "/" ? "text-[#0F0F0F]" : ""
                }`}
              >
                Home
              </Link>

              <Link
                href="/?filter=trending"
                onClick={() => setIsMenuOpen(false)}
                className="py-3 hover:text-[#0F0F0F] transition-colors"
              >
                Trending
              </Link>

              <Link
                href="/create"
                onClick={() => setIsMenuOpen(false)}
                className={`py-3 hover:text-[#0F0F0F] transition-colors ${
                  pathname === "/create" ? "text-[#0F0F0F]" : ""
                }`}
              >
                Create Poll
              </Link>

              <Link
                href="/my-polls"
                onClick={() => setIsMenuOpen(false)}
                className={`py-3 hover:text-[#0F0F0F] transition-colors ${
                  pathname === "/my-polls" ? "text-[#0F0F0F]" : ""
                }`}
              >
                My Polls
              </Link>

              {(role === "admin" || role === "moderator") && <Link href="/moderation" onClick={() => setIsMenuOpen(false)} className="py-3 hover:text-[#0F0F0F]">Moderation</Link>}

              {session?.user ? (
                <>
                  <Link href="/account" onClick={() => setIsMenuOpen(false)} className="mt-2 flex items-center gap-2 border-t border-[#E5E7EB] py-3 font-semibold text-[#1B4332]">
                    <ProfilePhoto src={profilePhoto} />
                    <span>{firstName}</span>
                  </Link>
                  <button type="button" onClick={handleSignOut} className="py-3 text-left hover:text-[#0F0F0F]">Sign out</button>
                </>
              ) : !isPending && <Link href={`/sign-in?returnTo=${encodeURIComponent(pathname)}`} onClick={() => setIsMenuOpen(false)} className="mt-2 border-t border-[#E5E7EB] py-3 font-semibold text-[#1B4332]">Sign in</Link>}
            </nav>

          </div>
        )}
      </div>
    </header>
  );
}
