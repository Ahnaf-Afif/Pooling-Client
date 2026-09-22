const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

async function request(path, options) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Unable to complete the request");
  }
  return data;
}

export const getPolls = ({ category = "All", trending = false, page = 1, limit = 12 } = {}) => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (category !== "All") params.set("category", category);
  if (trending) params.set("trending", "true");
  return request(`/polls?${params}`);
};
export const getPoll = (id) => request(`/polls/${encodeURIComponent(id)}`);
export const createPoll = (poll) =>
  request("/polls", { method: "POST", body: JSON.stringify(poll) });
export const submitVote = (id, optionId) =>
  request(`/polls/${encodeURIComponent(id)}/votes`, {
    method: "POST",
    body: JSON.stringify({ optionId }),
  });
