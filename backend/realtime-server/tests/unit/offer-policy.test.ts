import { expect, test } from "bun:test";
import { decisionDeadline, earliestStartDate, earliestStartFor, formatDeadline, maxOpenDays, normalizeLeadDays, offerWindowProblem } from "../../src/modules/programs/offer-policy.mjs";
import { createInternshipMailer } from "../../src/infrastructure/email/mailer";
import { AUTOMATED_EMAILS, validateEmailTemplate } from "../../src/modules/email-templates/automated-templates";
import { runReminders } from "../../src/modules/reminders/reminders";

test("an offer closes at 11:59 PM IST on a fixed calendar day", () => {
  const deadline = decisionDeadline("2026-11-15T05:00:00.000Z", 4); // sent 15 Nov, 10:30 AM IST
  expect(deadline).toBe("2026-11-19T18:29:59.000Z");
  expect(formatDeadline(deadline)).toBe("Thursday, 19 November 2026, 11:59 PM IST");
  expect(formatDeadline("")).toBe("");
});

test("the deadline must fall the lead time before the start date", () => {
  const deadline = decisionDeadline("2030-11-15T05:00:00.000Z", 4); // closes 19 Nov
  expect(earliestStartFor(deadline, 3)).toBe("2030-11-22");
  expect(offerWindowProblem({ startOn: "2030-11-22", deadlineIso: deadline, leadDays: 3 })).toBeNull(); // exactly at the boundary
  expect(offerWindowProblem({ startOn: "2030-11-21", deadlineIso: deadline, leadDays: 3 })).toContain("at least 3 days before the start date");
  // The example that started this: start on the 19th, open for 7 days from the 15th.
  expect(offerWindowProblem({ startOn: "2030-11-19", deadlineIso: decisionDeadline("2030-11-15T05:00:00.000Z", 7), leadDays: 3 })).not.toBeNull();
  expect(offerWindowProblem({ startOn: "2030-11-19", deadlineIso: decisionDeadline("2030-11-15T05:00:00.000Z", 1), leadDays: 3 })).toBeNull();
});

test("the form knows the longest window and the earliest start a date allows", () => {
  expect(maxOpenDays("2026-11-30", "2026-11-20", 3)).toBe(7);
  expect(maxOpenDays("2026-11-23", "2026-11-20", 3)).toBe(0);
  expect(maxOpenDays("2027-06-01", "2026-11-20", 3)).toBe(30);
  expect(maxOpenDays("", "2026-11-20", 3)).toBe(0);
  expect(earliestStartDate("2026-11-20", 3)).toBe("2026-11-24");
  expect(normalizeLeadDays(undefined)).toBe(3);
  expect(normalizeLeadDays(0)).toBe(0);
  expect(normalizeLeadDays(31)).toBe(3);
});

const schedule = { durationLabel: "1 calendar month", startOn: "2030-01-24", endOn: "2030-02-23", workMode: "Remote", schedule: "Part-time", expiresOn: "2030-01-20T18:29:59.000Z" };
const options = { schedule, to: "intern@example.test", name: "Alex Kumar", programName: "Software Engineer Intern", applicationId: "OL-123", portalUrl: "https://example.test/intern/portal" };

test("offer, revision and reminder emails state the deadline in IST and how to ask for more time", () => {
  const mailer = createInternshipMailer("");
  for (const id of ["offer", "offer-revised", "offer-reminder"] as const) {
    const rendered = mailer.renderAutomated(id, options, validateEmailTemplate(id, AUTOMATED_EMAILS.find(item => item.id === id)!));
    expect(rendered.text).toContain("Respond by: Sunday, 20 January 2030, 11:59 PM IST");
    expect(rendered.text).toContain("intern.support@olentratechnologies.com before the deadline");
    expect(rendered.text).not.toContain("extended");
  }
  const offer = mailer.renderAutomated("offer", options);
  expect(offer.text).toContain("accept or decline the offer by Sunday, 20 January 2030, 11:59 PM IST");
  const reminder = mailer.renderAutomated("offer-reminder", options);
  expect(reminder.subject).toBe("Reminder: your Olentra offer closes in 24 hours");
  expect(reminder.html).toContain("https://example.test/intern/portal");
  const extended = mailer.renderAutomated("offer", { ...options, schedule: { ...schedule, extendedOn: "2030-01-18T10:00:00.000Z" } });
  expect(extended.text).toContain("Your decision deadline has been extended.");
  expect(mailer.renderAutomated("offer-accepted", options).text).not.toContain("Respond by");
});

test("each open offer or revision gets one reminder per deadline", async () => {
  const now = new Date("2030-01-20T00:00:00Z"), session = {};
  const rows: any[] = [
    { _id: "OFFER-1", applicationId: "OL-1", status: "Sent", currentVersion: 1, startOn: "2030-01-24", expiresOn: "2030-01-20T18:29:59.000Z" },
    { _id: "OFFER-2", applicationId: "OL-2", status: "Accepted", currentVersion: 1, pendingRevision: { version: 2, startOn: "2030-02-01", expiresOn: "2030-01-20T18:29:59.000Z" } },
  ];
  const queued: any[] = [];
  const offers = {
    find: (filter: any) => {
      expect(filter.$or[0]).toMatchObject({ status: "Sent", expiresOn: { $gt: now.toISOString(), $lte: "2030-01-21T00:00:00.000Z" } });
      return { limit: () => ({ toArray: async () => rows.map(row => ({ ...row })) }) };
    },
    updateOne: async (filter: any, update: any, opts: any) => {
      expect(opts.session).toBe(session);
      const row = rows.find(item => item._id === filter._id);
      if (row.reminderSentFor === update.$set.reminderSentFor) return { modifiedCount: 0 };
      Object.assign(row, update.$set);
      return { modifiedCount: 1 };
    },
  };
  const collection = (name: string) => name === "offers" ? offers : name === "interviews" ? { find: () => ({ limit: () => ({ toArray: async () => [] }) }) } : { findOne: async () => null };
  const outbox = { enqueue: async (type: string, payload: any) => { queued.push({ type, payload }); } };
  const transact = async (_key: string, _actor: any, _input: any, run: any) => run(session);
  expect(await runReminders({ collection: collection as any, outbox: outbox as any, transact, now })).toMatchObject({ offers: 2 });
  expect(await runReminders({ collection: collection as any, outbox: outbox as any, transact, now })).toMatchObject({ offers: 0 });
  expect(queued.map(item => [item.type, item.payload.status, item.payload.applicationId, item.payload.offerVersion])).toEqual([
    ["applicantStatus", "offer-reminder", "OL-1", "1"],
    ["applicantStatus", "offer-reminder", "OL-2", "2"],
  ]);
  expect(JSON.parse(queued[1].payload.offerSnapshot)).toMatchObject({ version: 2, startOn: "2030-02-01" });
});
