import { randomUUID } from "node:crypto";
import { createOciStore } from "../src/infrastructure/files/oci.store";

// Creates only uniquely named synthetic objects and removes them.
const store = await createOciStore();
const id = randomUUID(), key = `smoke/${id}`, cleanKey = `smoke-clean/${id}`;
let par: { id: string; url: string } | undefined;
let revoked = false;
try {
  par = await store.issue(key, new Date(Date.now() + 60_000));
  const preflight = await fetch(par.url, { method: "OPTIONS", headers: { Origin: "https://olentratechnologies.com", "Access-Control-Request-Method": "PUT", "Access-Control-Request-Headers": "content-type" } });
  if (!preflight.ok || !preflight.headers.get("access-control-allow-origin")) throw new Error("Browser upload CORS preflight failed");
  const bytes = new TextEncoder().encode("%PDF-1.7 synthetic Olentra storage transport test\n%%EOF");
  const put = await fetch(par.url, { method: "PUT", headers: { "Content-Type": "application/pdf" }, body: bytes });
  if (!put.ok) throw new Error(`Direct PUT failed: ${put.status}`);
  await store.revoke(par.id); revoked = true;
  const denied = await fetch(par.url, { method: "PUT", body: bytes });
  if (denied.ok) throw new Error("Revoked PAR still permits writes");
  const downloaded = await store.read(key, 1024);
  if (Buffer.compare(Buffer.from(bytes), Buffer.from(downloaded))) throw new Error("Byte mismatch");
  // Transport check only; synthetic bytes do not assert malware scanning.
  await store.promote(cleanKey, downloaded, "application/pdf");
  const response = await new Response(await store.download(cleanKey)).arrayBuffer();
  if (Buffer.compare(Buffer.from(bytes), Buffer.from(response))) throw new Error("Clean download mismatch");
  console.log("PASS: private buckets, browser CORS, direct PUT, PAR revocation, bounded read, clean write and download");
} finally {
  if (par && !revoked) await store.revoke(par.id);
  await store.remove(key); await store.remove(cleanKey, true);
}
