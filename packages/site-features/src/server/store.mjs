import { mkdir, readFile, writeFile, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import seed from "../seed.json" with { type: "json" };
import { ENVIRONMENTS, FEATURE_IDS, effectiveSiteFeatures } from "../rules.mjs";

const hubKey = Symbol.for("olentra.site-features.events");
const hub = globalThis[hubKey] ||= new EventEmitter().setMaxListeners(0);
const clone = value => structuredClone(value);
const storePath = () => process.env.OLENTRA_FEATURE_STORE_PATH || path.join(process.cwd(), ".data", "site-features.json");

// The website and the admin app run as separate processes sharing this file,
// so the cache is keyed by the file's mtime and size: another process's write
// is picked up on the next read instead of being hidden by a stale cache.
let cachedFeatures = null, cachedVersion = null;
hub.on("change", () => { cachedFeatures = null; cachedVersion = null; });

export function validateSiteFeatureState(value) {
  if (!value || value.schemaVersion !== 1 || !Number.isInteger(value.revision) || value.revision < 0) throw new Error("Invalid website feature data.");
  for (const env of ENVIRONMENTS) {
    const flags = value.environments?.[env];
    if (!flags || Object.keys(flags).length !== FEATURE_IDS.length || FEATURE_IDS.some(id => typeof flags[id] !== "boolean")) throw new Error("Invalid feature switches in " + env + ".");
  }
  return value;
}

/*
 * Where the switches live. The website and the company workspace are separate
 * deployments on a read-only filesystem, so in production they share the
 * realtime server (MongoDB). A local file is used only when
 * OLENTRA_FEATURE_STORE_PATH is set or no backend URL is configured
 * (tests and offline development).
 */
const backendUrl = () => (process.env.INTERNSHIP_BACKEND_URL || process.env.NEXT_PUBLIC_INTERNSHIP_BACKEND_URL || "").replace(/\/$/, "");
const useFile = () => Boolean(process.env.OLENTRA_FEATURE_STORE_PATH) || !backendUrl();
const REMOTE_TTL_MS = 3000;
let remoteCache = null, remoteFetchedAt = 0, lastGoodRemote = null;

async function fetchRemote() {
  const response = await fetch(backendUrl() + "/intern/site-features", { cache: "no-store", signal: AbortSignal.timeout(4000) });
  if (!response.ok) throw new Error("Website settings service responded " + response.status);
  const body = await response.json();
  return body?.data ? validateSiteFeatureState(body.data) : clone(seed);
}

/** Reads the switches. Remote reads are cached briefly; if the service is down, the last known (or default) switches are used so the website stays up. */
async function readRemote({ fresh = false } = {}) {
  if (!fresh && remoteCache && Date.now() - remoteFetchedAt < REMOTE_TTL_MS) return clone(remoteCache);
  try {
    const state = await fetchRemote();
    remoteCache = state; remoteFetchedAt = Date.now(); lastGoodRemote = state;
    return clone(state);
  } catch (error) {
    if (fresh) throw error;
    return clone(lastGoodRemote || seed);
  }
}

export async function readSiteFeatures() {
  if (!useFile()) return readRemote();
  try {
    const file = storePath(), info = await stat(file), version = info.mtimeMs + ":" + info.size;
    if (cachedFeatures && cachedVersion === version) return clone(cachedFeatures);
    const data = validateSiteFeatureState(JSON.parse(await readFile(file, "utf8")));
    cachedFeatures = data; cachedVersion = version;
    return clone(data);
  }
  catch (error) { if (error.code === "ENOENT") { cachedFeatures = null; cachedVersion = null; return clone(seed); } throw error; }
}

export function publicSiteFeatureState(state) {
  return { ...state, features: effectiveSiteFeatures(state.environments.Production) };
}

export function watchSiteFeatures(listener) { hub.on("change", listener); return () => hub.off("change", listener); }

export async function setSiteFeature({ environment = "Production", feature, enabled, actor = "Administrator", token = "" }) {
  if (!ENVIRONMENTS.includes(environment) || !FEATURE_IDS.includes(feature) || typeof enabled !== "boolean") throw new Error("Choose a valid feature, environment and boolean value.");
  if (!useFile()) return setRemote({ environment, feature, enabled, actor, token });
  const file = storePath(), lock = file + ".lock";
  await mkdir(path.dirname(file), { recursive: true });
  let locked = false;
  for (let attempt = 0; attempt < 150; attempt++) {
    try { await mkdir(lock); locked = true; break; }
    catch (error) {
      if (error.code !== "EEXIST") throw error;
      try { if (Date.now() - (await stat(lock)).mtimeMs > 30000) await rm(lock, { recursive: true, force: true }); } catch {}
      await new Promise(resolve => setTimeout(resolve, 20));
    }
  }
  if (!locked) throw new Error("Another update is in progress. Please try again.");
  const temp = file + "." + randomUUID() + ".tmp";
  try {
    const state = await readSiteFeatures();
    if (state.environments[environment][feature] === enabled) return publicSiteFeatureState(state);
    state.environments[environment][feature] = enabled;
    state.revision += 1; state.updatedAt = new Date().toISOString();
    state.lastChange = { environment, feature, enabled, actor, at: state.updatedAt };
    await writeFile(temp, JSON.stringify(state, null, 2) + "\n", { mode: 0o600 });
    await rename(temp, file);
    const result = publicSiteFeatureState(state); hub.emit("change", result); return result;
  } finally { await rm(temp, { force: true }); await rm(lock, { recursive: true, force: true }); }
}

/** Saves through the realtime server with the signed-in staff member's token; retries once if another save landed first. */
async function setRemote({ environment, feature, enabled, actor, token }) {
  for (let attempt = 0; attempt < 3; attempt++) {
    let state;
    try { state = await readRemote({ fresh: true }); }
    catch { throw new Error("Website settings are temporarily unavailable. Try again shortly."); }
    if (state.environments[environment][feature] === enabled) return publicSiteFeatureState(state);
    const expectedRevision = state.revision;
    state.environments[environment][feature] = enabled;
    state.revision += 1; state.updatedAt = new Date().toISOString();
    state.lastChange = { environment, feature, enabled, actor, at: state.updatedAt };
    let response;
    try {
      response = await fetch(backendUrl() + "/intern/site-features", { method: "PUT", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify({ state, expectedRevision }), cache: "no-store", signal: AbortSignal.timeout(8000) });
    } catch { throw new Error("Website settings are temporarily unavailable. Try again shortly."); }
    if (response.status === 409) continue;
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(body?.error?.message || "The website settings couldn't be saved.");
    remoteCache = state; remoteFetchedAt = Date.now(); lastGoodRemote = state;
    const result = publicSiteFeatureState(state); hub.emit("change", result); return result;
  }
  throw new Error("Someone else just changed the website settings. Try again.");
}
