import test from "node:test";
import assert from "node:assert/strict";
import { transferDirectUpload } from "../src/lib/direct-upload.mjs";

const intent = { id: "file-a", accessToken: "private-capability", uploadUrl: "https://storage.example/upload" };
function setup(statuses, { lostCompletion = false, failedPut = false } = {}) {
  const calls = []; let closed = false, unsubscribed = false, time = 0;
  const client = { addFileListener: () => () => { unsubscribed = true; }, request: async () => { throw new Error("socket disconnected"); }, close: () => { closed = true; } };
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    if (url === intent.uploadUrl) return { ok: !failedPut };
    if (url.endsWith("/complete")) { if (lostCompletion) throw new Error("offline"); return { status: "pending" }; }
    const value = statuses.length > 1 ? statuses.shift() : statuses[0];
    if (value instanceof Error) throw value;
    return value;
  };
  const run = () => transferDirectUpload({ file: new Blob(["test"]), intent, endpoint: "https://api.example", headers: { Authorization: "Bearer app-token" }, client, readResult: async value => value, fetcher, wait: async ms => { time += ms; }, now: () => time });
  return { calls, run, finished: () => closed && unsubscribed };
}
test("direct PUT omits application credentials and status polling survives lost completion/socket", async () => {
  const f = setup([{ status: "pending" }, { id: intent.id, name: "cv.pdf", type: "application/pdf", size: 4, status: "ready" }], { lostCompletion: true });
  assert.deepEqual(await f.run(), { id: intent.id, name: "cv.pdf", type: "application/pdf", size: 4, accessToken: intent.accessToken });
  assert.equal(f.calls[0].options.credentials, "omit");
  assert.equal(f.calls[0].options.headers.Authorization, undefined);
  assert.equal(f.calls[0].options.headers["X-File-Token"], undefined);
  assert.equal(f.calls[2].options.headers["X-File-Token"], intent.accessToken);
  assert.ok(f.finished());
});
test("a security rejection never returns an attachable file", async () => {
  const f = setup([{ status: "rejected" }]); await assert.rejects(f.run, /security checks/); assert.ok(f.finished());
});
test("failed direct PUT stops before completion and closes subscription", async () => {
  const f = setup([], { failedPut: true }); await assert.rejects(f.run, /transfer failed/); assert.equal(f.calls.length, 1); assert.ok(f.finished());
});
test("temporary status network errors recover", async () => {
  const f = setup([new Error("offline"), { id: intent.id, status: "ready" }]); assert.equal((await f.run()).id, intent.id);
});
test("processing timeout is bounded and preserves upload id", async () => {
  const f = setup([{ status: "pending" }]); await assert.rejects(f.run, error => error.uploadId === intent.id); assert.ok(f.finished());
});
