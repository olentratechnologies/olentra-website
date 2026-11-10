"use client";
import { useEffect, useRef, useState } from "react";
import { internQueryScope } from "@/lib/intern-query-scope.mjs";
import { useInternship } from "./InternshipProvider";

export function useInternHistory(kind, { applicationId, enabled = true, revision } = {}) {
  const { commands, account } = useInternship();
  const active = enabled && (kind !== "messages" || Boolean(applicationId));
  const scope = JSON.stringify([internQueryScope(account), kind, applicationId || ""]);
  const requestVersion = useRef(0);
  const empty = { items: [], total: 0, page: 0, loading: false, error: "" };
  const [state, setState] = useState({ ...empty, scope: "" });
  const visible = !active ? empty : state.scope === scope ? state : { ...empty, loading: true };
  useEffect(() => {
    const version = ++requestVersion.current;
    if (!active) { setState({ items: [], total: 0, page: 0, loading: false, error: "", scope: "" }); return; }
    let live = true;
    setState(previous => ({ ...(previous.scope === scope ? previous : { items: [], total: 0, page: 0 }), scope, loading: true, error: "" }));
    (async () => {
      const result = kind === "messages" ? await commands.listMessages({ applicationId, page: 1, pageSize: 20 }) : await commands.listNotifications({ page: 1, pageSize: 20 });
      if (!live || requestVersion.current !== version) return;
      setState(previous => result.ok ? { ...result.data, scope, loading: false, error: "" } : { ...previous, loading: false, error: result.error });
    })();
    return () => { live = false; requestVersion.current++; };
  }, [kind, applicationId, active, scope, revision, commands]);
  async function loadMore() {
    if (!active || visible.loading || visible.items.length >= visible.total) return;
    const version = requestVersion.current;
    setState(previous => ({ ...previous, loading: true }));
    const params = { page: visible.page + 1, pageSize: 20 };
    const result = kind === "messages" ? await commands.listMessages({ ...params, applicationId }) : await commands.listNotifications(params);
    if (requestVersion.current !== version) return;
    setState(previous => {
      if (!result.ok) return { ...previous, loading: false, error: result.error };
      const ids = new Set(previous.items.map(item => item.id));
      return { ...result.data, scope, items: [...previous.items, ...result.data.items.filter(item => !ids.has(item.id))], loading: false, error: "" };
    });
  }
  return { ...visible, loadMore, hasMore: visible.items.length < visible.total };
}
