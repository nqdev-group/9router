import { getAdapter } from "../driver.js";
import { parseJson, stringifyJson } from "../helpers/jsonCol.js";
import { makeKv } from "../helpers/kvStore.js";

const pricingKv = makeKv("pricing");
const modelsDevKv = makeKv("modelsDevPricing");
const CACHE_TTL_MS = 5000;

let cache = { value: null, expiresAt: 0 };

function invalidate() {
  cache = { value: null, expiresAt: 0 };
}

async function getUserPricing() {
  return await pricingKv.getAll();
}

async function getModelsDevPricingForModel(provider, model) {
  try {
    const { getSettings } = await import("../repos/settingsRepo.js");
    const settings = await getSettings();
    if (!settings.modelsDevEnabled || !settings.modelsDevPreferPrices) return null;

    const snapshot = await modelsDevKv.get("snapshot");
    if (!snapshot?.providers) return null;

    const providerData = snapshot.providers[provider];
    if (!providerData?.models) return null;

    const baseModel = model.includes("/") ? model.split("/").pop() : model;
    return providerData.models[model] || providerData.models[baseModel] || null;
  } catch {
    return null;
  }
}

export async function getPricing() {
  const now = Date.now();
  if (cache.value && cache.expiresAt > now) return cache.value;

  const userPricing = await getUserPricing();
  const { PROVIDER_PRICING } = await import("@/shared/constants/pricing.js");
  const merged = {};

  for (const [provider, models] of Object.entries(PROVIDER_PRICING)) {
    merged[provider] = { ...models };
    if (userPricing[provider]) {
      for (const [model, pricing] of Object.entries(userPricing[provider])) {
        merged[provider][model] = merged[provider][model]
          ? { ...merged[provider][model], ...pricing }
          : pricing;
      }
    }
  }

  for (const [provider, models] of Object.entries(userPricing)) {
    if (!merged[provider]) {
      merged[provider] = { ...models };
    } else {
      for (const [model, pricing] of Object.entries(models)) {
        if (!merged[provider][model]) merged[provider][model] = pricing;
      }
    }
  }

  // Merge models.dev pricing when preferPrices enabled
  try {
    const { getSettings } = await import("../repos/settingsRepo.js");
    const settings = await getSettings();
    if (settings.modelsDevEnabled && settings.modelsDevPreferPrices) {
      const snapshot = await modelsDevKv.get("snapshot");
      if (snapshot?.providers) {
        for (const [pid, pdata] of Object.entries(snapshot.providers)) {
          if (!pdata?.models) continue;
          if (!merged[pid]) merged[pid] = {};
          for (const [mid, cost] of Object.entries(pdata.models)) {
            if (!merged[pid][mid] && cost.input != null) {
              merged[pid][mid] = {
                input: cost.input,
                output: cost.output,
                cached: cost.cache_read,
                cache_creation: cost.cache_write,
                reasoning: cost.reasoning,
                _source: "models.dev",
              };
            }
          }
        }
      }
    }
  } catch {
    // ignore merge errors
  }

  cache = { value: merged, expiresAt: now + CACHE_TTL_MS };
  return merged;
}

export async function getPricingForModel(provider, model) {
  if (!model) return null;
  const userPricing = await getUserPricing();
  if (provider && userPricing[provider]?.[model]) return userPricing[provider][model];

  // Models.dev layer (only when preferPrices enabled)
  const modelsDevPrice = await getModelsDevPricingForModel(provider, model);
  if (modelsDevPrice) return modelsDevPrice;

  const { getPricingForModel: resolveConst } = await import("@/shared/constants/pricing.js");
  return resolveConst(provider, model);
}

// Atomic merge inside transaction (per-provider read-modify-write)
export async function updatePricing(pricingData) {
  const db = await getAdapter();
  db.transaction(() => {
    for (const [provider, models] of Object.entries(pricingData)) {
      const row = db.get(`SELECT value FROM kv WHERE scope = 'pricing' AND key = ?`, [provider]);
      const current = row ? (parseJson(row.value, {}) || {}) : {};
      const merged = { ...current };
      for (const [model, pricing] of Object.entries(models)) {
        merged[model] = pricing;
      }
      db.run(
        `INSERT INTO kv(scope, key, value) VALUES('pricing', ?, ?) ON CONFLICT(scope, key) DO UPDATE SET value = excluded.value`,
        [provider, stringifyJson(merged)]
      );
    }
  });
  invalidate();
  return await getUserPricing();
}

export async function resetPricing(provider, model) {
  if (!provider) return await getUserPricing();
  const db = await getAdapter();
  db.transaction(() => {
    if (!model) {
      db.run(`DELETE FROM kv WHERE scope = 'pricing' AND key = ?`, [provider]);
      return;
    }
    const row = db.get(`SELECT value FROM kv WHERE scope = 'pricing' AND key = ?`, [provider]);
    const current = row ? (parseJson(row.value, {}) || {}) : {};
    delete current[model];
    if (Object.keys(current).length === 0) {
      db.run(`DELETE FROM kv WHERE scope = 'pricing' AND key = ?`, [provider]);
    } else {
      db.run(
        `INSERT INTO kv(scope, key, value) VALUES('pricing', ?, ?) ON CONFLICT(scope, key) DO UPDATE SET value = excluded.value`,
        [provider, stringifyJson(current)]
      );
    }
  });
  invalidate();
  return await getUserPricing();
}

export async function resetAllPricing() {
  await pricingKv.clear();
  invalidate();
  return {};
}
