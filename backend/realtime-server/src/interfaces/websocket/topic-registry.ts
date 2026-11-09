/**
 * Stable topic namespaces for the unified transport. New realtime modules
 * should register under a namespace instead of sharing protocol topics.
 */
export const REALTIME_TOPIC_NAMESPACES = {
  presence: "metrics",
  internship: "intern",
} as const;

export function realtimeTopic(namespace: keyof typeof REALTIME_TOPIC_NAMESPACES, ...segments: string[]) {
  return [REALTIME_TOPIC_NAMESPACES[namespace], ...segments].join(":");
}
