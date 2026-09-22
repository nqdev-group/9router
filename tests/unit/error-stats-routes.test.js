// Route-level acceptance for the error-stats feature
// (plans/2026-09-22-provider-model-error-stats-planning.md): the 2 chart endpoints
// plus the reverse-lookup/bulk-remove combo actions, exercised through the actual
// exported route handlers (not just the underlying repo functions).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

let tempDir;
const originalDataDir = process.env.DATA_DIR;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "9router-errorstats-"));
  process.env.DATA_DIR = tempDir;
  delete global._dbAdapter;
  delete global._errorLogDbAdapter;
  vi.resetModules();
});

afterEach(() => {
  try { global._dbAdapter?.instance?.close?.(); } catch {}
  try { global._errorLogDbAdapter?.instance?.close?.(); } catch {}
  delete global._dbAdapter;
  delete global._errorLogDbAdapter;
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  if (originalDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = originalDataDir;
});

describe("GET /api/error-stats/accounts", () => {
  it("returns chart-ready data from the error-log DB", async () => {
    const { logAccountError } = await import("@/lib/errorLogDb/errorLogRepo.js");
    await logAccountError({ provider: "kiro", connectionId: "conn-1", model: "kiro-mini", errorCode: 401 });

    const { GET } = await import("@/app/api/error-stats/accounts/route.js");
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.series.some((s) => s.key.startsWith("kiro::"))).toBe(true);
  });
});

describe("GET /api/error-stats/models", () => {
  it("returns chart data plus the failingModels list", async () => {
    const { logModelError } = await import("@/lib/errorLogDb/errorLogRepo.js");
    await logModelError({ provider: "opencode", model: "deepseek-v4-flash-free", comboName: "9r-combo-opencode", errorCode: 400 });

    const { GET } = await import("@/app/api/error-stats/models/route.js");
    const res = await GET();
    const json = await res.json();
    expect(json.failingModels[0]).toMatchObject({ provider: "opencode", model: "deepseek-v4-flash-free", comboName: "9r-combo-opencode" });
  });
});

describe("GET /api/combos/using-model", () => {
  it("finds combos declaring the given model, ignores combos that don't", async () => {
    const { createCombo } = await import("@/lib/localDb");
    await createCombo({ name: "combo-a", models: ["opencode/deepseek-v4-flash-free", "kiro/kiro-mini"] });
    await createCombo({ name: "combo-b", models: ["kiro/kiro-mini"] });

    const { GET } = await import("@/app/api/combos/using-model/route.js");
    const req = new Request("http://localhost/api/combos/using-model?model=opencode%2Fdeepseek-v4-flash-free");
    const res = await GET(req);
    const json = await res.json();
    expect(json.combos.map((c) => c.name)).toEqual(["combo-a"]);
  });

  it("400s when the model query param is missing", async () => {
    const { GET } = await import("@/app/api/combos/using-model/route.js");
    const res = await GET(new Request("http://localhost/api/combos/using-model"));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/combos/remove-model", () => {
  it("removes the model from every combo that declares it and clears its cooldown", async () => {
    const { createCombo, getComboByName } = await import("@/lib/localDb");
    const { markComboModelFailed, isComboModelSkipped } = await import("@9router/model-combo-cooldown");
    await createCombo({ name: "combo-a", models: ["opencode/deepseek-v4-flash-free", "kiro/kiro-mini"] });
    await createCombo({ name: "combo-b", models: ["kiro/kiro-mini"] });
    markComboModelFailed("combo-a", "opencode/deepseek-v4-flash-free");
    expect(isComboModelSkipped("combo-a", "opencode/deepseek-v4-flash-free")).toBe(true);

    const { POST } = await import("@/app/api/combos/remove-model/route.js");
    const req = new Request("http://localhost/api/combos/remove-model", {
      method: "POST",
      body: JSON.stringify({ model: "opencode/deepseek-v4-flash-free" }),
    });
    const res = await POST(req);
    const json = await res.json();
    expect(json.removedFrom).toEqual(["combo-a"]);

    const comboA = await getComboByName("combo-a");
    expect(comboA.models).toEqual(["kiro/kiro-mini"]);
    const comboB = await getComboByName("combo-b");
    expect(comboB.models).toEqual(["kiro/kiro-mini"]); // unaffected — didn't declare the model

    expect(isComboModelSkipped("combo-a", "opencode/deepseek-v4-flash-free")).toBe(false);
  });

  it("400s when model is missing from the body", async () => {
    const { POST } = await import("@/app/api/combos/remove-model/route.js");
    const res = await POST(new Request("http://localhost/api/combos/remove-model", { method: "POST", body: JSON.stringify({}) }));
    expect(res.status).toBe(400);
  });
});
