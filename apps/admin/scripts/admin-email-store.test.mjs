import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import * as model from "../src/lib/admin/model.mjs";
import { can } from "../src/lib/admin/selectors.mjs";
import { EMAIL_TEMPLATE_SELECTION_KEY as SELECTIONS, getEmailTemplateVariant } from "../src/lib/admin/email-template-catalog.mjs";

const STORAGE_KEY = "olentra.admin.database.v2";
const parts = ["core", "content", "operations", "governance"].map(name => JSON.parse(readFileSync(new URL(`../src/data/admin/${name}.json`, import.meta.url), "utf8")));
const fresh = () => model.createInitialState(parts);
const json = value => JSON.parse(JSON.stringify(value));
const storeSource = readFileSync(new URL("../src/lib/admin/data-store.js", import.meta.url), "utf8");

// Run the actual browser store against real model functions in an isolated tab.
// Only module bindings are supplied by the harness; persistence code is unchanged.
function tab(storage = new Map(), { failWrites = false } = {}) {
  const listeners = new Map();
  let networkRequests = 0;
  const localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem(key, value) {
      if (failWrites) throw new Error("QuotaExceededError");
      storage.set(key, value);
    },
  };
  const source = storeSource.replace(/^import .*;\s*$/gm, "").replace(/^export /gm, "");
  const api = runInNewContext(`${source}\n({ hydrateDatabase, command, getDatabase, getStatus, exportData, importData, resetData, startDataClock });`, {
    ...model,
    can,
    initialDatabase: fresh(),
    localStorage,
    window: {
      addEventListener: (name, callback) => listeners.set(name, callback),
      removeEventListener: name => listeners.delete(name),
    },
    setInterval: () => 1,
    clearInterval: () => {},
    fetch: () => { networkRequests++; throw new Error("Email template choices must not make network requests"); },
  }, { filename: "data-store.js" });
  return {
    ...api,
    storage,
    sync: value => listeners.get("storage")?.({ key: STORAGE_KEY, newValue: JSON.stringify(value) }),
    networkRequests: () => networkRequests,
  };
}

function legacySnapshot() {
  const state = fresh();
  delete state.datasets[SELECTIONS];
  for (const [key, rows] of Object.entries(state.datasets)) {
    if (key.startsWith("admin-role-permissions-") && Array.isArray(rows)) {
      state.datasets[key] = rows.filter(row => row.name !== "Email Templates");
    }
  }
  state.datasets["olentra-admin-enquiries-v1"][0].customNote = "Preserve my existing enquiry";
  return { meta: state.meta, datasets: state.datasets };
}

test("older browser data migrates, choices persist after reload, and no delivery request occurs", () => {
  const storage = new Map([[STORAGE_KEY, JSON.stringify(legacySnapshot())]]);
  const first = tab(storage);
  first.hydrateDatabase();
  assert.equal(first.getStatus().error, null);
  assert.deepEqual(json(first.getDatabase().datasets[SELECTIONS]), {});
  assert.equal(first.getDatabase().datasets["olentra-admin-enquiries-v1"][0].customNote, "Preserve my existing enquiry");
  assert.equal(first.command("emailTemplate.select", { typeId: "account.registered", variantId: "account.registered.warm" }).persisted, true);

  const reloaded = tab(storage);
  reloaded.hydrateDatabase();
  assert.equal(reloaded.getDatabase().datasets[SELECTIONS]["account.registered"], "account.registered.warm");
  assert.equal(reloaded.getDatabase().datasets["olentra-admin-enquiries-v1"][0].customNote, "Preserve my existing enquiry");
  assert.equal(first.networkRequests() + reloaded.networkRequests(), 0);
});

test("a second tab receives selections and migrates legacy storage events", () => {
  const first = tab();
  const second = tab();
  const stop = second.startDataClock();
  const result = first.command("emailTemplate.select", { typeId: "enquiry.received", variantId: "enquiry.received.minimal" });
  assert.equal(result.ok, true);
  second.sync(JSON.parse(first.storage.get(STORAGE_KEY)));
  assert.equal(second.getDatabase().datasets[SELECTIONS]["enquiry.received"], "enquiry.received.minimal");

  second.sync(legacySnapshot());
  assert.equal(second.getStatus().error, null);
  assert.equal(second.getDatabase().datasets["olentra-admin-enquiries-v1"][0].customNote, "Preserve my existing enquiry");
  assert.equal(getEmailTemplateVariant("account.registered", second.getDatabase().datasets[SELECTIONS]["account.registered"]).presetId, "professional");
  stop();
});

test("invalid cross-tab selections are rejected without losing the current workspace", () => {
  const current = tab();
  const stop = current.startDataClock();
  assert.equal(current.command("emailTemplate.select", { typeId: "enquiry.received", variantId: "enquiry.received.warm" }).ok, true);
  const before = json(current.getDatabase());
  const invalid = json(current.exportData());
  invalid.datasets[SELECTIONS]["enquiry.received"] = "account.registered.warm";
  current.sync(invalid);
  assert.deepEqual(json(current.getDatabase()), before);
  assert.match(current.getStatus().error, /invalid dashboard data/i);
  stop();
});

test("JSON export/import preserves choices; legacy imports migrate and reset restores defaults", () => {
  const current = tab();
  assert.equal(current.command("emailTemplate.select", { typeId: "enquiry.received", variantId: "enquiry.received.minimal" }).ok, true);
  const exported = json(current.exportData());
  assert.equal(current.resetData().ok, true);
  assert.deepEqual(json(current.getDatabase().datasets[SELECTIONS]), {});
  assert.equal(current.importData(exported).ok, true);
  assert.equal(current.getDatabase().datasets[SELECTIONS]["enquiry.received"], "enquiry.received.minimal");
  assert.equal(current.importData(legacySnapshot()).ok, true);
  assert.deepEqual(json(current.getDatabase().datasets[SELECTIONS]), {});
  assert.equal(current.getDatabase().datasets["olentra-admin-enquiries-v1"][0].customNote, "Preserve my existing enquiry");
  assert.equal(current.networkRequests(), 0);
});

test("a malformed import leaves the current selections and stored bytes untouched", () => {
  const current = tab();
  current.command("emailTemplate.select", { typeId: "enquiry.received", variantId: "enquiry.received.warm" });
  const before = current.storage.get(STORAGE_KEY);
  const invalid = json(current.exportData());
  invalid.datasets[SELECTIONS] = null;
  assert.equal(current.importData(invalid).ok, false);
  assert.equal(current.storage.get(STORAGE_KEY), before);
  assert.equal(current.getDatabase().datasets[SELECTIONS]["enquiry.received"], "enquiry.received.warm");
});

test("storage failure reports an unsaved choice while preserving exportable in-memory state", () => {
  const current = tab(new Map(), { failWrites: true });
  const result = current.command("emailTemplate.select", { typeId: "enquiry.received", variantId: "enquiry.received.warm" });
  assert.equal(result.ok, true);
  assert.equal(result.persisted, false);
  assert.match(current.getStatus().error, /unavailable or full/i);
  assert.equal(current.exportData().datasets[SELECTIONS]["enquiry.received"], "enquiry.received.warm");
  assert.equal(current.storage.has(STORAGE_KEY), false);
});
