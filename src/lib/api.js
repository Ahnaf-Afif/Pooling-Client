import { runCommand } from "./commands.js";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "/api").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request(path, options, validate) {
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
  let data;
  try { data = response.status === 204 ? {} : await response.json(); }
  catch {
    throw new ApiError("The server returned an unreadable response. The action may have completed; retry unchanged data in this tab.", response.ok ? 502 : response.status);
  }

  if (!response.ok) {
    throw new ApiError(data?.message || "Unable to complete the request", response.status);
  }
  if (validate && (!validate(data) || !["true", "false"].includes(response.headers.get("Idempotency-Replayed")))) {
    throw new ApiError("The server did not confirm this action. Retry unchanged data in this tab, or check its history before submitting anything new.", 502);
  }
  return data;
}

async function command(path, options, field = "message") {
  const session = await request("/auth/get-session");
  if (!session?.user?.id) throw new ApiError("Sign in before submitting this action", 401);
  return runCommand(session.user.id, path, options, (prepared) => request(path, prepared, (data) => {
    if (field === "poll") return typeof data?.poll?.id === "string" || typeof data?.poll?.slug === "string";
    if (field === "action" || field === "user") return typeof data?.[field]?.id === "string";
    return typeof data?.message === "string";
  }).catch((error) => {
    if (error instanceof ApiError) throw error;
    throw new ApiError("The action could not be confirmed. Keep the data unchanged and retry in this tab, or check its history before starting a new action.", 0);
  }));
}

export const getPolls = ({ category = "All", trending = false, cursor, limit = 12 } = {}) => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);
  if (category !== "All") params.set("category", category);
  if (trending) params.set("trending", "true");
  return request(`/polls?${params}`);
};
export const getPoll = (id, options) => request(`/polls/${encodeURIComponent(id)}`, options);
export const getMyVote = (id, options) => request(`/polls/${encodeURIComponent(id)}/my-vote`, options);
export const getMyPolls = ({ cursor, limit = 24 } = {}) => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);
  return request(`/polls/mine?${params}`);
};
export const getOwnedPoll = (id) => request(`/polls/mine/${encodeURIComponent(id)}`);
export const createPoll = (poll) =>
  command("/polls", { method: "POST", body: JSON.stringify(poll) }, "poll");
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
export const getRecoveryRequests = (after) => request(`/moderation/recovery${after ? `?after=${encodeURIComponent(after)}` : ""}`);
export const approveRecoveryRequest = (id, note) => request(`/moderation/recovery/${encodeURIComponent(id)}/approve`, {
  method: "POST", body: JSON.stringify({ note, identityConfirmed: true }),
});
export const getSessions = () => request("/account/security/sessions");
export const securityAction = (action, body = {}) =>
  request(`/account/security/${action}`, { method: "POST", body: JSON.stringify(body) });
export const exportAccount = () => request("/account/export");
export const deleteAccount = () =>
  request("/account/delete", { method: "POST", body: JSON.stringify({ confirmation: "DELETE" }) });
export const getReports = (status = "pending", cursor) => {
  const params = new URLSearchParams({ status });
  if (cursor) params.set("cursor", cursor);
  return request(`/moderation/reports?${params}`);
};
export const getAuditHistory = (resource, id, cursor, options) => {
  const path = resource === "all" ? "/moderation/history" : `/moderation/${resource}/${encodeURIComponent(id)}/history`;
  return request(`${path}${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`, options);
};
export const getModeratedPoll = (id) =>
  request(`/moderation/polls/${encodeURIComponent(id)}`);
export const editModeratedPoll = (id, poll) =>
  command(`/moderation/polls/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(poll),
  }, "poll");
export const updateReport = (id, status, note = "") =>
  command(`/moderation/reports/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ status, note }),
  });
export const addReportNote = (id, note) =>
  command(`/moderation/reports/${encodeURIComponent(id)}/notes`, {
    method: "POST",
    body: JSON.stringify({ note }),
  }, "action");
export const editReportedPoll = (id, poll) =>
  command(`/moderation/reports/${encodeURIComponent(id)}/poll`, {
    method: "PATCH",
    body: JSON.stringify(poll),
  });
export const removeReportedPoll = (id, note = "") =>
  command(`/moderation/reports/${encodeURIComponent(id)}/remove-poll`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
export const suspendReportedOwner = (id, note = "") =>
  command(`/moderation/reports/${encodeURIComponent(id)}/suspend-owner`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
export const getUsers = ({ cursor, query = "", field = "name" } = {}) => {
  const params = new URLSearchParams({ field });
  if (cursor) params.set("cursor", cursor);
  if (query) params.set("q", query);
  return request(`/moderation/users?${params}`);
};
export const updateUserRole = (id, role) =>
  command(`/moderation/users/${encodeURIComponent(id)}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  }, "user");
export const suspendUser = (id, note) =>
  command(`/moderation/users/${encodeURIComponent(id)}/suspend`, {
    method: "POST",
    body: JSON.stringify({ note }),
  }, "user");
export const reactivateUser = (id, note = "") =>
  command(`/moderation/users/${encodeURIComponent(id)}/reactivate`, {
    method: "POST",
    body: JSON.stringify({ note }),
  }, "user");
