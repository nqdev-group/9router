import { getAdapter } from "../driver.js";
import { parseJson, stringifyJson } from "../helpers/jsonCol.js";
import { makeKv } from "../helpers/kvStore.js";

const limitsKv = makeKv("modelTokenLimits");
const CACHE_TTL_MS = 5000;

let cache = { value: null, expiresAt: 0 };

function invalidate() {
  cache = { value: null, expiresAt: 0 };
}

async function getUserLimits() {
  return await limitsKv.getAll();
}

/**
 * All user-configured max-input-token overrides, per provider/model.
 * Shape: { [providerAlias]: { [modelId]: number } }
 */
export async function getModelTokenLimits() {
  const now = Date.now();
  if (cache.value && cache.expiresAt > now) return cache.value;

  const value = await getUserLimits();
  cache = { value, expiresAt: now + CACHE_TTL_MS };
  return value;
}

/**
 * Resolve the max-input-token limit for one model: user override, else the
 * model's known contextWindow (open-sse/providers/capabilities.js already
 * covers 300+ models/patterns) — never null for a known model.
 * @param {string} provider
 * @param {string} model
 * @returns {Promise<number|null>}
 */
export async function getModelTokenLimitForModel(provider, model) {
  if (!model) return null;
  const userLimits = await getUserLimits();
  const override = provider && userLimits[provider]?.[model];
  if (typeof override === "number" && Number.isFinite(override)) return override;

  const { getCapabilitiesForModel } = await import("open-sse/providers/capabilities.js");
  const caps = getCapabilitiesForModel(provider, model);
  return typeof caps.contextWindow === "number" ? caps.contextWindow : null;
}

// Atomic merge inside transaction (per-provider read-modify-write), mirrors pricingRepo.js.
export async function updateModelTokenLimits(limitsData) {
  const db = await getAdapter();
  db.transaction(() => {
    for (const [provider, models] of Object.entries(limitsData)) {
      const row = db.get(`SELECT value FROM kv WHERE scope = 'modelTokenLimits' AND key = ?`, [provider]);
      const current = row ? (parseJson(row.value, {}) || {}) : {};
      const merged = { ...current };
      for (const [model, limit] of Object.entries(models)) {
        merged[model] = limit;
      }
      db.run(
        `INSERT INTO kv(scope, key, value) VALUES('modelTokenLimits', ?, ?) ON CONFLICT(scope, key) DO UPDATE SET value = excluded.value`,
        [provider, stringifyJson(merged)]
      );
    }
  });
  invalidate();
  return await getUserLimits();
}

export async function resetModelTokenLimit(provider, model) {
  if (!provider) return await getUserLimits();
  const db = await getAdapter();
  db.transaction(() => {
    if (!model) {
      db.run(`DELETE FROM kv WHERE scope = 'modelTokenLimits' AND key = ?`, [provider]);
      return;
    }
    const row = db.get(`SELECT value FROM kv WHERE scope = 'modelTokenLimits' AND key = ?`, [provider]);
    const current = row ? (parseJson(row.value, {}) || {}) : {};
    delete current[model];
    if (Object.keys(current).length === 0) {
      db.run(`DELETE FROM kv WHERE scope = 'modelTokenLimits' AND key = ?`, [provider]);
    } else {
      db.run(
        `INSERT INTO kv(scope, key, value) VALUES('modelTokenLimits', ?, ?) ON CONFLICT(scope, key) DO UPDATE SET value = excluded.value`,
        [provider, stringifyJson(current)]
      );
    }
  });
  invalidate();
  return await getUserLimits();
}

export async function resetAllModelTokenLimits() {
  await limitsKv.clear();
  invalidate();
  return {};
}
