"use client";

import { useEffect, useState } from "react";
import { useSession } from "./auth-client";
import { getMyVote } from "./api";

export function useMyVote(id) {
  const { data: session, isPending } = useSession();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState(null);
  const scope = JSON.stringify([id, isPending ? "pending" : session?.user?.id || "guest", attempt]);

  useEffect(() => {
    if (isPending) return;
    const controller = new AbortController();
    // Old browser-wide markers could belong to another account on this device.
    // Remove only this app's legacy vote markers; receipts remain on the server.
    try {
      for (const key of Object.keys(localStorage)) if (key.startsWith("voted:")) localStorage.removeItem(key);
    } catch { /* Storage may be disabled; it is no longer needed for voting. */ }
    getMyVote(id, { signal: controller.signal }).then((data) => {
      if (!controller.signal.aborted) setState({ scope, optionId: data.optionId, error: "" });
    }).catch(() => {
      if (!controller.signal.aborted) setState({ scope, optionId: null, error: "Could not check your vote. Please try again." });
    });
    return () => controller.abort();
  }, [id, scope, isPending]);

  const current = state?.scope === scope ? state : null;
  return {
    scope, optionId: current?.optionId || null, checking: isPending || !current,
    error: current?.error || "", retry: () => setAttempt((value) => value + 1),
  };
}
