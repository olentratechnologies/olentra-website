import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("both production apps leave shared remote feature storage selectable", () => {
  for (const app of ["web", "admin"]) {
    const config = fileURLToPath(new URL(`../../../apps/${app}/next.config.js`, import.meta.url));
    for (const mode of ["production", "development"]) {
      const env = { ...process.env, NODE_ENV: mode };
      delete env.OLENTRA_FEATURE_STORE_PATH;
      const result = spawnSync(process.execPath, ["-e", "require(process.argv[1]); process.stdout.write(process.env.OLENTRA_FEATURE_STORE_PATH || '')", config], { env, encoding: "utf8" });
      assert.equal(result.status, 0, result.stderr);
      if (mode === "production") assert.equal(result.stdout, "");
      else assert.ok(result.stdout.endsWith("/.data/site-features.json"));
    }
    const explicit = spawnSync(process.execPath, ["-e", "require(process.argv[1]); process.stdout.write(process.env.OLENTRA_FEATURE_STORE_PATH)", config], { env: { ...process.env, NODE_ENV: "production", OLENTRA_FEATURE_STORE_PATH: "/explicit/features.json" }, encoding: "utf8" });
    assert.equal(explicit.stdout, "/explicit/features.json");
  }
});
