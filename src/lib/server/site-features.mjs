import { mkdir, readFile, writeFile, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import seed from "../../data/site-features.json" with { type: "json" };
import { ENVIRONMENTS, FEATURE_IDS, effectiveSiteFeatures } from "../site-feature-rules.mjs";

const hubKey = Symbol.for("olentra.site-features.events");
const hub = globalThis[hubKey] ||= new EventEmitter().setMaxListeners(0);
const clone = value => structuredClone(value);
const storePath = () => process.env.OLENTRA_FEATURE_STORE_PATH || path.join(process.cwd(), ".data", "site-features.json");

export function validateSiteFeatureState(value) {
  if (!value || value.schemaVersion !== 1 || !Number.isInteger(value.revision) || value.revision < 0) throw new Error("Invalid website feature data.");
  for (const env of ENVIRONMENTS) {
    const flags = value.environments?.[env];
    if (!flags || Object.keys(flags).length !== FEATURE_IDS.length || FEATURE_IDS.some(id => typeof flags[id] !== "boolean")) throw new Error("Invalid feature switches in " + env + ".");
  }
  return value;
}

export async function readSiteFeatures() {
  try { return validateSiteFeatureState(JSON.parse(await readFile(storePath(), "utf8"))); }
  catch (error) { if (error.code === "ENOENT") return clone(seed); throw error; }
}

export function publicSiteFeatureState(state) {
  return { ...state, features: effectiveSiteFeatures(state.environments.Production) };
}

export function watchSiteFeatures(listener) { hub.on("change", listener); return () => hub.off("change", listener); }

export async function setSiteFeature({ environment = "Production", feature, enabled, actor = "Administrator" }) {
  if (!ENVIRONMENTS.includes(environment) || !FEATURE_IDS.includes(feature) || typeof enabled !== "boolean") throw new Error("Choose a valid feature, environment and boolean value.");
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
