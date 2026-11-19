import { afterAll, beforeAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { internshipTestMongoUri } from "./config";
import { connectInternDatabase, createInternshipDomain, DomainError, type Principal } from "./domain";
const uri = internshipTestMongoUri();
if (!uri) throw new Error("Set INTERNSHIP_TEST_MONGODB_URI (or deprecated INTERN_TEST_MONGODB_URI) for the isolated Atlas integration test.");
const prefix = `test_intern_query_${randomUUID().replaceAll("-", "")}_`;
let connection: Awaited<ReturnType<typeof connectInternDatabase>>;
let domain: ReturnType<typeof createInternshipDomain>;
const staff: Principal = { id: "staff", role: "company", staffRole: "admin", name: "Staff", email: "staff@example.test", applicationId: null, sessionVersion: 1 };
const intern: Principal = { id: "intern", role: "intern", name: "Intern", email: "intern@example.test", applicationId: "app-1", sessionVersion: 1 };
beforeAll(async () => {
  connection = await connectInternDatabase(uri!); domain = createInternshipDomain({ ...connection, prefix }); await domain.initialize();
  await domain.collection("applications").insertMany([
    { _id: "app-1", email: "ada@example.test", name: "Ada", programId: "software-engineer", program: "Software Engineer Intern", status: "Joined", claimHash: "secret-must-not-leak" },
    { _id: "app-2", email: "bob@example.test", name: "Bob", programId: "software-engineer", program: "Software Engineer Intern", status: "Joined" },
    { _id: "app-3", email: "cat@example.test", name: "Cat", programId: "software-engineer", program: "Software Engineer Intern", status: "Joined" },
  ]);
  await domain.collection("interns").insertMany([
    { _id: "intern-1", applicationId: "app-1", status: "Active", batch: "A", joinedOn: "2026-01-01" },
    { _id: "intern-2", applicationId: "app-2", status: "Completed", batch: "B", joinedOn: "2026-02-01" },
    { _id: "intern-3", applicationId: "app-3", status: "Completed", batch: "B", joinedOn: "2026-03-01" },
  ]);
  await domain.collection("offers").insertOne({ _id: "offer-1", applicationId: "app-1", status: "Accepted" });
  await domain.collection("onboarding").insertOne({ _id: "onboarding-1", applicationId: "app-1", status: "Approved" });
  await domain.collection("projects").insertOne({ _id: "project-1", name: "Orbital project", description: "Build", team: ["app-1", "app-2"], status: "In progress", programId: "software-engineer", program: "Software Engineer Intern", createdOn: "2026-02-01" });
  await domain.collection("tasks").insertOne({ _id: "task-1", applicationId: "app-3", projectId: "project-1", title: "Task", status: "Todo", required: true, dueOn: "2026-12-01" });
  await domain.collection("submissions").insertOne({ _id: "submission-1", applicationId: "app-3", taskId: "task-1", status: "Submitted", submittedOn: "2026-02-02", version: 1 });
  await domain.collection("certificates").insertOne({ _id: "cert-1", internId: "intern-2", applicationId: "app-2", recipient: "Bob", certificateNumber: "CERT-1", programId: "software-engineer", program: "Software Engineer Intern", status: "Issued", issuedOn: "2026-02-03" });
}, 30000);
afterAll(async () => { if (!connection) return; for (const { name } of await connection.db.listCollections({}, { nameOnly: true }).toArray()) if (name.startsWith(prefix)) await connection.db.collection(name).drop(); await connection.client.close(); }, 30000);

test("staff queries paginate, join safe records, filter and enforce roles", async () => {
  const first = await domain.execute("intern.list", { page: 1, pageSize: 1, sortField: "name", sortDirection: "asc" }, staff);
  expect(first.total).toBe(3); expect(first.items[0].application.name).toBe("Ada"); expect(first.items[0].projects[0].name).toBe("Orbital project");
  expect(first.items[0].application.claimHash).toBeUndefined(); expect(first.batches).toEqual(["A", "B"]); expect(first.counts.statuses).toEqual({ Active: 1, Completed: 2 });
  expect((await domain.execute("intern.list", { page: 2, pageSize: 1, sortField: "name", sortDirection: "asc" }, staff)).items[0].application.name).toBe("Bob");
  expect((await domain.execute("intern.list", { programId: "software-engineer", search: "Ada" }, staff)).total).toBe(1);
  expect((await domain.execute("intern.list", { search: ".*" }, staff)).total).toBe(0);
  expect((await domain.execute("intern.list", { eligible: true }, staff)).total).toBe(0);
  await domain.collection("tasks").updateOne({ _id: "task-1" }, { $set: { status: "Approved" } });
  expect((await domain.execute("intern.list", { eligible: true }, staff)).items[0].id).toBe("intern-3");
  const projects = await domain.execute("project.list", { programId: "software-engineer" }, staff);
  expect(projects.total).toBe(1); expect(projects.items[0].members).toHaveLength(2); expect(projects.items[0].teamInterns[0].status).toBeTruthy();
  expect((await domain.execute("project.list", { applicationId: "app-3" }, staff)).total).toBe(0);
  expect(await domain.execute("application.workflow", { applicationId: "app-1" }, staff)).toMatchObject({ offer: { id: "offer-1" }, onboarding: { id: "onboarding-1" }, intern: { id: "intern-1" } });
  expect(await domain.execute("application.workflow", { applicationId: "app-3" }, staff)).toMatchObject({ offer: null, onboarding: null, intern: { id: "intern-3" } });
  await expect(domain.execute("application.workflow", { applicationId: "missing" }, staff)).rejects.toBeInstanceOf(DomainError);
  expect((await domain.execute("task.list", { projectId: "project-1" }, staff)).items[0].application.name).toBe("Cat");
  expect((await domain.execute("submission.list", { projectId: "project-1", taskId: "task-1" }, staff)).items[0].task.title).toBe("Task");
  expect((await domain.execute("certificate.list", { programId: "software-engineer" }, staff)).counts.programs["software-engineer"]).toBe(1);
  expect((await domain.execute("certificate.list", { programId: "software-engineer" }, staff)).items[0].intern.id).toBe("intern-2");
  for (const method of ["application.workflow", "intern.list", "project.list", "task.list", "submission.list", "certificate.list"]) await expect(domain.execute(method, { applicationId: "app-1" }, intern)).rejects.toBeInstanceOf(DomainError);
}, 30000);
