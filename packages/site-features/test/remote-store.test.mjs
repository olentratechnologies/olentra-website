import test from "node:test";
import assert from "node:assert/strict";
import seed from "../src/seed.json" with { type: "json" };

// Remote mode: no file path, a backend URL. fetch is replaced with a fake realtime server.
async function withRemote(run) {
  const previous = { path: process.env.OLENTRA_FEATURE_STORE_PATH, url: process.env.INTERNSHIP_BACKEND_URL, fetch: globalThis.fetch };
  delete process.env.OLENTRA_FEATURE_STORE_PATH;
  process.env.INTERNSHIP_BACKEND_URL = "https://realtime.example.test/";
  let stored = null, down = false;
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method || "GET", auth: init.headers?.Authorization });
    if (down) throw new Error("offline");
    if ((init.method || "GET") === "GET") return Response.json({ ok: true, data: stored });
    const body = JSON.parse(init.body);
    if ((stored?.revision ?? 0) !== body.expectedRevision) return Response.json({ ok: false, error: { message: "changed" } }, { status: 409 });
    stored = body.state;
    return Response.json({ ok: true, data: stored });
  };
  try {
    const store = await import(`../src/server/store.mjs?remote=${Math.random()}`);
    await run({ store, calls, get stored() { return stored; }, setDown: value => { down = value; } });
  } finally {
    globalThis.fetch = previous.fetch;
    if (previous.path === undefined) delete process.env.OLENTRA_FEATURE_STORE_PATH; else process.env.OLENTRA_FEATURE_STORE_PATH = previous.path;
    if (previous.url === undefined) delete process.env.INTERNSHIP_BACKEND_URL; else process.env.INTERNSHIP_BACKEND_URL = previous.url;
  }
}

test("with a backend URL, switches are saved to and read from the realtime server, never a file", async () => {
  await withRemote(async (ctx) => {
    const { store, calls } = ctx;
    assert.deepEqual(await store.readSiteFeatures(), seed);
    const feature = Object.keys(seed.environments.Production)[0];
    const current = seed.environments.Production[feature];
    const result = await store.setSiteFeature({ feature, enabled: !current, actor: "admin@example.test", token: "staff-token" });
    assert.equal(result.environments.Production[feature], !current);
    assert.equal(ctx.stored.revision, seed.revision + 1);
    const put = calls.find((call) => call.method === "PUT");
    assert.equal(put.url, "https://realtime.example.test/intern/site-features");
    assert.equal(put.auth, "Bearer staff-token");
  });
});

test("if the realtime server is unreachable, the website keeps the last known switches", async () => {
  await withRemote(async (ctx) => {
    const { store } = ctx;
    const feature = Object.keys(seed.environments.Production)[0];
    await store.setSiteFeature({ feature, enabled: !seed.environments.Production[feature], token: "t" });
    ctx.setDown(true);
    await new Promise((resolve) => setTimeout(resolve, 3100));
    const state = await store.readSiteFeatures();
    assert.equal(state.environments.Production[feature], !seed.environments.Production[feature]);
    await assert.rejects(store.setSiteFeature({ feature, enabled: seed.environments.Production[feature], token: "t" }), /temporarily unavailable/);
  });
});
