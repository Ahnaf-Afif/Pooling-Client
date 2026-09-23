import Link from "next/link";

const CATEGORIES = [
  "Tech",
  "Education",
  "Food",
  "Career",
  "Lifestyle",
  "Social",
];

const linkClassName = "transition-colors hover:text-white";

export default function Footer() {
  return (
    <footer className="bg-[#0F0F0F] text-white">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 py-14 md:grid-cols-3">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-[#C9971A] text-xs font-bold text-white"
            >
              ?
            </span>
            <span className="font-display text-base font-semibold">
              What Do You Think?
            </span>
          </div>

          <p className="text-sm leading-relaxed text-[#9CA3AF]">
            The pulse of Bangladesh — one poll at a time. Create, share, and
            discover what your community thinks.
          </p>
        </div>

        <nav aria-label="Explore">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#6B7280]">
            Explore
          </p>
          <ul className="space-y-2 text-sm text-[#D1D5DB]">
            <li>
              <Link href="/?filter=trending#polls" className={linkClassName}>
                Trending Polls
              </Link>
            </li>
            <li>
              <Link href="/create" className={linkClassName}>
                Create a Poll
              </Link>
            </li>
            <li>
              <Link href="/my-polls" className={linkClassName}>
                My Polls
              </Link>
            </li>
            <li>
              <Link href="/#how-it-works" className={linkClassName}>
                How It Works
              </Link>
            </li>
            <li><Link href="/privacy" className={linkClassName}>Privacy</Link></li>
            <li><Link href="/terms" className={linkClassName}>Terms</Link></li>
          </ul>
        </nav>

        <nav aria-label="Poll categories">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#6B7280]">
            Categories
          </p>
          <ul className="space-y-2 text-sm text-[#D1D5DB]">
            {CATEGORIES.map((category) => (
              <li key={category}>
                <Link
                  href={{ pathname: "/", query: { category } }}
                  className={linkClassName}
                >
                  {category}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-2 border-t border-[#1F1F1F] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-[#6B7280]">
          © {new Date().getFullYear()} What Do You Think? · Made in Bangladesh 🇧🇩
        </p>
        <p lang="bn" className="text-xs text-[#6B7280]">
          মতামত দিন, পরিবর্তন আনুন।
        </p>
      </div>
    </footer>
  );
}
