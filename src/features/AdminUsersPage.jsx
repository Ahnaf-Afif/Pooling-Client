"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import AuthRequired from "@/components/AuthRequired";
import StatusPanel from "@/components/StatusPanel";
import { getUsers, reactivateUser, suspendUser, updateUserRole } from "@/lib/api";

const ROLES = ["user", "moderator", "admin"];
const dateFormatter = new Intl.DateTimeFormat("en-BD", { dateStyle: "medium", timeStyle: "short" });
const actionLabels = {
  owner_suspended: "Suspended after a poll report",
  user_suspended: "Suspended this account",
  user_reactivated: "Reactivated this account",
  role_changed: "Changed this account's role",
};

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [selfId, setSelfId] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [field, setField] = useState("name");
  const [search, setSearch] = useState({ query: "", field: "name" });
  const [reasons, setReasons] = useState({});
  const [status, setStatus] = useState("loading");
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    getUsers({ page, query: search.query, field: search.field })
      .then((data) => {
        if (!active) return;
        setUsers(data.users);
        setSelfId(data.selfId);
        setPages(data.pages);
        setTotal(data.total);
        setStatus("ready");
      })
      .catch((requestError) => {
        if (!active) return;
        setError(requestError.message);
        setStatus(requestError.status === 403 ? "forbidden" : "error");
      });
    return () => { active = false; };
  }, [page, reloadKey, search]);

  function reload() {
    setStatus("loading");
    setReloadKey((value) => value + 1);
  }

  function submitSearch(event) {
    event.preventDefault();
    setError("");
    setPage(1);
    setStatus("loading");
    setSearch({ query: query.trim(), field });
  }

  async function changeRole(user, role) {
    if (role === user.role) return;
    if (!window.confirm(`Change ${user.name}'s role from ${user.role} to ${role}?`)) return;
    setBusyId(`${user.id}:role`);
    setError("");
    try {
      await updateUserRole(user.id, role);
      reload();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyId("");
    }
  }

  async function changeSuspension(user) {
    const note = (reasons[user.id] || "").trim();
    if (!user.banned && note.length < 3) {
      setError("Add a suspension reason with at least 3 characters.");
      return;
    }
    const action = user.banned ? "reactivate" : "suspend";
    if (!window.confirm(`${action === "suspend" ? "Suspend" : "Reactivate"} ${user.name}'s account?`)) return;
    setBusyId(`${user.id}:${action}`);
    setError("");
    try {
      if (user.banned) await reactivateUser(user.id, note);
      else await suspendUser(user.id, note);
      setReasons((current) => ({ ...current, [user.id]: "" }));
      reload();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyId("");
    }
  }

  if (status === "forbidden") {
    return <main className="mx-auto min-h-[65vh] max-w-2xl px-6 py-20"><StatusPanel title="Administrator access required" message="Only administrators can manage users and roles." action={<Link href="/" className="text-sm font-semibold text-[#1B4332]">← Return home</Link>} /></main>;
  }

  return (
    <main className="mx-auto min-h-[65vh] max-w-5xl px-6 py-14">
      <div className="flex flex-col justify-between gap-5 border-b border-[#E5E7EB] pb-8 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#C9971A]">Administration</p>
          <h1 className="font-display mt-2 text-4xl font-semibold">User management</h1>
          <p className="mt-3 text-sm text-[#6B7280]">Manage persistent roles, suspensions, and account recovery.</p>
        </div>
        <Link href="/moderation" className="w-fit rounded-full border border-[#1B4332] px-4 py-2 text-xs font-semibold text-[#1B4332]">Report queue</Link>
      </div>

      <form onSubmit={submitSearch} className="mt-7 flex flex-col gap-3 rounded-2xl bg-[#F9FAFB] p-4 sm:flex-row">
        <select value={field} onChange={(event) => setField(event.target.value)} aria-label="Search field" className="rounded-xl border border-[#D1D5DB] bg-white px-3 py-2.5 text-sm">
          <option value="name">Name</option>
          <option value="email">Email</option>
        </select>
        <input value={query} onChange={(event) => setQuery(event.target.value)} maxLength={160} placeholder={`Search by ${field}`} className="min-w-0 flex-1 rounded-xl border border-[#D1D5DB] bg-white px-4 py-2.5 text-sm" />
        <button type="submit" className="rounded-xl bg-[#1B4332] px-5 py-2.5 text-sm font-semibold text-white">Search</button>
        {search.query && <button type="button" onClick={() => { setQuery(""); setPage(1); setStatus("loading"); setSearch({ query: "", field }); }} className="px-3 py-2 text-sm font-semibold text-[#6B7280]">Clear</button>}
      </form>

      {error && <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {status === "ready" && <p className="mt-6 text-sm text-[#6B7280]">{total.toLocaleString("en-BD")} account{total === 1 ? "" : "s"}</p>}

      <section className="mt-4 space-y-4" aria-label="User accounts">
        {status === "loading" && Array.from({ length: 4 }, (_, index) => <div key={index} className="h-64 animate-pulse rounded-2xl bg-[#F3F4F6]" />)}
        {status === "error" && <StatusPanel title="Users unavailable" message="The account list could not be loaded." action={<button type="button" onClick={reload} className="rounded-full bg-[#1B4332] px-5 py-2.5 text-sm font-semibold text-white">Try again</button>} />}
        {status === "ready" && users.length === 0 && <StatusPanel title="No accounts found" message="Try a different search." />}
        {status === "ready" && users.map((user) => {
          const isSelf = user.id === selfId;
          return (
            <article key={user.id} className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate font-semibold text-[#111827]">{user.name}</h2>
                    {isSelf && <span className="rounded-full bg-[#F0F7F4] px-2 py-0.5 text-[11px] font-semibold text-[#1B4332]">You</span>}
                    {user.banned && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">Suspended</span>}
                  </div>
                  <p className="mt-1 truncate text-sm text-[#6B7280]">{user.email}</p>
                  <p className="mt-1 text-xs text-[#9CA3AF]">Joined {dateFormatter.format(new Date(user.createdAt))} · {user.emailVerified ? "Verified email" : "Unverified email"}</p>
                </div>
                <div>
                  <label htmlFor={`role-${user.id}`} className="mr-2 text-xs font-semibold text-[#6B7280]">Role</label>
                  <select id={`role-${user.id}`} value={user.role} onChange={(event) => changeRole(user, event.target.value)} disabled={isSelf || Boolean(busyId)} className="rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm capitalize disabled:bg-[#F3F4F6] disabled:text-[#9CA3AF]">
                    {ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
                  </select>
                </div>
              </div>

              {user.banned && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800"><span className="font-semibold">Suspension reason:</span> {user.banReason || "No reason recorded"}</p>}

              {!isSelf && (
                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <label htmlFor={`reason-${user.id}`} className="mb-1.5 block text-xs font-semibold text-[#374151]">{user.banned ? "Reactivation note (optional)" : "Suspension reason"}</label>
                    <input id={`reason-${user.id}`} value={reasons[user.id] || ""} onChange={(event) => setReasons((current) => ({ ...current, [user.id]: event.target.value }))} maxLength={200} placeholder={user.banned ? "Why is this account being restored?" : "Required and recorded in the audit history"} className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2 text-sm" />
                  </div>
                  <button type="button" onClick={() => changeSuspension(user)} disabled={Boolean(busyId)} className={`rounded-full px-4 py-2 text-xs font-semibold disabled:opacity-50 ${user.banned ? "bg-[#1B4332] text-white" : "border border-red-300 text-red-700"}`}>{busyId.startsWith(`${user.id}:`) ? "Saving…" : user.banned ? "Reactivate account" : "Suspend account"}</button>
                </div>
              )}

              {user.history.length > 0 && (
                <details className="mt-5 rounded-xl bg-[#F9FAFB] px-4 py-3">
                  <summary className="cursor-pointer text-xs font-semibold text-[#374151]">Recent admin history ({user.history.length})</summary>
                  <ol className="mt-3 space-y-3 border-l border-[#D1D5DB] pl-4">
                    {user.history.map((entry) => <li key={entry.id} className="text-xs leading-5 text-[#6B7280]"><span className="font-semibold text-[#374151]">{entry.actorName}</span> · {actionLabels[entry.action] || entry.action.replaceAll("_", " ")}<br /><time>{dateFormatter.format(new Date(entry.createdAt))}</time>{entry.previousRole && ` · ${entry.previousRole} → ${entry.newRole}`}{entry.note && entry.action !== "role_changed" && <p className="mt-1 text-[#4B5563]">“{entry.note}”</p>}</li>)}
                  </ol>
                </details>
              )}
            </article>
          );
        })}
      </section>

      {status === "ready" && pages > 1 && (
        <nav aria-label="User pages" className="mt-8 flex items-center justify-center gap-4">
          <button type="button" onClick={() => { setStatus("loading"); setPage((value) => value - 1); }} disabled={page === 1} className="rounded-full border border-[#D1D5DB] px-4 py-2 text-sm font-semibold disabled:opacity-40">Previous</button>
          <span className="text-sm text-[#6B7280]">Page {page} of {pages}</span>
          <button type="button" onClick={() => { setStatus("loading"); setPage((value) => value + 1); }} disabled={page === pages} className="rounded-full border border-[#D1D5DB] px-4 py-2 text-sm font-semibold disabled:opacity-40">Next</button>
        </nav>
      )}
    </main>
  );
}

export default function AdminUsersPage() {
  return <AuthRequired message="Sign in with an administrator account to manage users."><AdminUsers /></AuthRequired>;
}
