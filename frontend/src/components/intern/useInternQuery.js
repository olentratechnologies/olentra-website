"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { internQueryKey } from "@/lib/intern-query-cache.mjs";
import { useInternship } from "./InternshipProvider";

const disabledSnapshot = Object.freeze({ data: undefined, error: "", loading: false, loaded: false });

export function useInternQuery(method, params = {}, { initialData, enabled = true } = {}) {
  const { queryCache } = useInternship();
  const key = internQueryKey(method, params);
  const paramsRef = useRef(params);
  paramsRef.current = params;
  const subscribe = useCallback(listener => enabled ? queryCache.subscribe(key, listener) : () => {}, [queryCache, key, enabled]);
  const getSnapshot = useCallback(() => enabled ? queryCache.get(key) : disabledSnapshot, [queryCache, key, enabled]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // Mount the screen first. Exact-query cached results remain visible while
  // this request refreshes them, and concurrent readers share the request.
  useEffect(() => {
    if (enabled) void queryCache.fetch(method, paramsRef.current, { force: true });
  }, [queryCache, key, method, enabled]);

  const refresh = useCallback(() => enabled ? queryCache.fetch(method, paramsRef.current, { force: true }) : Promise.resolve({ ok: false, error: "This view is unavailable." }), [queryCache, method, enabled]);
  return {
    data: snapshot.data === undefined ? initialData : snapshot.data,
    loading: enabled && snapshot.data === undefined && !snapshot.error,
    refreshing: enabled && snapshot.data !== undefined && snapshot.loading,
    error: snapshot.error,
    refresh,
  };
}

export function useInternSearch(value, delay = 180) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
