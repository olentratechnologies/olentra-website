/**
 * Seeds `.test` accounts into the DEV internship database so portal and
 * dashboard changes can be checked end to end.
 *
 *   bun run seed:test                         intern at the "offer" stage
 *   bun run seed:test -- --stage joined       applied | offer | joined
 *   bun run seed:test -- --with-recruiter     also a recruiter staff login
 *   bun run seed:test -- --stage joined --with-certificate   + 5 approved on-time submissions and a certificate
 *   bun run seed:test -- --remove             delete every .test applicant, their records and the test recruiter
 *   bun run seed:test -- --remove --dry-run   only count what --remove would delete
 *
 * Every run rebuilds the test intern from scratch, so a stage can be replayed.
 * Credentials come from INTERNSHIP_TEST_INTERN_* / INTERNSHIP_TEST_RECRUITER_*.
 */
import { randomUUID } from "node:crypto";
import { GridFSBucket } from "mongodb";
import { internshipMongoUri } from "../src/config/env";
import { connectInternDatabase, createInternshipDomain } from "../src/app/command-dispatcher";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const option = (name: string) => { const index = args.indexOf(`--${name}`); return index >= 0 ? args[index + 1] : undefined; };
const stage = option("stage") || "offer";
const STAGES = ["applied", "offer", "joined"];

if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed test accounts with NODE_ENV=production.");
if (args.includes("--dry-run") && !args.includes("--remove")) throw new Error("--dry-run only works with --remove.");
if (!STAGES.includes(stage)) throw new Error(`--stage must be one of: ${STAGES.join(", ")}`);
const uri = internshipMongoUri();
if (!uri) throw new Error("Set INTERNSHIP_MONGODB_URI in the local environment.");
const intern = { email: process.env.INTERNSHIP_TEST_INTERN_EMAIL?.toLowerCase(), password: process.env.INTERNSHIP_TEST_INTERN_PASSWORD };
const recruiter = { email: process.env.INTERNSHIP_TEST_RECRUITER_EMAIL?.toLowerCase(), password: process.env.INTERNSHIP_TEST_RECRUITER_PASSWORD };
const checkAccount = (label: string, account: { email?: string; password?: string }) => {
  if (!account.email || !account.password) throw new Error(`Set INTERNSHIP_TEST_${label}_EMAIL and INTERNSHIP_TEST_${label}_PASSWORD.`);
  if (!account.email.endsWith(".test")) throw new Error(`Test ${label.toLowerCase()} email must end in .test so it can never reach a real inbox.`);
  if (account.password.length < 12) throw new Error(`Test ${label.toLowerCase()} password must be at least 12 characters.`);
};
checkAccount("INTERN", intern);
if (flag("with-recruiter")) checkAccount("RECRUITER", recruiter);

const id = (prefix: string) => `${prefix}-${randomUUID()}`;
const iso = (offsetDays = 0) => new Date(Date.now() + offsetDays * 86400000).toISOString();
const day = (offsetDays = 0) => iso(offsetDays).slice(0, 10);

const connection = await connectInternDatabase(uri);
try {
  const domain = createInternshipDomain(connection);
  await domain.initialize();
  const c = (name: string) => domain.collection(name);
  const accounts = c("accounts"), credentials = c("test_credentials"), applications = c("applications"), offers = c("offers"), onboarding = c("onboarding"), interns = c("interns"), projects = c("projects"), tasks = c("tasks"), submissions = c("submissions"), certificates = c("certificates"), messages = c("messages"), notifications = c("notifications"), stories = c("stories"), events = c("events"), interviews = c("interviews"), activity = c("activity"), reads = c("notification_reads"), files = c("files"), outbox = c("outbox");
  const bucket = new GridFSBucket(connection.db, { bucketName: domain.prefix + "uploads" });
  const dryRun = flag("dry-run");
  const counted: Record<string, number> = {};
  /** Deletes (or, with --dry-run, only counts) matching rows. */
  const wipe = async (name: string, collection: ReturnType<typeof c>, filter: Record<string, unknown>) => {
    const count = dryRun ? await collection.countDocuments(filter as any) : (await collection.deleteMany(filter as any)).deletedCount;
    counted[name] = (counted[name] || 0) + count;
  };
  console.info(`Seeding test accounts into database "${connection.db.databaseName}" (prefix ${domain.prefix}).`);

  async function removeIntern(email: string) {
    const app = await applications.findOne({ email });
    const account = await accounts.findOne({ email, role: "intern" });
    if (account) await Promise.all([wipe("accounts", accounts, { _id: account._id }), wipe("credentials", credentials, { userId: account._id }), wipe("notification reads", reads, { accountId: account._id })]);
    await wipe("queued emails", outbox, { "payload.to": email });
    if (!app) return;
    const applicationId = app._id;
    const internIds = (await interns.find({ applicationId }, { projection: { _id: 1 } }).toArray()).map(row => row._id);
    const uploads = await files.find({ $or: [{ applicationId }, { ownerApplicationId: applicationId }] }, { projection: { gridId: 1 } }).toArray();
    if (!dryRun) for (const upload of uploads) await bucket.delete(upload.gridId).catch(() => undefined);
    await Promise.all([
      wipe("applications", applications, { _id: applicationId }),
      wipe("offers", offers, { applicationId }), wipe("onboarding", onboarding, { applicationId }), wipe("interns", interns, { applicationId }),
      wipe("tasks", tasks, { applicationId }), wipe("submissions", submissions, { applicationId }),
      wipe("certificates", certificates, { $or: [{ applicationId }, { internId: { $in: internIds } }] }),
      wipe("messages", messages, { applicationId }), wipe("notifications", notifications, { applicationId }), wipe("stories", stories, { applicationId }),
      wipe("interviews", interviews, { applicationId }), wipe("activity", activity, { applicationId }), wipe("files", files, { _id: { $in: uploads.map(upload => upload._id) } }),
      wipe("projects", projects, { testAccount: true, team: applicationId }),
    ]);
  }
  async function removeTestApplications() {
    const testApplications = await applications
      .find({ email: { $regex: /\.test$/i } }, { projection: { email: 1 } })
      .toArray();
    for (const application of testApplications) {
      // The seeded intern was already handled by name.
      if (typeof application.email === "string" && application.email !== intern.email) await removeIntern(application.email);
    }
    return testApplications.length;
  }
  async function removeStaff(email: string) {
    const account = await accounts.findOne({ email, role: "company", testAccount: true });
    if (account) await Promise.all([wipe("accounts", accounts, { _id: account._id }), wipe("credentials", credentials, { userId: account._id })]);
  }

  if (flag("remove")) {
    if (dryRun) console.info("Dry run: nothing will be deleted.");
    await removeIntern(intern.email!);
    const removedApplications = await removeTestApplications();
    if (recruiter.email) await removeStaff(recruiter.email);
    if (!dryRun) await events.insertOne({ _id: id("EVT"), type: "application.updated", applicationIds: [], createdAt: new Date() });
    console.info(`${dryRun ? "Would remove" : "Removed"} ${removedApplications} .test application(s) and the test recruiter:`);
    for (const [name, count] of Object.entries(counted)) if (count) console.info(`  ${name}: ${count}`);
  } else {
    await removeIntern(intern.email!);
    const applicationId = id("OL"), accountId = id("ACC"), now = iso();
    const program = await c("programs").findOne({ _id: "software-engineer" });
    const status = stage === "applied" ? "Applied" : stage === "offer" ? "Selected" : "Joined";
    const history = [{ id: id("HST"), title: "Application received", date: iso(-6), detail: "Applied to Software Engineer Intern." }];
    if (stage !== "applied") history.push({ id: id("HST"), title: "Offer sent", date: iso(-1), detail: "Your internship offer is ready." });
    if (stage === "joined") history.push({ id: id("HST"), title: "Intern onboarded", date: now, detail: "Onboarding approved. Your internship workspace is ready." });
    await applications.insertOne({
      _id: applicationId, name: "Test Intern", email: intern.email, programId: "software-engineer", program: program?.name || "Software Engineer Intern",
      appliedOn: day(-6), status, initials: "TI", avatarColor: "#d9e5fb", college: "Olentra Test University", phone: "+91 90000 00000", location: "Hyderabad",
      skills: ["React", "JavaScript", "CSS"], linkedin: "https://www.linkedin.com/in/test-intern", videoUrl: "https://www.youtube.com/watch?v=aqz-KE-bpKQ", hasVideo: true,
      github: "", bio: "Seeded test applicant for local checks.", resumeAttachmentId: null, history, notes: [], projectIds: [], source: "Website", version: 1, testAccount: true,
    });
    await accounts.insertOne({ _id: accountId, role: "intern", name: "Test Intern", email: intern.email, applicationId, sessionVersion: 1, createdAt: new Date(), testAccount: true });
    await credentials.insertOne({ _id: accountId, userId: accountId, passwordHash: await Bun.password.hash(intern.password!, { algorithm: "argon2id" }), createdAt: new Date(), testAccount: true });

    if (stage !== "applied") {
      await offers.insertOne({
        _id: id("OFFER"), applicationId, status: stage === "joined" ? "Accepted" : "Sent", startOn: day(7), endOn: day(97), stipend: program?.stipend ?? 0,
        message: "We loved your application and intro video. Welcome to the team!", sentOn: iso(-1), ...(stage === "joined" ? { decidedOn: iso(-1) } : {}), testAccount: true,
      });
    }
    if (stage === "joined") {
      await onboarding.insertOne({ _id: id("ONB"), applicationId, phone: "+91 90000 00000", college: "Olentra Test University", location: "Hyderabad", skills: ["React", "JavaScript"], resumeAttachmentId: null, acknowledged: true, status: "Approved", submittedOn: iso(-1), approvedOn: now, testAccount: true });
      const projectId = id("PRJ"), internId = id("INT");
      await projects.insertOne({ _id: projectId, name: "Olentra Careers Revamp", description: "Polish the careers page experience.", team: [applicationId], dueOn: day(30), createdOn: day(), art: "planet", progress: 0, status: "In progress", program: program?.name || "Software Engineer Intern", testAccount: true });
      await interns.insertOne({ _id: internId, applicationId, batch: "", joinedOn: day(), status: "Active", projectIds: [projectId], revision: 1, testAccount: true });
      await tasks.insertOne({ _id: id("TASK"), projectId, applicationId, title: "Build the live insights card", description: "Create a responsive card that shows live internship numbers.", dueOn: day(10), required: true, status: "Todo", createdOn: now, submissionVersion: 0, testAccount: true });
      if (flag("with-certificate")) {
        const titles = ["Set up the project", "Design the careers hero", "Build the apply form", "Add live insights", "Polish mobile layout"];
        for (const [index, title] of titles.entries()) {
          const taskId = id("TASK"), due = day(-20 + index * 3), submitted = iso(-21 + index * 3), reviewed = iso(-20 + index * 3);
          await tasks.insertOne({ _id: taskId, projectId, applicationId, title, description: `${title} for the Olentra careers revamp.`, dueOn: due, required: true, status: "Approved", createdOn: iso(-25), submissionVersion: 1, testAccount: true });
          await submissions.insertOne({ _id: id("SUB"), taskId, applicationId, version: 1, notes: "Done — see the linked preview.", url: "https://example.test/preview", attachmentId: null, submittedOn: submitted, status: "Approved", feedback: "Great work!", reviewedOn: reviewed, testAccount: true });
        }
        await certificates.insertOne({ _id: id("CERT"), certificateNumber: `OLENTRA-${randomUUID()}`, internId, applicationId, recipient: "Test Intern", program: program?.name || "Software Engineer Intern", programId: "software-engineer", issuedOn: day(), status: "Issued", testAccount: true });
      }
    }
    await events.insertOne({ _id: id("EVT"), type: "application.updated", applicationIds: [applicationId], createdAt: new Date() });
    console.info(`Test intern ready at the "${stage}" stage (${intern.email}).`);

    if (flag("with-recruiter")) {
      await removeStaff(recruiter.email!);
      if (await accounts.findOne({ email: recruiter.email })) throw new Error("A non-test account already uses the recruiter email; choose another .test address.");
      const staffId = id("ACC");
      await accounts.insertOne({ _id: staffId, role: "company", staffRole: "recruiter", name: "Test Recruiter", email: recruiter.email, applicationId: null, sessionVersion: 1, disabled: false, createdAt: new Date(), testAccount: true });
      await credentials.insertOne({ _id: staffId, userId: staffId, passwordHash: await Bun.password.hash(recruiter.password!, { algorithm: "argon2id" }), createdAt: new Date(), testAccount: true });
      console.info(`Test recruiter ready (${recruiter.email}).`);
    }
  }
} finally {
  await connection.client.close();
}
