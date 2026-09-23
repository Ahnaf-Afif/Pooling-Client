"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "what-do-you-think:my-polls";
const MAX_SAVED_POLLS = 50;
const CHANGE_EVENT = "my-polls-changed";
const POLL_ID_PATTERN = /^[a-z0-9-]{1,80}$/;

export function readMyPollIds() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter((id) => typeof id === "string" && POLL_ID_PATTERN.test(id)))]
      .slice(0, MAX_SAVED_POLLS);
  } catch {
    return [];
  }
}

export function rememberMyPoll(id) {
  try {
    const ids = [id, ...readMyPollIds().filter((savedId) => savedId !== id)]
      .slice(0, MAX_SAVED_POLLS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return true;
  } catch {
    return false;
  }
}

export function replaceMyPollIds(ids) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(0, MAX_SAVED_POLLS)));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // Ownership labels are an enhancement; browsing and voting still work.
  }
}

export function useMyPollIds() {
  const [ids, setIds] = useState([]);

  useEffect(() => {
    const refresh = () => setIds(readMyPollIds());
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener(CHANGE_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(CHANGE_EVENT, refresh);
    };
  }, []);

  return ids;
}
