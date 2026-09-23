import HomePage from "@/features/HomePage";

const API_URL = (process.env.API_INTERNAL_URL || "http://localhost:5000/api").replace(/\/$/, "");

async function loadInitialPolls(category, trending) {
  const query = new URLSearchParams({ page: "1", limit: "12" });
  if (category !== "All") query.set("category", category);
  if (trending) query.set("trending", "true");

  try {
    const response = await fetch(`${API_URL}/polls?${query}`, {
      next: { revalidate: 30 },
      signal: AbortSignal.timeout(12000),
    });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

export default async function Page({ searchParams }) {
  const { filter, category } = await searchParams;
  const validCategory = ["All", "Tech", "Education", "Food", "Career", "Lifestyle", "Social"].includes(category) ? category : "All";
  const showTrending = filter === "trending";
  const initialData = await loadInitialPolls(validCategory, showTrending);

  return (
    <HomePage
      key={`${showTrending}-${validCategory}`}
      showTrending={showTrending}
      initialCategory={validCategory}
      initialData={initialData}
    />
  );
}
