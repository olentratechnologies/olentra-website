import { expect, test } from "bun:test";
import { isOfferExpired, offerDeadline } from "../../src/modules/lifecycle/lifecycle.service";

test("offers close at 11:59 PM IST, the given number of calendar days after they're sent", () => {
  const deadline = offerDeadline("2026-11-01T10:00:00.000Z", 7); // sent 1 Nov, 3:30 PM IST
  expect(deadline).toBe("2026-11-08T18:29:59.000Z");               // 8 Nov, 11:59:59 PM IST
  expect(offerDeadline("2026-11-01T20:00:00.000Z", 1)).toBe("2026-11-03T18:29:59.000Z"); // sent 2 Nov, 1:30 AM IST
  expect(isOfferExpired({ expiresOn: deadline }, "2026-11-08T18:29:58.000Z")).toBe(false);
  expect(isOfferExpired({ expiresOn: deadline }, "2026-11-08T18:30:00.000Z")).toBe(true);
  expect(isOfferExpired({}, "2030-01-01T00:00:00.000Z")).toBe(false); // older offers had no deadline
});
