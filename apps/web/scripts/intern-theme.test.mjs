import test from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import {
  DEFAULT_INTERN_DARK_PRESET, INTERN_DARK_PRESETS, INTERN_DARK_PRESET_ATTRIBUTE,
  INTERN_DARK_PRESET_KEY, INTERN_THEME_BOOTSTRAP, INTERN_THEME_KEY,
  isInternDarkPreset, readInternDarkPreset, readInternTheme,
  saveInternDarkPreset, saveInternTheme,
} from "@olentra/ui/theme/intern-theme.mjs";
import {
  ADMIN_DARK_PRESETS, ADMIN_DARK_PRESET_KEY, ADMIN_THEME_KEY,
  readAdminDarkPreset, readAdminTheme, saveAdminDarkPreset, saveAdminTheme,
} from "@olentra/ui/theme/workspace-theme.mjs";

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

test("admin and internship appearances share the same four dark designs and preference key", () => {
  assert.equal(INTERN_DARK_PRESET_KEY, "olentra.admin.dark-preset.v1");
  assert.equal(INTERN_DARK_PRESET_KEY, ADMIN_DARK_PRESET_KEY);
  assert.equal(INTERN_DARK_PRESETS, ADMIN_DARK_PRESETS);
  assert.equal(DEFAULT_INTERN_DARK_PRESET, "obsidian-blue");
  assert.equal(INTERN_DARK_PRESET_ATTRIBUTE, "data-intern-dark-preset");
  assert.deepEqual(INTERN_DARK_PRESETS.map(preset => preset.id), ["obsidian-blue", "carbon-silver", "black-emerald", "night-sky"]);
});

test("a dark design selected in either workspace is restored by the other", () => {
  const saved = storage();
  for (const { id } of INTERN_DARK_PRESETS) {
    assert.equal(isInternDarkPreset(id), true);
    assert.deepEqual(saveAdminDarkPreset(saved, id), { ok: true, persisted: true });
    assert.equal(readInternDarkPreset(saved), id);
    assert.deepEqual(saveInternDarkPreset(saved, id), { ok: true, persisted: true });
    assert.equal(readAdminDarkPreset(saved), id);
    assert.equal(saved.data.size, 1);
  }
});

test("shared dark designs preserve independent modes, workspace data, and public preferences", () => {
  const saved = storage({
    [ADMIN_THEME_KEY]: "light", [INTERN_THEME_KEY]: "dark",
    "olentra.admin.database.v2": '{"saved":"workspace"}', "public-theme": "dark",
  });
  saveInternDarkPreset(saved, "carbon-silver");
  assert.equal(readAdminTheme(saved), "light");
  assert.equal(readInternTheme(saved), "dark");
  saveInternTheme(saved, "light");
  saveAdminTheme(saved, "dark");
  assert.equal(readInternDarkPreset(saved), "carbon-silver");
  assert.equal(readAdminDarkPreset(saved), "carbon-silver");
  assert.deepEqual(Object.fromEntries(saved.data), {
    [ADMIN_THEME_KEY]: "dark", [INTERN_THEME_KEY]: "light",
    "olentra.admin.database.v2": '{"saved":"workspace"}', "public-theme": "dark",
    [INTERN_DARK_PRESET_KEY]: "carbon-silver",
  });
});

test("missing or invalid shared designs default to Obsidian Blue without overwriting a valid choice", () => {
  assert.equal(readInternDarkPreset(storage()), "obsidian-blue");
  assert.equal(readInternDarkPreset(undefined), "obsidian-blue");
  for (const invalid of [undefined, null, "", "dark", "light", "system", "CARBON-SILVER", 'night-sky\";alert(1)//', {}]) {
    assert.equal(isInternDarkPreset(invalid), false);
    assert.equal(readInternDarkPreset(storage({ [INTERN_DARK_PRESET_KEY]: invalid })), "obsidian-blue");
    const saved = storage({ [INTERN_DARK_PRESET_KEY]: "night-sky" });
    const result = saveInternDarkPreset(saved, invalid);
    assert.equal(result.ok, false);
    assert.equal(result.persisted, false);
    assert.equal(saved.data.get(INTERN_DARK_PRESET_KEY), "night-sky");
  }
});

test("unavailable shared design storage falls back safely and reports in-memory changes", () => {
  const unavailable = { getItem() { throw new Error("Blocked"); }, setItem() { throw new Error("Quota"); } };
  assert.equal(readInternDarkPreset(unavailable), "obsidian-blue");
  const failed = saveInternDarkPreset(unavailable, "black-emerald");
  assert.equal(failed.ok, true);
  assert.equal(failed.persisted, false);
  assert.match(failed.error, /this visit/i);
  assert.equal(saveInternDarkPreset(undefined, "night-sky").persisted, false);
});

test("pre-paint bootstrap uses validated preference without changing global public-theme attributes", () => {
  for (const saved of ["dark", "light", null, "system", 'dark\";alert(1)//']) {
    const attributes = new Map([["class", "public-dark"], ["data-theme", "public-theme"]]);
    const localStorage = storage(saved == null ? {} : { [INTERN_THEME_KEY]: saved });
    runInNewContext(INTERN_THEME_BOOTSTRAP, { localStorage, document: { documentElement: { setAttribute: (key, value) => attributes.set(key, value) } } });
    assert.equal(attributes.get("data-intern-theme"), saved === "dark" ? "dark" : "light");
    assert.equal(attributes.get(INTERN_DARK_PRESET_ATTRIBUTE), "obsidian-blue");
    assert.equal(attributes.get("class"), "public-dark");
    assert.equal(attributes.get("data-theme"), "public-theme");
  }
});

test("pre-paint bootstrap still initializes light mode when storage access throws", () => {
  const attributes = new Map();
  runInNewContext(INTERN_THEME_BOOTSTRAP, {
    localStorage: { getItem() { throw new Error("Storage denied"); } },
    document: { documentElement: { setAttribute: (key, value) => attributes.set(key, value) } },
  });
  assert.deepEqual(Object.fromEntries(attributes), { "data-intern-theme": "light", "data-intern-dark-preset": "obsidian-blue" });
});

test("intern pre-paint restoration applies every shared design without touching the admin appearance", () => {
  for (const { id } of INTERN_DARK_PRESETS) {
    for (const mode of ["dark", "light", "system"]) {
      const original = { "data-admin-theme": "light", "data-admin-dark-preset": "untouched-admin", class: "public-dark" };
      const attributes = new Map(Object.entries(original));
      runInNewContext(INTERN_THEME_BOOTSTRAP, {
        localStorage: storage({ [INTERN_THEME_KEY]: mode, [INTERN_DARK_PRESET_KEY]: id, [ADMIN_THEME_KEY]: "dark" }),
        document: { documentElement: { setAttribute: (key, value) => attributes.set(key, value) } },
      });
      assert.deepEqual(Object.fromEntries(attributes), {
        ...original, "data-intern-theme": mode === "dark" ? "dark" : "light", "data-intern-dark-preset": id,
      });
    }
  }
});

test("intern pre-paint restoration isolates invalid values and per-key storage failures", () => {
  for (const invalid of ["", "system", "CARBON-SILVER", 'black-emerald\";alert(1)//']) {
    const attributes = new Map();
    runInNewContext(INTERN_THEME_BOOTSTRAP, {
      localStorage: storage({ [INTERN_THEME_KEY]: "dark", [INTERN_DARK_PRESET_KEY]: invalid }),
      document: { documentElement: { setAttribute: (key, value) => attributes.set(key, value) } },
    });
    assert.equal(attributes.get("data-intern-theme"), "dark");
    assert.equal(attributes.get(INTERN_DARK_PRESET_ATTRIBUTE), "obsidian-blue");
  }
  for (const blockedKey of [INTERN_THEME_KEY, INTERN_DARK_PRESET_KEY]) {
    const attributes = new Map();
    runInNewContext(INTERN_THEME_BOOTSTRAP, {
      localStorage: {
        getItem(key) {
          if (key === blockedKey) throw new Error("This preference is unavailable");
          return key === INTERN_THEME_KEY ? "dark" : "carbon-silver";
        },
      },
      document: { documentElement: { setAttribute: (key, value) => attributes.set(key, value) } },
    });
    assert.equal(attributes.get("data-intern-theme"), blockedKey === INTERN_THEME_KEY ? "light" : "dark");
    assert.equal(attributes.get(INTERN_DARK_PRESET_ATTRIBUTE), blockedKey === INTERN_DARK_PRESET_KEY ? "obsidian-blue" : "carbon-silver");
  }
});
