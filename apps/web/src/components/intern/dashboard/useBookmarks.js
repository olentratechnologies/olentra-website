"use client";

import { useCallback, useState } from "react";

const failureMessage = (error, fallback) => (typeof error === "string" ? error : error?.message || fallback);

/**
 * Team bookmarks with an optimistic star: it flips at once, stays flipped
 * while the lists refresh, and snaps back if the server refuses.
 */
export function useBookmarks({ commands, notify, onChanged }) {
  const [pending, setPending] = useState(() => new Map());
  const isBookmarked = useCallback(
    (application) => (pending.has(application.id) ? pending.get(application.id) : Boolean(application.bookmarked)),
    [pending],
  );
  const isBusy = useCallback((application) => pending.has(application.id), [pending]);

  /** Bookmarks or clears `rows`; resolves to the server result, or null when it failed. */
  async function setBookmarked(rows, bookmarked) {
    const ids = rows.map((row) => row.id).filter((id) => !pending.has(id));
    if (!ids.length) return null;
    setPending((current) => {
      const next = new Map(current);
      for (const id of ids) next.set(id, bookmarked);
      return next;
    });
    try {
      const result = await commands.bookmarkApplications(ids, bookmarked);
      if (!result.ok) {
        notify(failureMessage(result.error, bookmarked ? "Couldn't bookmark. Please try again." : "Couldn't remove the bookmark. Please try again."));
        return null;
      }
      await onChanged?.();
      return result.data;
    } finally {
      setPending((current) => {
        const next = new Map(current);
        for (const id of ids) next.delete(id);
        return next;
      });
    }
  }

  return { isBookmarked, isBusy, setBookmarked };
}
