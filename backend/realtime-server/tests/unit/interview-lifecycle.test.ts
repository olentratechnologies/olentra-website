import test from "node:test";
import assert from "node:assert/strict";
import { createLifecycle } from "../../src/modules/lifecycle/lifecycle.service";
import type { Principal } from "../../src/shared/principal";

const staff: Principal = {
  id: "staff",
  role: "company",
  staffRole: "admin",
  name: "Test Staff",
  email: "staff@example.test",
  applicationId: null,
  sessionVersion: 1,
};

function createFakeLifecycle() {
  const application = {
    _id: "OL-1",
    name: "Test Intern",
    program: "Software Engineer Intern",
    status: "Shortlisted",
    history: [] as Record<string, unknown>[],
  };
  let interview: Record<string, unknown> | null = null;
  const notifications: Record<string, unknown>[] = [];
  const activities: Record<string, unknown>[] = [];
  const events: Record<string, unknown>[] = [];
  const emails: { type: string; payload: any; session: any }[] = [];
  const session = {};
  const collection = (name: string) => {
    if (name === "applications") {
      return {
        findOne: async () => application,
        updateOne: async (_filter: unknown, update: any) => {
          application.history.push(update.$push.history);
        },
        find: () => ({
          project: () => ({ toArray: async () => [application] }),
        }),
      };
    }
    if (name === "interviews") {
      return {
        findOne: async () => interview,
        findOneAndUpdate: async (_filter: unknown, update: any) => {
          if (interview?.status === "Cancelled" && (_filter as any).status) return null;
          const sequence = Number(interview?.sequence || 0) + Number(update.$inc?.sequence || 0);
          interview = {
            ...(interview || update.$setOnInsert),
            ...update.$set,
            sequence,
          };
          for (const key of Object.keys(update.$unset || {})) delete interview![key];
          return interview;
        },
      };
    }
    if (name === "notifications") {
      return { insertOne: async (row: Record<string, unknown>) => notifications.push(row), insertMany: async (rows: Record<string, unknown>[]) => notifications.push(...rows) };
    }
    if (name === "activity") {
      return { insertOne: async (row: Record<string, unknown>) => activities.push(row) };
    }
    if (name === "events") {
      return { insertOne: async (row: Record<string, unknown>) => events.push(row) };
    }
    return {};
  };
  const responses = new Map<string, unknown>();
  const transact = async (key: string, _actor: Principal | null, _input: unknown, run: (session: any) => Promise<unknown>) => {
    if (responses.has(key)) return responses.get(key);
    const result = await run(session); responses.set(key, result); return result;
  };
  return {
    lifecycle: createLifecycle({ collection: collection as any, transact: transact as any, outbox: { enqueue: async (type, payload, session) => { emails.push({ type, payload, session }); }, enqueueMany: async () => {} } }),
    application, emails, session,
    getInterview: () => interview,
    notifications,
    activities,
    events,
  };
}

test("interview schedule upserts one record and records applicant notifications and history", async () => {
  const fake = createFakeLifecycle();
  const firstTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const first = await fake.lifecycle.execute("interview.schedule", {
    applicationId: "OL-1",
    scheduledAt: firstTime,
    meetingUrl: "https://meet.example.test/first",
  }, staff, "interview-schedule-first");

  const secondTime = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const second = await fake.lifecycle.execute("interview.schedule", {
    applicationId: "OL-1",
    scheduledAt: secondTime,
    meetingUrl: "https://meet.example.test/second",
  }, staff, "interview-schedule-second");

  assert.equal((first as { id: string }).id, (second as { id: string }).id);
  assert.equal(fake.getInterview()?.scheduledAt, secondTime);
  assert.equal(fake.notifications.length, 2);
  assert.match(String(fake.notifications[1]?.body), /interview is scheduled/);
  assert.deepEqual(fake.application.history.map((entry) => entry.title), [
    "Interview scheduled",
    "Interview rescheduled",
  ]);
  assert.equal(fake.activities.length, 2);
  assert.equal(fake.events.length, 2);
});

test("interview schedule rejects non-shortlisted applicants and unsafe meeting URLs", async () => {
  const fake = createFakeLifecycle();
  fake.application.status = "Selected";
  await assert.rejects(
    fake.lifecycle.execute("interview.schedule", {
      applicationId: "OL-1",
      scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      meetingUrl: "https://meet.example.test/room",
    }, staff, "interview-not-shortlisted"),
    /Only shortlisted/,
  );
  fake.application.status = "Shortlisted";
  await assert.rejects(
    fake.lifecycle.execute("interview.schedule", {
      applicationId: "OL-1",
      scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      meetingUrl: "javascript:alert(1)",
    }, staff, "interview-unsafe-link"),
    /http or https/,
  );
  assert.equal(fake.getInterview(), null);
});


test("interview emails queue once per committed change and rescheduling resets reminders", async () => {
  const fake = createFakeLifecycle();
  const details = { applicationId: "OL-1", scheduledAt: new Date(Date.now() + 86400000).toISOString(), meetingUrl: "https://meet.example.test/first" };
  await fake.lifecycle.execute("interview.schedule", details, staff, "schedule-request-001");
  await fake.lifecycle.execute("interview.schedule", details, staff, "schedule-request-001");
  assert.equal(fake.emails.length, 1);
  assert.strictEqual(fake.emails[0].session, fake.session);
  fake.getInterview()!.reminderSentOn = new Date().toISOString();
  await fake.lifecycle.execute("interview.schedule", { ...details, meetingUrl: "https://meet.example.test/second" }, staff, "schedule-request-002");
  assert.equal(fake.getInterview()!.reminderSentOn, undefined);
  assert.equal(fake.emails[1].payload.sequence, "2");
  assert.equal(fake.emails[1].payload.interviewId, fake.emails[0].payload.interviewId);
  await fake.lifecycle.execute("interview.cancel", { applicationId: "OL-1", reason: "Unavailable" }, staff, "cancel-request-001");
  await fake.lifecycle.execute("interview.cancel", { applicationId: "OL-1", reason: "Unavailable" }, staff, "cancel-request-001");
  assert.equal(fake.emails.length, 3);
  assert.equal(fake.emails[2].payload.status, "Cancelled");
  assert.equal(fake.emails[2].payload.sequence, "3");
  assert.equal(fake.emails[2].payload.cancelReason, "Unavailable");
});
