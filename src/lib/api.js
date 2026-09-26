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
    signal: options?.signal
      ? AbortSignal.any([options.signal, AbortSignal.timeout(20_000)])
      : AbortSignal.timeout(20_000),
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

export const getPolls = ({ category = "All", trending = false, cursor, limit = 12 } = {}) => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);
  if (category !== "All") params.set("category", category);
  if (trending) params.set("trending", "true");
  return request(`/polls?${params}`);
};
export const getPoll = (id, options) => request(`/polls/${encodeURIComponent(id)}`, options);
export const getMyPolls = ({ cursor, limit = 24 } = {}) => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);
  return request(`/polls/mine?${params}`);
};
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
export const getSecurity = () => request("/account/security");
export const getSessions = () => request("/account/security/sessions");
export const securityAction = (action, body = {}) =>
  request(`/account/security/${action}`, { method: "POST", body: JSON.stringify(body) });
export const exportAccount = () => request("/account/export");
export const deleteAccount = () =>
  request("/account/delete", { method: "POST", body: JSON.stringify({ confirmation: "DELETE" }) });
export const getReports = (status = "pending", page = 1) =>
  request(`/moderation/reports?status=${encodeURIComponent(status)}&page=${page}`);
export const getModeratedPoll = (id) =>
  request(`/moderation/polls/${encodeURIComponent(id)}`);
export const editModeratedPoll = (id, poll) =>
  request(`/moderation/polls/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(poll),
  });
export const updateReport = (id, status, note = "") =>
  request(`/moderation/reports/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ status, note }),
  });
export const addReportNote = (id, note) =>
  request(`/moderation/reports/${encodeURIComponent(id)}/notes`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
export const editReportedPoll = (id, poll) =>
  request(`/moderation/reports/${encodeURIComponent(id)}/poll`, {
    method: "PATCH",
    body: JSON.stringify(poll),
  });
export const removeReportedPoll = (id, note = "") =>
  request(`/moderation/reports/${encodeURIComponent(id)}/remove-poll`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
export const suspendReportedOwner = (id, note = "") =>
  request(`/moderation/reports/${encodeURIComponent(id)}/suspend-owner`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
export const getUsers = ({ page = 1, query = "", field = "name" } = {}) => {
  const params = new URLSearchParams({ page: String(page), field });
  if (query) params.set("q", query);
  return request(`/moderation/users?${params}`);
};
export const updateUserRole = (id, role) =>
  request(`/moderation/users/${encodeURIComponent(id)}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
export const suspendUser = (id, note) =>
  request(`/moderation/users/${encodeURIComponent(id)}/suspend`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
export const reactivateUser = (id, note = "") =>
  request(`/moderation/users/${encodeURIComponent(id)}/reactivate`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
