"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
          </nav>

          <Link
            href="/create"
            className="hidden rounded-full bg-[#1B4332] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#15362A] md:block"
          >
            Create a Poll
          </Link>

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
            </nav>

          </div>
        )}
      </div>
    </header>
  );
}
