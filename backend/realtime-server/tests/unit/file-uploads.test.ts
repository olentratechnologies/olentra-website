import { expect, test } from "bun:test";
import { Writable } from "node:stream";
import { allowedType, matchesSignature } from "../../src/modules/files/file-types";
import { createFilesRoutes } from "../../src/interfaces/http/files.routes";
import { removeOrphanedUploads, ORPHAN_AGE_MS } from "../../src/modules/files/cleanup";

const bytes = (...values: number[]) => Uint8Array.from(values);
const text = (value: string) => new TextEncoder().encode(value);
const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0);

test("each extension accepts only its own file signature", () => {
  expect(matchesSignature("resume.pdf", "resume", text("%PDF-1.7 ..."))).toBe(true);
  expect(matchesSignature("resume.pdf", "resume", PNG)).toBe(false);
  expect(matchesSignature("resume.doc", "resume", bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1))).toBe(true);
  expect(matchesSignature("resume.docx", "resume", bytes(0x50, 0x4b, 0x03, 0x04))).toBe(true);
  expect(matchesSignature("resume.docx", "resume", text("<html>"))).toBe(false);
  expect(matchesSignature("shot.png", "work", PNG)).toBe(true);
  expect(matchesSignature("notes.txt", "work", text("plain notes"))).toBe(true);
  expect(matchesSignature("notes.txt", "work", bytes(0x4d, 0x5a, 0x00, 0x90))).toBe(false); // a binary renamed to .txt
});

test("work uploads use an allowlist; resumes stay PDF or Word", () => {
  for (const name of ["page.html", "page.svg", "run.exe", "script.js", "noextension"]) expect(allowedType(name, "work")).toBeNull();
  expect(allowedType("deck.pptx", "work")?.mime).toContain("presentationml");
  expect(allowedType("photo.png", "resume")).toBeNull();
  expect(allowedType("CV.PDF", "resume")?.mime).toBe("application/pdf");
});

function routes() {
  const stored: any[] = [], deleted: unknown[] = [];
  const bucket = {
    openUploadStreamWithId: () => new Writable({ write(_chunk, _encoding, callback) { callback(); } }),
    delete: async (id: unknown) => { deleted.push(id); },
  };
  const files = { insertOne: async (row: unknown) => { stored.push(row); } };
  const api = createFilesRoutes({
    auth: { verify: async () => { throw new Error("no auth in this test"); } } as any,
    bucket: bucket as any, files: files as any,
    withCors: () => new Headers(), sendJson: (body, _origin, status = 200) => Response.json(body, { status }),
  });
  const upload = (name: string, body: Uint8Array, contentType = "application/pdf") => api.upload(new Request("https://api.example.test/intern/files", {
    method: "POST", body, headers: { "x-file-name": name, "x-file-kind": "resume", "content-type": contentType, "content-length": String(body.length) },
  }), null);
  return { upload, stored, deleted };
}

test("a resume whose bytes don't match its extension is refused with 415 and not kept", async () => {
  const { upload, stored, deleted } = routes();
  await expect(upload("resume.pdf", text("<html><script>alert(1)</script></html>"))).rejects.toMatchObject({ code: "UNSUPPORTED_MEDIA_TYPE" });
  expect(stored).toHaveLength(0);
  expect(deleted).toHaveLength(1);
});

test("the stored type comes from the server, not the browser's Content-Type", async () => {
  const { upload, stored } = routes();
  const response = await upload("resume.pdf", text("%PDF-1.4 resume"), "text/html");
  expect(response.status).toBe(200);
  expect(stored[0].type).toBe("application/pdf");
});

test("cleanup removes only unattached uploads older than a day, record first", async () => {
  const now = Date.now();
  const rows = [
    { _id: "old-orphan", gridId: "g1", createdAt: new Date(now - ORPHAN_AGE_MS - 1) },
    { _id: "attached", gridId: "g2", applicationId: "OL-1", createdAt: new Date(now - ORPHAN_AGE_MS - 1) },
    { _id: "owned", gridId: "g3", ownerApplicationId: "OL-2", createdAt: new Date(now - ORPHAN_AGE_MS - 1) },
    { _id: "fresh", gridId: "g4", createdAt: new Date(now - 1000) },
  ];
  const order: string[] = [];
  const unattached = (row: any) => !("applicationId" in row) && !("ownerApplicationId" in row);
  const files = {
    find: (query: any) => ({ toArray: async () => rows.filter(row => unattached(row) && row.createdAt < query.createdAt.$lt) }),
    deleteOne: async ({ _id }: any) => { const index = rows.findIndex(row => row._id === _id && unattached(row)); if (index < 0) return { deletedCount: 0 }; rows.splice(index, 1); order.push(`record:${_id}`); return { deletedCount: 1 }; },
  };
  const bucket = { delete: async (id: string) => { order.push(`bytes:${id}`); } };
  expect(await removeOrphanedUploads(files as any, bucket as any, now)).toBe(1);
  expect(order).toEqual(["record:old-orphan", "bytes:g1"]);
  expect(rows.map(row => row._id)).toEqual(["attached", "owned", "fresh"]);
});
