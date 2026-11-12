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
    program: "Tech Explorer",
    status: "Shortlisted",
    history: [] as Record<string, unknown>[],
  };
  let interview: Record<string, unknown> | null = null;
  const notifications: Record<string, unknown>[] = [];
  const activities: Record<string, unknown>[] = [];
  const events: Record<string, unknown>[] = [];
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
          interview = {
            ...(interview || update.$setOnInsert),
            ...update.$set,
          };
          return interview;
        },
      };
    }
    if (name === "notifications") {
      return { insertOne: async (row: Record<string, unknown>) => notifications.push(row) };
    }
    if (name === "activity") {
      return { insertOne: async (row: Record<string, unknown>) => activities.push(row) };
    }
    if (name === "events") {
      return { insertOne: async (row: Record<string, unknown>) => events.push(row) };
    }
    return {};
  };
  const transact = async (_key: string, _actor: Principal | null, _input: unknown, run: (session: any) => Promise<unknown>) => run({});
  return {
    lifecycle: createLifecycle({ collection: collection as any, transact: transact as any }),
    application,
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
