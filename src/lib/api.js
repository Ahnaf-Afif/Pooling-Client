const API_URL = (process.env.NEXT_PUBLIC_API_URL || "/api").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request(path, options) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options?.body ? { "Content-Type": "application/json" } : {}),
      ...options?.headers,
    },
    cache: "no-store",
  });
  const data = response.status === 204 ? {} : await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(data.message || "Unable to complete the request", response.status);
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
export const getMyPolls = () => request("/polls/mine");
export const getOwnedPoll = (id) => request(`/polls/mine/${encodeURIComponent(id)}`);
export const createPoll = (poll) =>
  request("/polls", { method: "POST", body: JSON.stringify(poll) });
export const updatePoll = (id, poll) =>
  request(`/polls/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(poll) });
export const closePoll = (id) =>
  request(`/polls/${encodeURIComponent(id)}/close`, { method: "POST" });
export const archivePoll = (id) =>
  request(`/polls/${encodeURIComponent(id)}/archive`, { method: "POST" });
export const deletePoll = (id) =>
  request(`/polls/${encodeURIComponent(id)}`, { method: "DELETE" });
export const submitVote = (id, optionId) =>
  request(`/polls/${encodeURIComponent(id)}/votes`, {
    method: "POST",
    body: JSON.stringify({ optionId }),
  });
export const reportPoll = (id, report) =>
  request(`/polls/${encodeURIComponent(id)}/reports`, {
    method: "POST",
    body: JSON.stringify(report),
  });
export const getAuthConfiguration = () => request("/auth-config");
export const getReports = (status = "pending") =>
  request(`/moderation/reports?status=${encodeURIComponent(status)}`);
export const updateReport = (id, status) =>
  request(`/moderation/reports/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
export const removeReportedPoll = (id) =>
  request(`/moderation/reports/${encodeURIComponent(id)}/remove-poll`, { method: "POST" });
export const suspendReportedOwner = (id) =>
  request(`/moderation/reports/${encodeURIComponent(id)}/suspend-owner`, { method: "POST" });
