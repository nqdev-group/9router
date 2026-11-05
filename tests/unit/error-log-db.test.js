// Verify the standalone error-log DB (src/lib/errorLogDb/) — separate file from
// the app DB (data.sqlite), per plans/2026-09-22-provider-model-error-stats-planning.md.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

let tempDir;
const originalDataDir = process.env.DATA_DIR;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "9router-errorlog-"));
  process.env.DATA_DIR = tempDir;
  delete global._errorLogDbAdapter;
  delete global._dbAdapter;
  vi.resetModules();
});

afterEach(() => {
  try { global._errorLogDbAdapter?.instance?.close?.(); } catch {}
  delete global._errorLogDbAdapter;
  delete global._dbAdapter;
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  if (originalDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = originalDataDir;
});

describe("errorLogDb — separate file from the app DB", () => {
  it("creates error-log.sqlite, distinct from data.sqlite", async () => {
    const { ERROR_LOG_DB_FILE } = await import("@/lib/errorLogDb/paths.js");
    const { DATA_FILE } = await import("@/lib/db/paths.js");
    expect(ERROR_LOG_DB_FILE).not.toBe(DATA_FILE);
    expect(path.dirname(ERROR_LOG_DB_FILE)).toBe(path.dirname(DATA_FILE));

    const { getErrorLogAdapter } = await import("@/lib/errorLogDb/driver.js");
    const db = await getErrorLogAdapter();
    expect(["better-sqlite3", "node:sqlite", "sql.js", "bun:sqlite"]).toContain(db.driver);
    expect(fs.existsSync(ERROR_LOG_DB_FILE)).toBe(true);
  });
});

describe("errorLogDb — account-level errors", () => {
  it("logAccountError is queryable via getAccountErrorFrequency, grouped by provider+connection", async () => {
    const { logAccountError, getAccountErrorFrequency } = await import("@/lib/errorLogDb/errorLogRepo.js");
    await logAccountError({ provider: "opencode", connectionId: "conn-1", model: "deepseek-v4-flash-free", errorCode: 400 });
    await logAccountError({ provider: "opencode", connectionId: "conn-1", model: "deepseek-v4-flash-free", errorCode: 400 });
    await logAccountError({ provider: "kiro", connectionId: "conn-2", model: "kiro-mini", errorCode: 401 });

    const rows = await getAccountErrorFrequency();
    const opencodeRow = rows.find((r) => r.provider === "opencode" && r.connectionId === "conn-1");
    const kiroRow = rows.find((r) => r.provider === "kiro" && r.connectionId === "conn-2");
    expect(opencodeRow.count).toBe(2);
    expect(kiroRow.count).toBe(1);
  });

  it("does not throw when the write fails (fail-open)", async () => {
    const { logAccountError } = await import("@/lib/errorLogDb/errorLogRepo.js");
    await expect(logAccountError({ provider: null, connectionId: undefined, model: undefined, errorCode: undefined })).resolves.not.toThrow();
  });
});

describe("errorLogDb — model-level errors (per-combo scope)", () => {
  it("logModelError is queryable via getModelErrorFrequency, grouped by provider+model+comboName", async () => {
    const { logModelError, getModelErrorFrequency } = await import("@/lib/errorLogDb/errorLogRepo.js");
    await logModelError({ provider: "opencode", model: "deepseek-v4-flash-free", comboName: "9r-combo-opencode", errorCode: 400 });
    await logModelError({ provider: "opencode", model: "deepseek-v4-flash-free", comboName: "9r-combo-opencode", errorCode: 400 });
    await logModelError({ provider: "opencode", model: "deepseek-v4-flash-free", comboName: "another-combo", errorCode: 400 });

    const rows = await getModelErrorFrequency();
    const mainCombo = rows.find((r) => r.comboName === "9r-combo-opencode");
    const otherCombo = rows.find((r) => r.comboName === "another-combo");
    expect(mainCombo.count).toBe(2);
    expect(otherCombo.count).toBe(1);
    // Same model, different combo → tracked separately (per-combo scope, decided 2026-09-22)
    expect(mainCombo.model).toBe(otherCombo.model);
  });

  it("getFailingModels aggregates across the retention window, most-failing first", async () => {
    const { logModelError, getFailingModels } = await import("@/lib/errorLogDb/errorLogRepo.js");
    await logModelError({ provider: "opencode", model: "deepseek-v4-flash-free", comboName: "9r-combo-opencode", errorCode: 400 });
    await logModelError({ provider: "opencode", model: "deepseek-v4-flash-free", comboName: "9r-combo-opencode", errorCode: 400 });
    await logModelError({ provider: "opencode", model: "nemotron-3-super-free", comboName: "9r-combo-opencode", errorCode: 401 });

    const rows = await getFailingModels();
    expect(rows[0].model).toBe("deepseek-v4-flash-free");
    expect(rows[0].count).toBe(2);
  });

  it("account-level rows do not leak into model-level queries and vice versa", async () => {
    const { logAccountError, logModelError, getAccountErrorFrequency, getModelErrorFrequency } = await import("@/lib/errorLogDb/errorLogRepo.js");
    await logAccountError({ provider: "kiro", connectionId: "conn-1", model: "kiro-mini", errorCode: 401 });
    await logModelError({ provider: "opencode", model: "deepseek-v4-flash-free", comboName: "9r-combo-opencode", errorCode: 400 });

    const accountRows = await getAccountErrorFrequency();
    const modelRows = await getModelErrorFrequency();
    expect(accountRows.every((r) => r.provider !== "opencode")).toBe(true);
    expect(modelRows.every((r) => r.provider !== "kiro")).toBe(true);
  });
});

describe("errorLogDb — chart-ready pivot", () => {
  it("getAccountErrorChartData aligns per-account counts to shared hourly buckets", async () => {
    const { logAccountError, getAccountErrorChartData } = await import("@/lib/errorLogDb/errorLogRepo.js");
    await logAccountError({ provider: "opencode", connectionId: "conn-1", model: "m", errorCode: 400 });
    await logAccountError({ provider: "kiro", connectionId: "conn-2", model: "m", errorCode: 401 });
    await logAccountError({ provider: "kiro", connectionId: "conn-2", model: "m", errorCode: 401 });

    const { buckets, series } = await getAccountErrorChartData();
    expect(buckets.length).toBeGreaterThan(0);
    for (const s of series) expect(s.counts.length).toBe(buckets.length);
    const kiroSeries = series.find((s) => s.key.startsWith("kiro::"));
    expect(kiroSeries.counts.reduce((a, b) => a + b, 0)).toBe(2);
  });

  it("caps chart series to the top offenders (MAX_CHART_SERIES)", async () => {
    const { logModelError, getModelErrorChartData } = await import("@/lib/errorLogDb/errorLogRepo.js");
    for (let i = 0; i < 12; i++) {
      await logModelError({ provider: "opencode", model: `model-${i}`, comboName: "combo-a", errorCode: 400 });
    }
    const { series } = await getModelErrorChartData();
    expect(series.length).toBeLessThanOrEqual(8);
  });
});

describe("errorLogDb — retention (7 days, decided 2026-09-22)", () => {
  it("cleanupOldErrorLogs deletes rows older than 7 days, keeps recent rows", async () => {
    const { getErrorLogAdapter } = await import("@/lib/errorLogDb/driver.js");
    const { cleanupOldErrorLogs, getModelErrorFrequency } = await import("@/lib/errorLogDb/errorLogRepo.js");

    const db = await getErrorLogAdapter();
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
    await db.run(
      `INSERT INTO error_log (provider, model, combo_name, error_code, created_at_epoch) VALUES (?, ?, ?, ?, ?)`,
      ["opencode", "old-dead-model", "9r-combo-opencode", "400", eightDaysAgo]
    );
    await db.run(
      `INSERT INTO error_log (provider, model, combo_name, error_code, created_at_epoch) VALUES (?, ?, ?, ?, ?)`,
      ["opencode", "recent-model", "9r-combo-opencode", "400", Date.now()]
    );

    await cleanupOldErrorLogs();

    const rows = await getModelErrorFrequency();
    expect(rows.some((r) => r.model === "old-dead-model")).toBe(false);
    expect(rows.some((r) => r.model === "recent-model")).toBe(true);
  });
});
