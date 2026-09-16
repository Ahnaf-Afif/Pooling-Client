import Link from "next/link";
import CategoryBadge from "./CategoryBadge";

export default function PollCard({ poll }) {
  const topOption =
    poll.options.length > 0
      ? poll.options.reduce((prev, current) =>
          current.votes > prev.votes ? current : prev,
        )
      : null;

  return (
    <Link
      href={`/poll/${poll.id}`}
      className="group block bg-white border border-[#E5E7EB] rounded-2xl p-5 hover:border-[#1B4332] hover:shadow-md transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <CategoryBadge category={poll.category} />

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

      <div className="flex items-center justify-between text-xs text-[#9CA3AF] border-t border-[#F3F4F6] pt-3">
        <span>{poll.totalVotes.toLocaleString("en-BD")} votes</span>

        <span className="text-[#1B4332] font-medium group-hover:underline">
          Vote →
        </span>
      </div>
    </Link>
  );
}
