"use client";
import { effectiveSiteFeatures } from "./rules.mjs";
const listeners = new Set();
// Switches change rarely, so visible tabs re-check once a minute and whenever they
// regain focus. A held-open stream per visitor kept a server function running for
// as long as any tab stayed open, which used up the hosting plan's memory.
const REFRESH_MS = 60_000;
let snapshot = null, consumers = 0, timer = null;
const emit = () => listeners.forEach(fn => fn());
export const subscribeSiteFeatures = listener => { listeners.add(listener); return () => listeners.delete(listener); };
export const getSiteFeatureSnapshot = () => snapshot;
export function acceptSiteFeatureState(next) {
  if (!next?.environments?.Production || !Number.isInteger(next.revision)) return;
  if (snapshot && next.revision < snapshot.revision) return;
  if (snapshot && next.revision === snapshot.revision) return;
  snapshot = { ...next, features: effectiveSiteFeatures(next.environments.Production) }; emit();
}
export async function refreshSiteFeatures() {
  const response = await fetch("/api/site-features", { cache: "no-store" });
  const result = await response.json(); if (!response.ok) throw new Error(result.error || "Could not load website settings.");
  acceptSiteFeatureState(result); return result;
}
export function connectSiteFeatures(initial) {
  acceptSiteFeatureState(initial); consumers += 1;
  if (consumers === 1) {
    refreshSiteFeatures().catch(() => {});
    timer = setInterval(() => { if (document.visibilityState === "visible") handleFocus(); }, REFRESH_MS);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisible);
  }
  return () => { consumers -= 1; if (!consumers) { clearInterval(timer); timer = null; window.removeEventListener("focus", handleFocus); document.removeEventListener("visibilitychange", handleVisible); } };
}
function handleFocus() { refreshSiteFeatures().catch(() => {}); }
function handleVisible() { if (document.visibilityState === "visible") handleFocus(); }
/** Changes one switch. The company workspace passes its staff access token, which the server verifies. */
export async function updateSiteFeature(environment, feature, enabled, accessToken) {
  const response = await fetch("/api/site-features", { method: "PUT", headers: { "Content-Type": "application/json", ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) }, body: JSON.stringify({ environment, feature, enabled }) });
  let value = {};
  try { value = await response.json(); } catch {}
  if (response.ok) acceptSiteFeatureState(value);
  return response.ok ? { ok: true, value, status: response.status } : { ok: false, error: value.error || "Could not change website visibility.", status: response.status };
}
