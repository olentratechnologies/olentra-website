import { expect, test } from "bun:test";
import { createContactApp } from "../../src/app/create-app";

test("contact HTTP contract exposes the health route and preserves its response", async () => {
  const app = createContactApp({ port: 0, host: "127.0.0.1" });
  const response = await app.handle(new Request("http://localhost/health"));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ ok: true });
});
