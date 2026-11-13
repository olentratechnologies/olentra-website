import { expect, test } from "bun:test";
import { isOfferExpired, offerDeadline } from "../../src/modules/lifecycle/lifecycle.service";

test("offers expire the given number of days after they're sent", () => {
  const deadline = offerDeadline("2026-11-01T10:00:00.000Z", 7);
  expect(deadline).toBe("2026-11-08T10:00:00.000Z");
  expect(isOfferExpired({ expiresOn: deadline }, "2026-11-08T09:59:59.000Z")).toBe(false);
  expect(isOfferExpired({ expiresOn: deadline }, "2026-11-08T10:00:01.000Z")).toBe(true);
  expect(isOfferExpired({}, "2030-01-01T00:00:00.000Z")).toBe(false); // older offers had no deadline
});
