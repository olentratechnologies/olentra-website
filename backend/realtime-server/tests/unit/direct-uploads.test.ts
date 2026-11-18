import { expect, test } from "bun:test";
import { createDirectUploads } from "../../src/modules/files/direct-uploads";
import type { ObjectStore } from "../../src/infrastructure/files/oci.store";

// Model the MongoDB predicates used by the durable queue, including lease fencing.
function matches(row: any, query: any): boolean {
  return Object.entries(query).every(([key, value]: [string, any]) => {
    if (key === "$or") return value.some((part: any) => matches(row, part));
    const actual = row[key];
    if (value === null) return actual == null;
    if (typeof value !== "object" || value instanceof Date) return actual?.valueOf() === value?.valueOf();
    return Object.entries(value).every(([op, expected]: [string, any]) => op === "$in" ? expected.includes(actual) : op === "$ne" ? actual !== expected : op === "$exists" ? (actual !== undefined) === expected : op === "$lt" ? actual < expected : op === "$lte" ? actual <= expected : false);
  });
}
function fixture() {
  let clock = 1_800_000_000_000;
  const rows: any[] = [], calls: string[] = [], events: any[] = [], clean = new Map<string, Uint8Array>();
  let bytes = new TextEncoder().encode("%PDF-1.7 safe"), infected = false, unavailable = false;
  const update = (row: any, change: any) => {
    Object.assign(row, change.$set);
    for (const key in change.$unset) delete row[key];
    for (const key in change.$inc) row[key] = (row[key] || 0) + change.$inc[key];
    for (const key in change.$push) (row[key] ||= []).push(change.$push[key]);
  };
  const files: any = {
    createIndex: async () => {}, insertOne: async (row: any) => { rows.push(structuredClone(row)); },
    findOne: async (query: any) => structuredClone(rows.find(row => matches(row, query)) || null),
    find: (query: any) => ({ toArray: async () => structuredClone(rows.filter(row => matches(row, query))) }),
    updateOne: async (query: any, change: any) => { const row = rows.find(row => matches(row, query)); if (row) update(row, change); return { matchedCount: row ? 1 : 0 }; },
    deleteOne: async (query: any) => { const index = rows.findIndex(row => matches(row, query)); if (index >= 0) rows.splice(index, 1); return { deletedCount: index >= 0 ? 1 : 0 }; },
    findOneAndUpdate: async (query: any, change: any) => { const row = rows.find(row => matches(row, query)); if (!row) return null; update(row, change); return structuredClone(row); },
  };
  const store: ObjectStore = {
    issue: async () => ({ id: "par", url: "https://storage.example/upload" }),
    revoke: async () => { calls.push("revoke"); },
    read: async (_key, max) => { calls.push("read"); if (bytes.length > max) throw new Error("FILE_SIZE"); return bytes.slice(); },
    promote: async (key, bytes) => { calls.push("promote"); clean.set(key, bytes.slice()); },
    remove: async (key, ready) => { calls.push(`delete:${ready ? "clean" : "quarantine"}`); if (ready) clean.delete(key); },
    download: async () => new ReadableStream(),
  };
  const api = createDirectUploads({ files, store, scan: async () => { calls.push("scan"); if (unavailable) throw new Error("Scanner offline"); return !infected; }, now: () => clock, notify: (id, status) => { events.push({ id, status }); } });
  const begin = (ownerApplicationId?: string) => api.begin({ name: "resume.pdf", kind: "resume", type: "application/pdf", size: bytes.length, ...(ownerApplicationId ? { ownerApplicationId } : {}) });
  return { api, begin, rows, calls, clean, events, files, store, advance: (ms: number) => { clock += ms; }, infect: () => { infected = true; }, offline: () => { unavailable = true; }, bytes: (value: string) => { bytes = new TextEncoder().encode(value); } };
}

test("upload capabilities and owner isolation; no URL or raw token persisted", async () => {
  const f = fixture(), intent = await f.begin("app-a");
  await expect(f.api.status(intent.id, "wrong", "app-b")).rejects.toMatchObject({ code: "FORBIDDEN" });
  expect((await f.api.status(intent.id, "", "app-a")).status).toBe("uploading");
  expect((await f.api.status(intent.id, intent.accessToken)).id).toBe(intent.id);
  expect(JSON.stringify(f.rows)).not.toContain(intent.accessToken);
  expect(JSON.stringify(f.rows)).not.toContain(intent.uploadUrl);
});

test("duplicates scan once; revoke precedes scan and only scanned bytes become ready", async () => {
  const f = fixture(), intent = await f.begin();
  await f.api.complete(intent.id, intent.accessToken); await f.api.complete(intent.id, intent.accessToken);
  await Promise.all([f.api.process(), f.api.process()]);
  expect(f.calls).toEqual(["revoke", "read", "scan", "promote"]);
  expect(f.rows[0].status).toBe("ready");
  expect(new TextDecoder().decode(f.clean.get(f.rows[0].cleanKey))).toBe("%PDF-1.7 safe");
  expect(f.events).toEqual([{ id: intent.id, status: "ready" }]);
});

test("missing browser completion is recovered after intent expiry", async () => {
  const f = fixture(); await f.begin(); await f.api.process(); expect(f.calls).toHaveLength(0);
  f.advance(330_001); await f.api.process(); expect(f.rows[0].status).toBe("ready");
});

test("malware, signature mismatch, and size mismatch never publish", async () => {
  for (const mode of ["malware", "signature", "size"]) {
    const f = fixture(), intent = await f.begin();
    if (mode === "malware") f.infect();
    if (mode === "signature") f.bytes("<html>unsafe");
    if (mode === "size") f.bytes("%PDF-short");
    await f.api.complete(intent.id, intent.accessToken); await f.api.process();
    expect(f.rows[0].status).toBe("rejected"); expect(f.clean.size).toBe(0); expect(f.calls).not.toContain("promote");
  }
});

test("scanner outages retry with backoff and eventually reject", async () => {
  const f = fixture(), intent = await f.begin(); f.offline();
  await f.api.complete(intent.id, intent.accessToken);
  for (let attempt = 1; attempt <= 6; attempt++) { await f.api.process(); expect(f.rows[0].attempts).toBe(attempt); f.advance(300_001); }
  expect(f.rows[0].status).toBe("rejected"); expect(f.clean.size).toBe(0);
});

test("an expired worker cannot publish after applicant deletion", async () => {
  const f = fixture(), intent = await f.begin(); await f.api.complete(intent.id, intent.accessToken);
  f.store.promote = async (key, bytes) => { f.clean.set(key, bytes); f.rows[0].status = "deleting"; };
  await f.api.process(); expect(f.rows[0].status).toBe("deleting"); expect(f.clean.size).toBe(0); expect(f.events).toHaveLength(0);
});

test("rejected quarantine and erased clean bytes are retried and reclaimed", async () => {
  const f = fixture(), intent = await f.begin(); await f.api.complete(intent.id, intent.accessToken); await f.api.process();
  f.rows[0].status = "deleting"; f.advance(1_000_001); await f.api.cleanup();
  expect(f.clean.size).toBe(0); expect(f.rows).toHaveLength(0);
});
