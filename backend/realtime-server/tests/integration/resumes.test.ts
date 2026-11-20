import { afterAll, beforeAll, expect, test } from "bun:test";
import { createHash, randomUUID } from "node:crypto";
import { GridFSBucket } from "mongodb";
import { internshipTestMongoUri } from "./config";
import { connectInternDatabase, createInternshipDomain, type Principal } from "./domain";
import { createInternshipServer } from "./server";

const uri = internshipTestMongoUri();
if (!uri) throw new Error("Set INTERNSHIP_TEST_MONGODB_URI (or deprecated INTERN_TEST_MONGODB_URI) for isolated internship tests.");
const prefix = `test_resumes_${randomUUID().replaceAll("-", "")}_`;
let connection: Awaited<ReturnType<typeof connectInternDatabase>>;
let domain: ReturnType<typeof createInternshipDomain>;
let instance: Awaited<ReturnType<typeof createInternshipServer>>;
let admin: Principal;
let base: string;
const key = () => randomUUID().replaceAll("-", "");
const password = "ResumeAccessPassword2026!";
const tokens: Record<string, string> = {};
const fileIds = { a: randomUUID(), b: randomUUID(), orphan: randomUUID(), pending: randomUUID() };
const pdf = "%PDF-1.4 resume of applicant ";

beforeAll(async () => {
  connection = await connectInternDatabase(uri!);
  domain = createInternshipDomain({ ...connection, prefix });
  instance = await createInternshipServer({ domain, secret: "resume-test-secret-at-least-32-bytes!", port: 0 });
  base = `http://127.0.0.1:${instance.server.port}`;
  admin = await domain.createTestStaff("admin@example.test", password);
  for (const role of ["viewer", "recruiter", "mentor"]) await domain.execute("staff.create", { name: role, email: `${role}@example.test`, password, staffRole: role }, admin, key());
  // A custom role that may read applications but was not granted resume downloads.
  const reader = await domain.execute("role.create", { name: "Application reader", permissions: ["applications.read"] }, admin, key());
  await domain.execute("staff.create", { name: "reader", email: "reader@example.test", password, staffRole: reader.id }, admin, key());
  await domain.collection("applications").insertMany([
    { _id: "app-a", name: "Applicant A", email: "a@example.test", program: "Software Engineer Intern", programId: "software-engineer", status: "Selected", resumeAttachmentId: fileIds.a, notes: [], version: 1 },
    { _id: "app-b", name: "Applicant B", email: "b@example.test", program: "Software Engineer Intern", programId: "software-engineer", status: "Selected", resumeAttachmentId: fileIds.b, notes: [], version: 1 },
    { _id: "app-none", name: "No Resume", email: "none@example.test", program: "Software Engineer Intern", programId: "software-engineer", status: "Applied", notes: [], version: 1 },
    { _id: "app-pending", name: "Pending Resume", email: "pending@example.test", program: "Software Engineer Intern", programId: "software-engineer", status: "Applied", resumeAttachmentId: fileIds.pending, notes: [], version: 1 },
  ]);
  const bucket = new GridFSBucket(connection.db, { bucketName: prefix + "uploads" });
  const store = async (body: string) => {
    const upload = bucket.openUploadStream("resume.pdf");
    upload.end(Buffer.from(body));
    await new Promise<void>((resolve, reject) => { upload.once("finish", resolve); upload.once("error", reject); });
    return upload.id;
  };
  const hash = createHash("sha256").update("known-token").digest("hex");
  await domain.collection("files").insertMany([
    { _id: fileIds.a, gridId: await store(pdf + "A"), kind: "resume", status: "ready", name: "Résumé A.pdf", type: "application/pdf", size: (pdf + "A").length, applicationId: "app-a", accessTokenHash: hash, createdAt: new Date() },
    { _id: fileIds.b, gridId: await store(pdf + "B"), kind: "resume", status: "ready", name: "resume-b.pdf", type: "application/pdf", size: (pdf + "B").length, applicationId: "app-b", accessTokenHash: hash, createdAt: new Date() },
    // An anonymous upload nobody has claimed yet: staff must not reach it.
    { _id: fileIds.orphan, gridId: await store(pdf + "orphan"), kind: "resume", status: "ready", name: "orphan.pdf", type: "application/pdf", size: (pdf + "orphan").length, accessTokenHash: hash, createdAt: new Date() },
    { _id: fileIds.pending, kind: "resume", status: "pending", storage: "oci", name: "pending.docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 10, applicationId: "app-pending", createdAt: new Date() },
  ]);
  for (const role of ["admin", "viewer", "recruiter", "mentor", "reader"]) tokens[role] = (await instance.auth.login(`${role}@example.test`, password)).token;
  for (const id of ["a", "b"]) {
    const linked = await domain.autoProvisionAccount(`app-${id}`, `${id}@example.test`);
    await domain.changePassword(linked.id, "", password);
    tokens[`intern-${id}`] = (await instance.auth.login(`${id}@example.test`, password)).token;
  }
}, 60000);

afterAll(async () => {
  await instance?.stop();
  if (!connection) return;
  for (const { name } of await connection.db.listCollections({}, { nameOnly: true }).toArray()) if (name.startsWith(prefix)) await connection.db.collection(name).drop();
  await connection.client.close();
}, 30000);

const download = (fileId: string, token?: string) => fetch(`${base}/intern/files/${fileId}`, { headers: token ? { authorization: `Bearer ${token}` } : {} });
const describe = async (role: string, applicationId: string) => {
  const actor = (await domain.account((await domain.collection("accounts").findOne({ email: `${role}@example.test` }))!._id as string))!;
  return domain.execute("application.resume", { applicationId }, actor);
};

test("staff with resume access can describe and download any applicant's resume", async () => {
  for (const role of ["admin", "recruiter"]) {
    const described = await describe(role, "app-a");
    expect(described.resume).toMatchObject({ id: fileIds.a, name: "Résumé A.pdf", type: "application/pdf", status: "ready", previewable: true });
    const response = await download(described.resume.id, tokens[role]);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(pdf + "A");
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("content-disposition")).toContain("filename*=UTF-8''R%C3%A9sum%C3%A9%20A.pdf");
    expect((await download(fileIds.b, tokens[role])).status).toBe(200);
  }
  expect(await describe("admin", "app-none")).toEqual({ resume: null });
  expect((await describe("recruiter", "app-pending")).resume).toMatchObject({ status: "processing", previewable: false });
  expect((await download(fileIds.pending, tokens.admin)).status).toBe(404);
  await expect(describe("admin", "app-missing")).rejects.toMatchObject({ code: "NOT_FOUND" });
}, 60000);

test("staff without resume access and anonymous callers are refused", async () => {
  for (const role of ["viewer", "mentor", "reader"]) {
    await expect(describe(role, "app-a")).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect((await download(fileIds.a, tokens[role])).status).toBe(403);
  }
  expect((await download(fileIds.a)).status).toBe(403);
  // A claimed upload's original access token no longer opens it.
  expect((await fetch(`${base}/intern/files/${fileIds.a}`, { headers: { "x-file-token": "known-token" } })).status).toBe(403);
  // Unclaimed anonymous uploads stay private, even from administrators.
  expect((await download(fileIds.orphan, tokens.admin)).status).toBe(403);
  // Unknown IDs look the same as missing files.
  expect((await download(randomUUID(), tokens.admin)).status).toBe(404);
}, 60000);

test("an applicant can only reach their own resume", async () => {
  const internA = (await domain.account((await domain.collection("accounts").findOne({ email: "a@example.test" }))!._id as string))!;
  expect((await domain.execute("application.resume", { applicationId: "app-a" }, internA)).resume.id).toBe(fileIds.a);
  await expect(domain.execute("application.resume", { applicationId: "app-b" }, internA)).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(domain.execute("application.resume", { applicationId: "app-missing" }, internA)).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(domain.execute("application.resume", { applicationId: "app-a" }, null)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  expect(await (await download(fileIds.a, tokens["intern-a"])).text()).toBe(pdf + "A");
  expect((await download(fileIds.b, tokens["intern-a"])).status).toBe(403);
  expect((await download(fileIds.a, tokens["intern-b"])).status).toBe(403);
}, 60000);
