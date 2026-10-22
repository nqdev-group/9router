// Optimistic-concurrency contract on updateCombo() added for
// packages/combo-auto-reorder (plans/2026-09-23-combo-auto-reorder-planning.md): a
// caller that read a combo, computed a new `models` array, then finds the row changed
// underneath it (e.g. a manual edit on the combos UI raced the sweep) must get a
// ComboUpdateConflictError instead of silently overwriting the concurrent change.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

let tempDir;
const originalDataDir = process.env.DATA_DIR;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "9router-combosrepo-"));
  process.env.DATA_DIR = tempDir;
  delete global._dbAdapter;
  // driver.js captures `global._dbAdapter` into a module-scoped `const state` at
  // import time — resetting modules forces a fresh capture against the deleted
  // global instead of reusing the previous test's (now-closed) adapter reference.
  vi.resetModules();
});

afterEach(() => {
  try { global._dbAdapter?.instance?.close?.(); } catch {}
  delete global._dbAdapter;
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  if (originalDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = originalDataDir;
});

describe("combosRepo.updateCombo — optimistic concurrency", () => {
  it("still works with no options (backward compatible with existing callers)", async () => {
    const { createCombo, updateCombo } = await import("@/lib/db/repos/combosRepo.js");
    const combo = await createCombo({ name: "test-combo", models: ["a/1", "b/2"] });

    const updated = await updateCombo(combo.id, { models: ["b/2", "a/1"] });

    expect(updated.models).toEqual(["b/2", "a/1"]);
  });

  it("succeeds when expectedUpdatedAt matches the row's current updatedAt", async () => {
    const { createCombo, updateCombo } = await import("@/lib/db/repos/combosRepo.js");
    const combo = await createCombo({ name: "test-combo", models: ["a/1", "b/2"] });

    const updated = await updateCombo(combo.id, { models: ["b/2", "a/1"] }, { expectedUpdatedAt: combo.updatedAt });

    expect(updated.models).toEqual(["b/2", "a/1"]);
  });

  it("throws ComboUpdateConflictError and leaves the row untouched when updatedAt has moved on", async () => {
    const { createCombo, updateCombo, getComboById, ComboUpdateConflictError } = await import("@/lib/db/repos/combosRepo.js");
    const combo = await createCombo({ name: "test-combo", models: ["a/1", "b/2"] });

    // Simulate a concurrent manual edit that lands first.
    await updateCombo(combo.id, { models: ["a/1", "b/2", "c/3"] });

    await expect(
      updateCombo(combo.id, { models: ["b/2", "a/1"] }, { expectedUpdatedAt: combo.updatedAt })
    ).rejects.toBeInstanceOf(ComboUpdateConflictError);

    const row = await getComboById(combo.id);
    expect(row.models).toEqual(["a/1", "b/2", "c/3"]);
  });
});
