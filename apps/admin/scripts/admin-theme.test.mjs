import test from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import {
  ADMIN_DARK_PRESETS, ADMIN_DARK_PRESET_KEY, ADMIN_THEME_BOOTSTRAP, ADMIN_THEME_KEY,
  DEFAULT_ADMIN_DARK_PRESET, isAdminDarkPreset, readAdminDarkPreset, readAdminTheme,
  saveAdminDarkPreset, saveAdminTheme,
} from "@olentra/ui/theme/workspace-theme.mjs";

function storage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return { data, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
}

test("dashboard starts in light mode and restores an explicit saved preference", () => {
  const saved = storage();
  assert.equal(readAdminTheme(saved), "light");
  assert.deepEqual(saveAdminTheme(saved, "dark"), { ok: true, persisted: true });
  assert.equal(readAdminTheme(saved), "dark");
  assert.deepEqual(saveAdminTheme(saved, "light"), { ok: true, persisted: true });
  assert.equal(readAdminTheme(saved), "light");
});

test("appearance persistence does not overwrite the workspace database or unrelated preferences", () => {
  const saved = storage({ "olentra.admin.database.v2": '{"saved":"workspace"}', "public-theme": "dark" });
  saveAdminTheme(saved, "dark");
  assert.equal(saved.data.get("olentra.admin.database.v2"), '{"saved":"workspace"}');
  assert.equal(saved.data.get("public-theme"), "dark");
  assert.equal(saved.data.get(ADMIN_THEME_KEY), "dark");
  assert.equal(saved.data.size, 3);
});

test("invalid saved values fall back to light and invalid writes leave stored choices intact", () => {
  const saved = storage({ [ADMIN_THEME_KEY]: "<script>dark</script>" });
  assert.equal(readAdminTheme(saved), "light");
  saved.setItem(ADMIN_THEME_KEY, "dark");
  for (const invalid of [null, undefined, "", "system", "LIGHT", {}]) {
    assert.equal(saveAdminTheme(saved, invalid).ok, false);
    assert.equal(saved.data.get(ADMIN_THEME_KEY), "dark");
  }
});

test("unavailable browser storage preserves usable controls and reports persistence failure", () => {
  const unavailable = { getItem() { throw new Error("Blocked"); }, setItem() { throw new Error("Quota"); } };
  assert.equal(readAdminTheme(unavailable), "light");
  const failed = saveAdminTheme(unavailable, "dark");
  assert.equal(failed.ok, true);
  assert.equal(failed.persisted, false);
  assert.match(failed.error, /this visit/i);
  assert.equal(saveAdminTheme(undefined, "light").persisted, false);
});

test("dark design choices have stable identifiers, labels, and immutable metadata", () => {
  assert.deepEqual(ADMIN_DARK_PRESETS.map(({ id, label }) => [id, label]), [
    ["obsidian-blue", "Obsidian Blue"],
    ["carbon-silver", "Carbon Silver"],
    ["black-emerald", "Black Emerald"],
    ["night-sky", "Original Night Sky"],
  ]);
  assert.ok(Object.isFrozen(ADMIN_DARK_PRESETS));
  for (const preset of ADMIN_DARK_PRESETS) {
    assert.ok(Object.isFrozen(preset));
    assert.equal(typeof preset.description, "string");
    assert.ok(preset.description.trim());
  }
});

test("all four dark designs can be saved and restored without changing light or dark mode", () => {
  const saved = storage({ [ADMIN_THEME_KEY]: "light" });
  for (const { id } of ADMIN_DARK_PRESETS) {
    assert.equal(isAdminDarkPreset(id), true);
    assert.deepEqual(saveAdminDarkPreset(saved, id), { ok: true, persisted: true });
    assert.equal(readAdminDarkPreset(saved), id);
    assert.equal(saved.data.get(ADMIN_THEME_KEY), "light");
    saveAdminTheme(saved, "dark");
    assert.equal(readAdminDarkPreset(saved), id);
    saveAdminTheme(saved, "light");
    assert.equal(readAdminDarkPreset(saved), id);
  }
});

test("dark design persistence preserves workspace data, mode, and unrelated preferences", () => {
  const original = {
    [ADMIN_THEME_KEY]: "dark",
    "olentra.admin.database.v2": '{"saved":"workspace"}',
    "olentra.intern.theme.v1": "light",
    "public-theme": "dark",
  };
  const saved = storage(original);
  saveAdminDarkPreset(saved, "carbon-silver");
  assert.deepEqual(Object.fromEntries(saved.data), { ...original, [ADMIN_DARK_PRESET_KEY]: "carbon-silver" });
});

test("missing and invalid dark designs default to Obsidian Blue without overwriting saved choices", () => {
  assert.equal(DEFAULT_ADMIN_DARK_PRESET, "obsidian-blue");
  assert.equal(readAdminDarkPreset(storage()), "obsidian-blue");
  assert.equal(readAdminDarkPreset(undefined), "obsidian-blue");
  for (const invalid of [null, undefined, "", "dark", "light", "system", "CARBON-SILVER", 'carbon-silver\";alert(1)//', {}]) {
    assert.equal(isAdminDarkPreset(invalid), false);
    assert.equal(readAdminDarkPreset(storage({ [ADMIN_DARK_PRESET_KEY]: invalid })), "obsidian-blue");
    const saved = storage({ [ADMIN_DARK_PRESET_KEY]: "night-sky" });
    const result = saveAdminDarkPreset(saved, invalid);
    assert.equal(result.ok, false);
    assert.equal(result.persisted, false);
    assert.equal(saved.data.get(ADMIN_DARK_PRESET_KEY), "night-sky");
  }
});

test("blocked storage keeps dark design choices usable for the current visit", () => {
  const unavailable = { getItem() { throw new Error("Blocked"); }, setItem() { throw new Error("Quota"); } };
  assert.equal(readAdminDarkPreset(unavailable), "obsidian-blue");
  const result = saveAdminDarkPreset(unavailable, "black-emerald");
  assert.equal(result.ok, true);
  assert.equal(result.persisted, false);
  assert.match(result.error, /this visit/i);
  assert.equal(saveAdminDarkPreset(undefined, "night-sky").persisted, false);
});

test("pre-paint bootstrap uses validated preference without changing global public-theme attributes", () => {
  for (const saved of ["dark", "light", null, "system", 'dark\";alert(1)//']) {
    const attributes = new Map([["class", "public-dark"], ["data-theme", "public-theme"]]);
    const localStorage = storage(saved == null ? {} : { [ADMIN_THEME_KEY]: saved });
    runInNewContext(ADMIN_THEME_BOOTSTRAP, { localStorage, document: { documentElement: { setAttribute: (key, value) => attributes.set(key, value) } } });
    assert.equal(attributes.get("data-admin-theme"), saved === "dark" ? "dark" : "light");
    assert.equal(attributes.get("data-admin-dark-preset"), "obsidian-blue");
    assert.equal(attributes.get("class"), "public-dark");
    assert.equal(attributes.get("data-theme"), "public-theme");
  }
});

test("pre-paint bootstrap still initializes light mode when storage access throws", () => {
  const attributes = new Map();
  runInNewContext(ADMIN_THEME_BOOTSTRAP, {
    localStorage: { getItem() { throw new Error("Storage denied"); } },
    document: { documentElement: { setAttribute: (key, value) => attributes.set(key, value) } },
  });
  assert.deepEqual(Object.fromEntries(attributes), { "data-admin-theme": "light", "data-admin-dark-preset": "obsidian-blue" });
});

test("pre-paint bootstrap restores every dark design independently from mode", () => {
  for (const { id } of ADMIN_DARK_PRESETS) {
    for (const mode of ["light", "dark", "system"]) {
      const attributes = new Map();
      runInNewContext(ADMIN_THEME_BOOTSTRAP, {
        localStorage: storage({ [ADMIN_THEME_KEY]: mode, [ADMIN_DARK_PRESET_KEY]: id }),
        document: { documentElement: { setAttribute: (key, value) => attributes.set(key, value) } },
      });
      assert.equal(attributes.get("data-admin-theme"), mode === "dark" ? "dark" : "light");
      assert.equal(attributes.get("data-admin-dark-preset"), id);
    }
  }
});

test("pre-paint bootstrap validates preset values and isolates storage failures between preferences", () => {
  for (const invalid of ["", "dark", "CARBON-SILVER", 'night-sky\";alert(1)//']) {
    const attributes = new Map();
    runInNewContext(ADMIN_THEME_BOOTSTRAP, {
      localStorage: storage({ [ADMIN_THEME_KEY]: "dark", [ADMIN_DARK_PRESET_KEY]: invalid }),
      document: { documentElement: { setAttribute: (key, value) => attributes.set(key, value) } },
    });
    assert.equal(attributes.get("data-admin-theme"), "dark");
    assert.equal(attributes.get("data-admin-dark-preset"), "obsidian-blue");
  }
  for (const blockedKey of [ADMIN_THEME_KEY, ADMIN_DARK_PRESET_KEY]) {
    const attributes = new Map();
    runInNewContext(ADMIN_THEME_BOOTSTRAP, {
      localStorage: {
        getItem(key) {
          if (key === blockedKey) throw new Error("This preference is unavailable");
          return key === ADMIN_THEME_KEY ? "dark" : "carbon-silver";
        },
      },
      document: { documentElement: { setAttribute: (key, value) => attributes.set(key, value) } },
    });
    assert.equal(attributes.get("data-admin-theme"), blockedKey === ADMIN_THEME_KEY ? "light" : "dark");
    assert.equal(attributes.get("data-admin-dark-preset"), blockedKey === ADMIN_DARK_PRESET_KEY ? "obsidian-blue" : "carbon-silver");
  }
});
