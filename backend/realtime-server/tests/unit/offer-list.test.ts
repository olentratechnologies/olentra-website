import { expect, test } from "bun:test";
import { offerRows, pageOfferRows } from "../../src/modules/lifecycle/offer-list";

const now = Date.parse("2026-11-26T10:00:00.000Z");
const future = "2026-11-30T18:29:59.000Z", past = "2026-11-20T18:29:59.000Z";
const apps = new Map([["A", { name: "Asha" }], ["B", { name: "Bilal" }], ["C", { name: "Chitra" }], ["D", { name: "Dev" }], ["E", { name: "Esha" }], ["F", { name: "Farah" }]]);

test("each generated offer gets its type and current status", () => {
  const offers = [
    { applicationId: "A", status: "Sent", currentVersion: 1, expiresOn: future },
    { applicationId: "B", status: "Sent", currentVersion: 1, expiresOn: past, route: "instant" },
    { applicationId: "C", status: "Accepted", currentVersion: 2 },
    { applicationId: "D", status: "Accepted", currentVersion: 1, route: "direct" },
    { applicationId: "E", status: "Declined", currentVersion: 1 },
    { applicationId: "F", status: "Withdrawn", currentVersion: 1 },
  ];
  const versions = [
    { applicationId: "A", version: 1, status: "Sent", expiresOn: future, sentOn: "2026-11-25T00:00:00Z", stipend: 5000 },
    { applicationId: "B", version: 1, status: "Sent", route: "instant", expiresOn: past },
    { applicationId: "C", version: 1, status: "Sent" },                       // replaced by v2 without a decision
    { applicationId: "C", version: 2, status: "Sent", decision: "Accepted" },
    { applicationId: "D", version: 1, status: "Accepted", route: "direct", decision: "Accepted", expiresOn: null },
    { applicationId: "E", version: 1, status: "Sent", decision: "Declined" },
    { applicationId: "F", version: 1, status: "Sent" },
  ];
  const rows = offerRows(offers, versions, apps, now);
  const pick = (id: string) => rows.find((row) => row.id === id)!;
  expect(pick("A:v1")).toMatchObject({ type: "formal", status: "Open", current: true, name: "Asha", stipend: 5000 });
  expect(pick("B:v1")).toMatchObject({ type: "instant", status: "Expired", current: true });
  expect(pick("C:v1")).toMatchObject({ status: "Superseded", current: false });
  expect(pick("C:v2")).toMatchObject({ status: "Accepted", current: true });
  expect(pick("D:v1")).toMatchObject({ type: "direct", status: "Accepted" });
  expect(pick("E:v1")).toMatchObject({ status: "Declined" });
  expect(pick("F:v1")).toMatchObject({ status: "Withdrawn" });
});

test("offers without recorded versions still appear", () => {
  const rows = offerRows([{ applicationId: "A", status: "Accepted", name: "Asha", startOn: "2026-12-01" }], [], apps, now);
  expect(rows).toEqual([expect.objectContaining({ id: "A:v1", status: "Accepted", current: true, startOn: "2026-12-01" })]);
});

test("a pending schedule revision is open while the accepted version stays accepted", () => {
  const offers = [{ applicationId: "A", status: "Accepted", currentVersion: 1, pendingRevision: { version: 2, expiresOn: future } }];
  const versions = [{ applicationId: "A", version: 1, decision: "Accepted" }, { applicationId: "A", version: 2, status: "Sent", expiresOn: future }];
  const rows = offerRows(offers, versions, apps, now);
  expect(rows.find((row) => row.version === 2)).toMatchObject({ status: "Open", current: true });
  expect(rows.find((row) => row.version === 1)).toMatchObject({ status: "Accepted" });
});

test("filtering, counting, searching and paging", () => {
  const rows = offerRows(
    [{ applicationId: "A", status: "Sent", currentVersion: 1, expiresOn: future }, { applicationId: "B", status: "Accepted", currentVersion: 1, route: "instant" }],
    [{ applicationId: "A", version: 1, sentOn: "2026-11-24" }, { applicationId: "B", version: 1, route: "instant", decision: "Accepted", sentOn: "2026-11-25" }],
    apps, now,
  );
  const all = pageOfferRows(rows, {});
  expect(all.items.map((row) => row.id)).toEqual(["B:v1", "A:v1"]); // newest first
  expect(all.counts).toEqual({ statuses: { Open: 1, Accepted: 1 }, types: { formal: 1, instant: 1 }, all: 2 });
  const instant = pageOfferRows(rows, { type: "instant" });
  expect(instant.items.map((row) => row.id)).toEqual(["B:v1"]);
  expect(instant.counts.statuses).toEqual({ Accepted: 1 });
  expect(pageOfferRows(rows, { search: "ash" }).items.map((row) => row.id)).toEqual(["A:v1"]);
  expect(pageOfferRows(rows, { status: "Open" }).total).toBe(1);
  expect(pageOfferRows(rows, { pageSize: 1, page: 2 }).items.map((row) => row.id)).toEqual(["A:v1"]);
});
