/**
 * Caches the "are applications open?" answer so a burst of submissions makes
 * at most one call to the website per `ttlMs`. Concurrent callers share one
 * request. If a refresh fails, the last known answer is used for up to
 * `staleMs`; with no recent answer, applications are treated as closed.
 */
export function createIntakeCheck(fetchOpen: () => Promise<boolean>, { ttlMs = 15_000, staleMs = 5 * 60_000, now = Date.now }: { ttlMs?: number; staleMs?: number; now?: () => number } = {}) {
  let last: { open: boolean; at: number } | null = null;
  let inFlight: Promise<boolean> | null = null;
  return async function intakeOpen(): Promise<boolean> {
    if (last && now() - last.at < ttlMs) return last.open;
    inFlight ||= (async () => {
      try {
        const open = await fetchOpen();
        last = { open, at: now() };
        return open;
      } catch {
        return last && now() - last.at < staleMs ? last.open : false;
      } finally {
        inFlight = null;
      }
    })();
    return inFlight;
  };
}
