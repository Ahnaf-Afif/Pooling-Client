import HomePage from "@/features/HomePage";

export default async function Page({ searchParams }) {
  const { filter, category } = await searchParams;
  return (
    <HomePage
      key={`${filter || "all"}-${category || "all"}`}
      showTrending={filter === "trending"}
      initialCategory={category}
    />
  );
}
