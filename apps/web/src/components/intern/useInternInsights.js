"use client";

import { useEffect, useState } from "react";
import { useInternship } from "./InternshipProvider";

/**
 * Live public internship insights. Subscribes over the shared internship
 * WebSocket whenever it is connected (so reconnects re-subscribe), and merges
 * server pushes: full `intern.insights` payloads and lightweight viewer counts.
 */
export default function useInternInsights() {
  const { connected, insightsChannel } = useInternship();
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!connected || !insightsChannel) return undefined;
    let active = true;
    const stop = insightsChannel.listen((message) => {
      if (!active) return;
      if (message.event === "intern.insights" && message.data) setInsights(message.data);
      else if (message.event === "intern.insights.viewers" && Number.isFinite(message.viewers))
        setInsights((current) => (current ? { ...current, viewers: message.viewers } : current));
    });
    insightsChannel
      .subscribe()
      .then((data) => { if (active && data) { setInsights(data); setError(false); } })
      .catch(() => { if (active) setError(true); });
    return () => {
      active = false;
      stop();
      insightsChannel.unsubscribe();
    };
  }, [connected, insightsChannel]);

  return { insights, live: connected && Boolean(insights), error };
}
