const API_URL = (process.env.API_INTERNAL_URL || "http://localhost:5000/api").replace(/\/$/, "");

export async function getPollForPreview(id) {
  const response = await fetch(`${API_URL}/polls/${encodeURIComponent(id)}`, {
    next: { revalidate: 60 },
    signal: AbortSignal.timeout(15000),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Poll preview is temporarily unavailable");
  const { poll } = await response.json();
  return poll || null;
}
