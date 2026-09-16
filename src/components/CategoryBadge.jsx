const colors = {
  Tech: "bg-blue-50 text-blue-700",
  Education: "bg-purple-50 text-purple-700",
  Food: "bg-orange-50 text-orange-700",
  Career: "bg-emerald-50 text-emerald-700",
  Lifestyle: "bg-pink-50 text-pink-700",
  Social: "bg-amber-50 text-amber-700",
};

export default function CategoryBadge({ category, small = false }) {
  const colorClass = colors[category] ?? "bg-gray-100 text-gray-600";

  const sizeClass = small ? "text-xs px-2 py-0.5" : "text-xs px-2.5 py-1";

  return (
    <span
      className={`inline-block font-medium rounded-full ${sizeClass} ${colorClass}`}
    >
      {category}
    </span>
  );
}
