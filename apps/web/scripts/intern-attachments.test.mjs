import test from "node:test";
import assert from "node:assert/strict";
import { attachmentName, fetchAttachment } from "../src/lib/intern-attachments.mjs";
import { internAuth } from "../src/lib/intern-client.mjs";

test("attachment names prefer the UTF-8 form and stay plain file names", () => {
  assert.equal(attachmentName(`attachment; filename="R_sum_.pdf"; filename*=UTF-8''R%C3%A9sum%C3%A9.pdf`), "Résumé.pdf");
  assert.equal(attachmentName(`attachment; filename="cv.pdf"`), "cv.pdf");
  assert.equal(attachmentName(`attachment; filename*=UTF-8''..%2F..%2Fsecret.pdf`), "secret.pdf");
  assert.equal(attachmentName(null), "olentra-attachment");
});

test("files are fetched with a header token and retried once after a session refresh", async () => {
  const original = globalThis.fetch;
  const calls = [];
  let issued = 0;
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), headers: { ...(options.headers || {}) } });
    if (String(url).includes("/intern/auth/")) return Response.json({ ok: true, data: { token: `token-${++issued}` } });
    if (options.headers?.Authorization === "Bearer token-1") return Response.json({ ok: false, error: { code: "UNAUTHENTICATED", message: "Session expired." } }, { status: 401 });
    return new Response("%PDF-1.4", { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="cv.pdf"` } });
  };
  try {
    await internAuth("login", { email: "staff@example.test", password: "x" });
    const file = await fetchAttachment("2b1f4c7e-0000-4000-8000-000000000000");
    assert.equal(file.name, "cv.pdf");
    assert.equal(await file.blob.text(), "%PDF-1.4");
    const downloads = calls.filter(call => call.url.includes("/intern/files/"));
    assert.equal(downloads.length, 2);
    assert.deepEqual(downloads.map(call => call.headers.Authorization), ["Bearer token-1", "Bearer token-2"]);
    for (const call of downloads) assert.equal(new URL(call.url).search, "", "no token or personal data in the query string");
  } finally {
    globalThis.fetch = original;
  }
});

test("a refused file surfaces the server's message", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ ok: false, error: { code: "FORBIDDEN", message: "File access denied." } }, { status: 403 });
  try {
    await assert.rejects(fetchAttachment("file"), { message: "File access denied." });
    await assert.rejects(fetchAttachment(""), { message: "This record does not have an attachment." });
  } finally {
    globalThis.fetch = original;
  }
});
