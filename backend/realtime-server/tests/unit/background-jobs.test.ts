import { expect, test } from "bun:test";
import { backgroundJobsEnabled, siteOriginProblem } from "../../src/config/env";

test("background jobs run on production servers only, unless explicitly switched", () => {
  expect(backgroundJobsEnabled({ NODE_ENV: "production" } as any)).toBe(true);
  expect(backgroundJobsEnabled({} as any)).toBe(false);
  expect(backgroundJobsEnabled({ NODE_ENV: "development" } as any)).toBe(false);
  expect(backgroundJobsEnabled({ REALTIME_BACKGROUND_JOBS: "on" } as any)).toBe(true);
  expect(backgroundJobsEnabled({ NODE_ENV: "production", REALTIME_BACKGROUND_JOBS: "off" } as any)).toBe(false);
  expect(backgroundJobsEnabled({ NODE_ENV: "production", REALTIME_BACKGROUND_JOBS: "maybe" } as any)).toBe(true);
});

test("a production server reports a localhost site origin", () => {
  expect(siteOriginProblem("http://localhost:3000", { NODE_ENV: "production" } as any)).toContain("only work on this machine");
  expect(siteOriginProblem("http://127.0.0.1:3000", { NODE_ENV: "production" } as any)).not.toBeNull();
  expect(siteOriginProblem("https://www.olentratechnologies.com", { NODE_ENV: "production" } as any)).toBeNull();
  expect(siteOriginProblem("http://localhost:3000", {} as any)).toBeNull();
  expect(siteOriginProblem("not a url", { NODE_ENV: "production" } as any)).toContain("not a valid URL");
});
