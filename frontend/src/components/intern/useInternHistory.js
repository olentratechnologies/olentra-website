"use client";
import { useEffect, useState } from "react";
import { useInternship } from "./InternshipProvider";

export function useInternHistory(kind, { applicationId, enabled = true, revision } = {}) {
  const { commands } = useInternship();
  const [state, setState] = useState({ items: [], total: 0, page: 0, loading: false, error: "" });
  useEffect(() => {
    if (!enabled || (kind === "messages" && !applicationId)) { setState({ items: [], total: 0, page: 0, loading: false, error: "" }); return; }
    let live = true;
    (async () => {
      const result = kind === "messages" ? await commands.listMessages({ applicationId, page: 1, pageSize: 20 }) : await commands.listNotifications({ page: 1, pageSize: 20 });
      if (!live) return;
      setState(result.ok ? { ...result.data, loading: false, error: "" } : { items: [], total: 0, page: 0, loading: false, error: result.error });
    })();
    return () => { live = false; };
  }, [kind, applicationId, enabled, revision, commands]);
  async function loadMore() {
    if (state.loading || state.items.length >= state.total) return;
    setState(previous => ({ ...previous, loading: true }));
    const params = { page: state.page + 1, pageSize: 20 };
    const result = kind === "messages" ? await commands.listMessages({ ...params, applicationId }) : await commands.listNotifications(params);
    setState(previous => {
      if (!result.ok) return { ...previous, loading: false, error: result.error };
      const ids = new Set(previous.items.map(item => item.id));
      return { ...result.data, items: [...previous.items, ...result.data.items.filter(item => !ids.has(item.id))], loading: false, error: "" };
    });
  }
  return { ...state, loadMore, hasMore: state.items.length < state.total };
}
