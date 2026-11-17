import { expect, test } from "bun:test";
import { isDigestTime } from "../../src/modules/reminders/reminders";

test("the digest goes out on Monday from 9am India time", () => {
  expect(isDigestTime(new Date("2026-11-16T03:30:00Z"))).toBe(true);  // Mon 09:00 IST
  expect(isDigestTime(new Date("2026-11-16T03:29:00Z"))).toBe(false); // Mon 08:59 IST
  expect(isDigestTime(new Date("2026-11-15T20:00:00Z"))).toBe(false); // Mon 01:30 IST
  expect(isDigestTime(new Date("2026-11-17T04:00:00Z"))).toBe(false); // Tuesday
});

import { runReminders } from "../../src/modules/reminders/reminders";
import { isCurrentInterviewEmail } from "../../src/modules/interviews/email-delivery";

test("reminder claim and enqueue share a transaction; only the due current interview queues", async () => {
  const now = new Date("2030-01-15T10:00:00Z"), session = {};
  const interview: any = { _id: "INTV-1", applicationId: "OL-1", status: "Scheduled", sequence: 2, scheduledAt: "2030-01-16T09:30:00Z", meetingUrl: "https://example.test/meeting" };
  const queued: any[] = [];
  const collection = (name: string) => name === "interviews" ? {
    find: () => ({ limit: () => ({ toArray: async () => interview.reminderSentOn ? [] : [interview] }) }),
    updateOne: async (filter: any, update: any, options: any) => { expect(options.session).toBe(session); expect(filter.sequence).toBe(2); Object.assign(interview, update.$set); return { modifiedCount: 1 }; },
  } : { findOne: async () => null };
  const outbox = { enqueue: async (type: string, payload: any, options: any) => { expect(options).toBe(session); queued.push({ type, payload }); } };
  const transact = async (_key: string, _actor: any, _input: any, run: any) => run(session);
  expect(await runReminders({ collection: collection as any, outbox: outbox as any, transact, now })).toMatchObject({ interviews: 1 });
  expect(await runReminders({ collection: collection as any, outbox: outbox as any, transact, now })).toMatchObject({ interviews: 0 });
  expect(queued).toHaveLength(1);
  expect(queued[0]).toMatchObject({ type: "interviewReminder", payload: { interviewId: "INTV-1", sequence: "2" } });
  const payload = queued[0].payload;
  expect(isCurrentInterviewEmail(interview, payload, true, now.getTime())).toBe(true);
  expect(isCurrentInterviewEmail({ ...interview, sequence: 3 }, payload, true, now.getTime())).toBe(false);
  expect(isCurrentInterviewEmail({ ...interview, status: "Cancelled" }, payload, true, now.getTime())).toBe(false);
  expect(isCurrentInterviewEmail(interview, payload, true, new Date("2030-01-17").getTime())).toBe(false);
  expect(isCurrentInterviewEmail(interview, { ...payload, status: "Cancelled" }, false)).toBe(false);
});
