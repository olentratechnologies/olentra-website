import { expect, test } from "bun:test";
import { AUTOMATED_EMAILS, validateEmailTemplate } from "../../src/modules/email-templates/automated-templates";
import { createTemplates } from "../../src/modules/templates/templates.service";
import { createInternshipMailer } from "../../src/infrastructure/email/mailer";
import type { Principal } from "../../src/shared/principal";

const admin: Principal = { id: "admin", role: "company", staffRole: "admin", name: "Admin", email: "admin@example.test", applicationId: null, sessionVersion: 1 };
function fixture() {
  const records = new Map<string, any>();
  const writes: any[] = [], session = { transaction: true };
  const collection = (name: string) => ({
    find: () => { const cursor = { sort: () => cursor, limit: () => cursor, toArray: async () => [...records.values()].filter(row => row.collection === name) }; return cursor; },
    findOne: async ({ _id }: any) => records.get(`${name}:${_id}`) || null,
    updateOne: async ({ _id }: any, update: any, options: any) => { writes.push(options); records.set(`${name}:${_id}`, { _id, collection: name, ...update.$set }); },
    deleteOne: async ({ _id }: any, options: any) => { writes.push(options); records.delete(`${name}:${_id}`); },
    createIndex: async () => {},
  });
  const transact = async (_key: string, _actor: any, _input: any, run: any) => run(session);
  return { service: () => createTemplates({ collection: collection as any, transact: transact as any }), records, writes, session };
}
const options = { schedule: {durationLabel:"1 calendar month",startOn:"2030-01-24",endOn:"2030-02-23",workMode:"Remote",schedule:"Part-time"}, to: "intern@example.test", name: "Alex <Kumar>", programName: "Software Engineer Intern", applicationId: "OL-123", scheduledAt: "2030-01-15T10:00:00.000Z", meetingUrl: "https://example.test/meeting", portalUrl: "https://example.test/intern/portal", magicLinkUrl: "https://example.test/intern/verify?token=one-time", linkedinShareUrl: "https://www.linkedin.com/feed/?shareActive=true", certificateVerifyUrl: "https://example.test/certificates/verify/CERT-123", interviewId: "INTV-123", sequence: 2 };

test("all sixteen defaults render required links and details, with no portal links before selection", () => {
  const mailer = createInternshipMailer("");
  expect(AUTOMATED_EMAILS).toHaveLength(16);
  for (const definition of AUTOMATED_EMAILS) {
    const template = validateEmailTemplate(definition.id, definition);
    const rendered = mailer.renderAutomated(definition.id, options, template);
    expect(rendered.html).toContain("Alex &lt;Kumar&gt;");
    expect(rendered.html).toContain('bgcolor="#101827"');
    expect(rendered.html).toContain('bgcolor="#eaf0f6"');
    expect(rendered.html).not.toMatch(/<h1\b/i);
    expect(rendered.html).toContain('alt="Olentra Technologies logo"');
    expect(rendered.html).toContain('mailto:intern.support@olentratechnologies.com');
    expect(rendered.html).not.toContain("Alex <Kumar>");
    expect(rendered.text).not.toMatch(/\{\w+\}/);
    if (["application-received", "shortlisted"].includes(definition.id)) {
      expect(rendered.html).not.toContain("/intern/");
      expect(rendered.text).not.toContain("https://");
    }
    if (definition.id === "application-received") {
      expect(rendered.subject).toBe("Application Received: Software Engineer Intern (Ref: OL-123)");
      expect(rendered.text).toContain("3–5 business days");
      expect(rendered.text).toContain("Application Details");
      expect(rendered.text).toContain("Position: Software Engineer Intern");
      expect(rendered.text).toContain("Application Status: Received");
      expect(rendered.text).toContain("Internship Information");
      expect(rendered.text).toContain("Duration: 1 calendar month");
      expect(rendered.text).toContain("Start Date: To be confirmed in the official offer letter.");
      expect(rendered.text).toContain("What Happens Next?");
      expect(rendered.text).toContain("Talent Acquisition Team");
      expect(rendered.html).toContain("Application Details");
      expect(rendered.html).toContain("Talent Acquisition Team");
      expect(rendered.html).toContain("All rights reserved.");
    }
    if (definition.id === "selected") {
      expect(rendered.subject).toBe("Congratulations! Welcome to the Olentra Internship Program");
      expect(rendered.text).toContain("Activate your internship portal");
      expect(rendered.text).not.toContain(options.linkedinShareUrl);
      expect(rendered.html).not.toContain("LinkedIn");
    }
    if (definition.id === "offer-accepted") {
      expect(rendered.text).toContain(options.linkedinShareUrl);
      expect(rendered.html).toContain("Share on LinkedIn (optional)");
      expect(rendered.text).toContain("Internship Offer Letter (PDF)");
    }
    if (definition.id === "certificate") {
      expect(rendered.text).toContain(options.certificateVerifyUrl);
      expect(rendered.text).toContain(options.linkedinShareUrl);
    }
    if (definition.id.startsWith("interview-")) {
      expect(rendered.text).toContain("15 Jan 2030");
      expect(rendered.text).toContain(options.portalUrl);
      if (definition.id !== "interview-cancelled") expect(rendered.text).toContain(options.meetingUrl);
      expect(rendered.attachments).toHaveLength(definition.id === "interview-reminder" ? 0 : 1);
    }
  }
});

test("template overrides persist across service instances; preview and delivery share rendering; reset restores defaults", async () => {
  const f = fixture(), first = f.service();
  const input = { id: "selected", subject: "Welcome {fullName}", body: "You were chosen for {program}, {firstName}. <script>alert(1)</script>" };
  await first.execute("automatedEmail.save", input, admin, "request-save-template");
  expect(f.writes[0].session).toBe(f.session);
  const second = f.service();
  const list = await second.execute("automatedEmail.list", {}, admin, "") as any[];
  expect(list.find(item => item.id === "selected")).toMatchObject({ ...input, customized: true });
  const preview = await second.execute("automatedEmail.preview", input, admin, "") as any;
  const delivered = createInternshipMailer("").renderAutomated("selected", { ...options, name: "Alex Kumar", portalUrl: "https://example.test/intern/verify?token=sample-only", linkedinShareUrl: "https://www.linkedin.com/feed/?shareActive=true" }, await second.readAutomated("selected"));
  expect(preview.subject).toBe(delivered.subject);
  expect(preview.html).toBe(delivered.html);
  expect(preview.text).toBe(delivered.text);
  expect(preview.html).toContain("&lt;script&gt;");
  expect(preview.html).not.toContain("<script>");
  expect(preview.text).toContain("Activate your internship portal");
  await second.execute("automatedEmail.reset", { id: "selected" }, admin, "request-reset-template");
  expect(await second.readAutomated("selected")).toEqual({ subject: AUTOMATED_EMAILS[5].subject, body: AUTOMATED_EMAILS[5].body });
  expect((await second.execute("template.list", {}, admin, "")) as any[]).toEqual([]);
});

test("automated templates are admin-only and reject invalid ids, placeholders, lengths and early portal links", async () => {
  const service = fixture().service();
  for (const actor of [null, { ...admin, role: "intern" }, { ...admin, staffRole: "recruiter", permissions: ["messages.applicants"] }]) {
    for (const method of ["automatedEmail.list", "automatedEmail.save", "automatedEmail.preview", "automatedEmail.reset"]) {
      await expect(service.execute(method, { id: "selected", subject: "Hi", body: "Hello" }, actor as any, "key")).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
  }
  for (const input of [{ subject: "", body: "Hello" }, { subject: "Injected\r\nSubject", body: "Hi" }, { subject: "Hi", body: "x".repeat(5001) }, { subject: "Hi {unknown}", body: "Hi" }]) expect(() => validateEmailTemplate("selected", input)).toThrow();
  expect(() => validateEmailTemplate("nonexistent", { subject: "Hi", body: "Hi" })).toThrow();
  for (const id of ["application-received", "shortlisted"]) expect(() => validateEmailTemplate(id, { subject: "Hello", body: "Open https://example.test/intern/portal" })).toThrow();
});

test("previously saved selection copy loses the stock LinkedIn prompt", () => {
  const template = validateEmailTemplate("selected", {
    subject: "Welcome {fullName}",
    body: "Hi {fullName},\n\nActivate your internship portal using the one-time link below, and share your achievement on LinkedIn.",
  });
  const rendered = createInternshipMailer("").renderAutomated("selected", options, template);
  expect(rendered.text).toContain("using the one-time link below.");
  expect(rendered.text).not.toContain("LinkedIn");
  expect(rendered.html).not.toContain(options.linkedinShareUrl);
});


test("confirmed schedule is in both email bodies even when customized text omits date placeholders", () => {
  const rendered=createInternshipMailer("").renderAutomated("offer", {...options,schedule:{durationLabel:"1 calendar month",startOn:"2026-11-24",endOn:"2026-12-23",workMode:"Remote",schedule:"Part-time"}}, {subject:"Your internship offer",body:"Hi {fullName}, please review the offer."});
  for(const content of [rendered.html,rendered.text]) {
    expect(content).toContain("Tuesday, 24 November 2026");
    expect(content).toContain("Wednesday, 23 December 2026");
    expect(content).toContain("1 calendar month");
  }
});
