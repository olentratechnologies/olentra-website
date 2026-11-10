import test from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import { INTERN_THEME_BOOTSTRAP, INTERN_THEME_KEY, readInternTheme, saveInternTheme } from "../src/lib/intern/theme.mjs";

function storage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return { data, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
}

test("internship dashboards start in light mode and restores an explicit saved preference", () => {
  const saved = storage();
  assert.equal(readInternTheme(saved), "light");
  assert.deepEqual(saveInternTheme(saved, "dark"), { ok: true, persisted: true });
  assert.equal(readInternTheme(saved), "dark");
  assert.deepEqual(saveInternTheme(saved, "light"), { ok: true, persisted: true });
  assert.equal(readInternTheme(saved), "light");
});

test("appearance persistence does not overwrite the workspace database or unrelated preferences", () => {
  const saved = storage({ "olentra.admin.database.v2": '{"saved":"workspace"}', "public-theme": "dark" });
  saveInternTheme(saved, "dark");
  assert.equal(saved.data.get("olentra.admin.database.v2"), '{"saved":"workspace"}');
  assert.equal(saved.data.get("public-theme"), "dark");
  assert.equal(saved.data.get(INTERN_THEME_KEY), "dark");
  assert.equal(saved.data.size, 3);
});

test("invalid saved values fall back to light and invalid writes leave stored choices intact", () => {
  const saved = storage({ [INTERN_THEME_KEY]: "<script>dark</script>" });
  assert.equal(readInternTheme(saved), "light");
  saved.setItem(INTERN_THEME_KEY, "dark");
  for (const invalid of [null, undefined, "", "system", "LIGHT", {}]) {
    assert.equal(saveInternTheme(saved, invalid).ok, false);
    assert.equal(saved.data.get(INTERN_THEME_KEY), "dark");
  }
});

test("unavailable browser storage preserves usable controls and reports persistence failure", () => {
  const unavailable = { getItem() { throw new Error("Blocked"); }, setItem() { throw new Error("Quota"); } };
  assert.equal(readInternTheme(unavailable), "light");
  const failed = saveInternTheme(unavailable, "dark");
  assert.equal(failed.ok, true);
  assert.equal(failed.persisted, false);
  assert.match(failed.error, /this visit/i);
  assert.equal(saveInternTheme(undefined, "light").persisted, false);
});

test("pre-paint bootstrap uses validated preference without changing global public-theme attributes", () => {
  for (const saved of ["dark", "light", null, "system", 'dark\";alert(1)//']) {
    const attributes = new Map([["class", "public-dark"], ["data-theme", "public-theme"]]);
    const localStorage = storage(saved == null ? {} : { [INTERN_THEME_KEY]: saved });
    runInNewContext(INTERN_THEME_BOOTSTRAP, { localStorage, document: { documentElement: { setAttribute: (key, value) => attributes.set(key, value) } } });
    assert.equal(attributes.get("data-intern-theme"), saved === "dark" ? "dark" : "light");
    assert.equal(attributes.get("class"), "public-dark");
    assert.equal(attributes.get("data-theme"), "public-theme");
  }
});

test("pre-paint bootstrap still initializes light mode when storage access throws", () => {
  let theme;
  runInNewContext(INTERN_THEME_BOOTSTRAP, {
    localStorage: { getItem() { throw new Error("Storage denied"); } },
    document: { documentElement: { setAttribute: (key, value) => { if (key === "data-intern-theme") theme = value; } } },
  });
  assert.equal(theme, "light");
});
