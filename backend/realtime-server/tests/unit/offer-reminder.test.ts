import { expect, test } from "bun:test";
import { createLifecycle } from "../../src/modules/lifecycle/lifecycle.service";

const admin = { id: "admin", role: "company" as const, staffRole: "admin", name: "Admin", email: "a@example.test", applicationId: null, sessionVersion: 1 };

function fixture(offer: Record<string, any>) {
  const queued: any[] = [], audits: any[] = [];
  let row: any = { _id: "OFFER-1", applicationId: "OL-1", status: "Sent", currentVersion: 1, ...offer };
  const collection = (name: string): any => ({
    collectionName: name,
    createIndex: async () => {},
    findOne: async (filter: any) => name === "offers" && filter.applicationId === row.applicationId && row.status === filter.status && row.expiresOn > filter.expiresOn.$gt ? { ...row } : null,
    updateOne: async (_filter: any, update: any) => { if (name === "offers") row = { ...row, ...update.$set }; return { modifiedCount: 1 }; },
    insertOne: async (doc: any) => { if (name === "staff_audit") audits.push(doc); },
    insertMany: async () => {},
  });
  const lifecycle = createLifecycle({ collection, transact: async (_k, _a, _i, fn) => fn({} as any), outbox: { enqueue: async (type: string, payload: any) => { queued.push({ type, payload }); }, enqueueMany: async () => {} } as any });
  return { lifecycle, queued, audits, offer: () => row };
}

const hoursFromNow = (hours: number) => new Date(Date.now() + hours * 3600_000).toISOString();

test("after the 24-hour reminder, a normal reminder is refused with a reason and an admin can force one more", async () => {
  const expiresOn = hoursFromNow(7);
  const { lifecycle, queued, audits, offer } = fixture({ expiresOn, reminderSentFor: expiresOn });
  expect(await lifecycle.execute("offer.remind", { applicationId: "OL-1" }, admin, "1")).toMatchObject({ queued: false, covered: true, reason: expect.stringContaining("24-hour deadline reminder") });
  expect(queued).toHaveLength(0);
  expect(await lifecycle.execute("offer.remind", { applicationId: "OL-1", force: true }, admin, "2")).toMatchObject({ queued: true });
  expect(queued[0].payload).toMatchObject({ applicationId: "OL-1", status: "offer-manual-reminder" });
  expect(audits.map(a => a.action)).toEqual(["offer.reminder.resent"]);
  expect(offer().lastReminderQueuedAt).toBeTruthy();
  expect(await lifecycle.execute("offer.remind", { applicationId: "OL-1", force: true }, admin, "3")).toMatchObject({ queued: false, reason: expect.stringContaining("10 minutes") });
  expect(queued).toHaveLength(1);
});

test("a reminder before the final day needs no force and records no resend", async () => {
  const { lifecycle, queued, audits } = fixture({ expiresOn: hoursFromNow(48) });
  expect(await lifecycle.execute("offer.remind", { applicationId: "OL-1" }, admin, "1")).toMatchObject({ queued: true });
  expect(queued).toHaveLength(1);
  expect(audits).toHaveLength(0);
});

test("only admins can send offer reminders", async () => {
  const { lifecycle } = fixture({ expiresOn: hoursFromNow(48) });
  await expect(lifecycle.execute("offer.remind", { applicationId: "OL-1", force: true }, { ...admin, staffRole: "mentor" }, "1")).rejects.toMatchObject({ code: "FORBIDDEN" });
});
