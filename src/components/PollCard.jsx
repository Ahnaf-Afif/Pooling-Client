import Link from "next/link";
import CategoryBadge from "./CategoryBadge";
import ShareButton from "./ShareButton";

export default function PollCard({ poll, isMine = false }) {
  const topOption =
    poll.options.length > 0
      ? poll.options.reduce((prev, current) =>
          current.votes > prev.votes ? current : prev,
        )
      : null;

  return (
    <article className={`group rounded-2xl border p-5 transition-all duration-200 hover:border-[#1B4332] hover:shadow-md ${isMine ? "border-[#BFD5C9] bg-[#FBFDFC] shadow-[inset_3px_0_0_#86A998]" : "border-[#E5E7EB] bg-white"}`}>
      <Link href={`/poll/${poll.id}`} className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryBadge category={poll.category} />
          {isMine && <span className="rounded-full border border-[#C8DCD1] bg-white px-2 py-0.5 text-[11px] font-semibold text-[#456556]">Your poll</span>}
        </div>

        {poll.trending && (
          <span className="text-xs font-medium text-[#C9971A] flex items-center gap-1">
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M5 0l1.18 3.29H10L7.09 5.32l1.18 3.29L5 6.59l-3.27 2.02L2.91 5.32 0 3.29h3.82z" />
            </svg>
            Trending
          </span>
        )}
      </div>

      <h3
        className="text-[#0F0F0F] text-base font-semibold leading-snug mb-4 group-hover:text-[#1B4332] transition-colors line-clamp-3"
        style={{
          fontFamily: "Fraunces, serif",
        }}
      >
        {poll.question}
      </h3>

      <div className="space-y-2 mb-4">
        {poll.options.slice(0, 3).map((option) => {
          const percentage = Math.round((option.votes / Math.max(poll.totalVotes, 1)) * 100);

          const isTop = topOption?.id === option.id;

          return (
            <div key={option.id}>
              <div className="flex justify-between text-xs mb-0.5">
                <span
                  className={
                    isTop
                      ? "font-semibold text-[#1B4332] truncate max-w-[75%]"
                      : "text-[#6B7280] truncate max-w-[75%]"
                  }
                >
                  {option.label}
                </span>

                <span
                  className={
                    isTop ? "font-semibold text-[#1B4332]" : "text-[#9CA3AF]"
                  }
                >
                  {percentage}%
                </span>
              </div>

              <div className="h-1.5 rounded-full bg-[#F3F4F6] overflow-hidden">
                <div
                  className={
                    isTop
                      ? "h-full rounded-full bg-[#1B4332] transition-all"
                      : "h-full rounded-full bg-[#D1D5DB] transition-all"
                  }
                  style={{
                    width: `${percentage}%`,
                  }}
                />
              </div>
            </div>
          );
        })}

        {poll.options.length > 3 && (
          <p className="text-xs text-[#9CA3AF]">
            +{poll.options.length - 3} more options
          </p>
        )}
      </div>

      </Link>

      <div className="flex items-center justify-between text-xs text-[#9CA3AF] border-t border-[#F3F4F6] pt-3">
        <span>{poll.totalVotes.toLocaleString("en-BD")} votes</span>
        <div className="flex items-center gap-2">
          <ShareButton poll={poll} compact />
          <Link href={`/poll/${poll.id}`} className="rounded-full px-2 py-1.5 font-medium text-[#1B4332] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]">Vote →</Link>
        </div>
      </div>
    </article>
  );
}
