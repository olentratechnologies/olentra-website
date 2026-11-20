import { expect, test } from "bun:test";
import { Readable } from "node:stream";
import { createFilesRoutes } from "../../src/interfaces/http/files.routes";
import { authorizeStaff } from "../../src/modules/access/policy";
import { createResumeAccess } from "../../src/modules/files/resume-access";

const matches = (row: any, filter: any): boolean => Object.entries(filter).every(([field, expected]: [string, any]) => {
  if (field === "$or") return expected.some((option: any) => matches(row, option));
  return row[field] === expected;
});
const collection = (rows: any[]) => ({ findOne: async (filter: any) => rows.find(row => matches(row, filter)) ?? null }) as any;

const applications = collection([
  { _id: "app-a", resumeAttachmentId: "file-a" },
  { _id: "app-b", resumeAttachmentId: "file-b" },
  { _id: "app-none" },
  { _id: "app-stolen", resumeAttachmentId: "file-a" },
]);
const fileRows = [
  { _id: "file-a", kind: "resume", status: "ready", name: "a.pdf", type: "application/pdf", size: 4, applicationId: "app-a", gridId: "grid-a", createdAt: new Date("2026-11-01T00:00:00Z") },
  { _id: "file-b", kind: "resume", status: "pending", name: "b.docx", type: "application/msword", size: 4, ownerApplicationId: "app-b" },
  { _id: "file-orphan", kind: "resume", status: "ready", name: "o.pdf", type: "application/pdf", size: 4, gridId: "grid-o" },
];
const files = collection(fileRows);
const staff = (permissions: string[], staffRole = "custom") => ({ id: "s", role: "company", staffRole, permissions, name: "", email: "", applicationId: null, sessionVersion: 1 }) as any;
const intern = (applicationId: string) => ({ id: "i", role: "intern", name: "", email: "", applicationId, sessionVersion: 1 }) as any;
const access = createResumeAccess({ applications, files });

test("staff need both application and resume permissions", async () => {
  const recruiter = staff(["applications.read", "resumes.read"]);
  expect((await access.execute({ applicationId: "app-a" }, recruiter)).resume).toMatchObject({ id: "file-a", name: "a.pdf", status: "ready", previewable: true, uploadedAt: "2026-11-01T00:00:00.000Z" });
  expect((await access.execute({ applicationId: "app-a" }, staff([], "admin"))).resume?.id).toBe("file-a");
  expect((await access.execute({ applicationId: "app-b" }, recruiter)).resume).toMatchObject({ status: "processing", previewable: false });
  expect(await access.execute({ applicationId: "app-none" }, recruiter)).toEqual({ resume: null });
  // A record pointing at somebody else's file does not reveal it.
  expect(await access.execute({ applicationId: "app-stolen" }, recruiter)).toEqual({ resume: null });
  for (const permissions of [["applications.read"], ["resumes.read"], []]) {
    await expect(access.execute({ applicationId: "app-a" }, staff(permissions))).rejects.toMatchObject({ code: "FORBIDDEN" });
  }
  expect(() => authorizeStaff("application.resume", {}, staff(["applications.read"]))).toThrow();
  expect(() => authorizeStaff("application.resume", {}, recruiter)).not.toThrow();
  await expect(access.execute({ applicationId: "missing" }, recruiter)).rejects.toMatchObject({ code: "NOT_FOUND" });
});

test("applicants only ever see their own resume", async () => {
  expect((await access.execute({ applicationId: "app-a" }, intern("app-a"))).resume?.id).toBe("file-a");
  await expect(access.execute({ applicationId: "app-b" }, intern("app-a"))).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(access.execute({ applicationId: "missing" }, intern("app-a"))).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(access.execute({ applicationId: "app-a" }, null)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  await expect(access.execute({}, intern("app-a"))).rejects.toMatchObject({ code: "INVALID_REQUEST" });
});

test("the download route applies the same rules and is never cached", async () => {
  const routes = (account: any) => createFilesRoutes({
    auth: { verify: async () => ({ account }) } as any,
    bucket: { openDownloadStream: () => Readable.from([Buffer.from("%PDF")]) } as any,
    files: { findOne: async (filter: any) => fileRows.find(row => row._id === filter._id && row.status === filter.status) ?? null } as any,
    withCors: (_origin, extra = {}) => new Headers(extra), sendJson: (data, _origin, status = 200) => Response.json(data, { status }),
  });
  const get = (account: any, id: string) => routes(account).download(new Request(`https://api.test/intern/files/${id}`, { headers: account ? { authorization: "Bearer t" } : {} }), null);
  const ok = await get(staff(["applications.read", "resumes.read"]), "file-a");
  expect(ok.status).toBe(200);
  expect(ok.headers.get("cache-control")).toBe("private, no-store");
  expect(ok.headers.get("content-disposition")).toBe(`attachment; filename="a.pdf"; filename*=UTF-8''a.pdf`);
  expect((await get(intern("app-a"), "file-a")).status).toBe(200);
  await expect(get(staff(["resumes.read"]), "file-a")).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(get(staff(["applications.read"]), "file-a")).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(get(intern("app-b"), "file-a")).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(get(null, "file-a")).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(get(staff([], "admin"), "file-orphan")).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(get(staff([], "admin"), "file-b")).rejects.toMatchObject({ code: "NOT_FOUND" });
});
