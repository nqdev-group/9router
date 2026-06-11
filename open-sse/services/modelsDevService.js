import {
  MODELS_DEV_CATALOG_URL,
  MODELS_DEV_FETCH_TIMEOUT_MS,
} from "@/shared/constants/modelsDevDefaults.js";
import {
  getSnapshot,
  saveSnapshot,
  getModelMap,
  saveModelMap,
  clearAll,
  getManualMap,
  saveManualMap,
} from "@/lib/db/repos/modelsDevPricingRepo.js";
import { PROVIDERS } from "../config/providers.js";

const OAUTH_ALIASES = {
  claude: "cc",
  codex: "cx",
  "gemini-cli": "gc",
  qwen: "qw",
  iflow: "if",
  antigravity: "ag",
  github: "gh",
  kiro: "kr",
  cursor: "cu",
  "kimi-coding": "kmc",
  kilocode: "kc",
  cline: "cl",
  opencode: "oc",
  qoder: "qd",
};

function buildProviderIdToAlias() {
  const map = {};
  for (const id of Object.keys(PROVIDERS)) {
    map[id] = OAUTH_ALIASES[id] || id;
  }
  return map;
}

const PROVIDER_ID_TO_ALIAS = buildProviderIdToAlias();

const ALIAS_TO_PROVIDER_ID = Object.fromEntries(
  Object.entries(OAUTH_ALIASES).map(([k, v]) => [v, k])
);

function deriveModelId(modelsDevProvider, modelId) {
  const canonical = modelId;
  const alias = PROVIDER_ID_TO_ALIAS[modelsDevProvider];
  const full9routerId = alias ? `${alias}/${canonical}` : null;
  return { canonical, alias, full9routerId };
}

function normalizePricing(cost) {
  if (!cost || typeof cost !== "object") return null;
  return {
    input: cost.input ?? null,
    output: cost.output ?? null,
    cache_read: cost.cache_read ?? null,
    cache_write: cost.cache_write ?? null,
    tiers: cost.tiers ?? null,
    context_over_200k: cost.context_over_200k ?? null,
    input_audio: cost.input_audio ?? null,
    reasoning: cost.reasoning ?? null,
  };
}

function catalogToSnapshot(data) {
  const providers = data?.providers || {};
  const models = data?.models || {};
  const snapshot = { providers: {}, models: {} };

  for (const [providerId, providerData] of Object.entries(providers)) {
    const name = providerData.name || providerId;
    const providerModels = providerData.models || {};
    const mapped = {};

    for (const [modelId, modelData] of Object.entries(providerModels)) {
      const cost = normalizePricing(modelData.cost);
      if (cost) mapped[modelId] = cost;
    }

    snapshot.providers[providerId] = { name, models: mapped };
  }

  for (const [modelId, modelData] of Object.entries(models)) {
    snapshot.models[modelId] = {
      name: modelData.name || modelId,
      family: modelData.family || null,
      context: modelData.limit?.context || null,
      output: modelData.limit?.output || null,
      modalities: modelData.modalities || null,
    };
  }

  return snapshot;
}

function buildModelMap(providers, manualMappings = {}) {
  const map = {};
  const unmapped = {};

  for (const [providerId, providerData] of Object.entries(providers)) {
    const alias = PROVIDER_ID_TO_ALIAS[providerId] || manualMappings[providerId] || null;

    for (const modelId of Object.keys(providerData.models || {})) {
      const modelsDevKey = `${providerId}/${modelId}`;
      const canonical = modelId;

      if (alias) {
        const full9routerId = `${alias}/${canonical}`;
        map[modelsDevKey] = {
          canonical,
          alias,
          full9routerId,
          mapped: true,
          manual: !!manualMappings[providerId],
        };
      } else {
        map[modelsDevKey] = {
          canonical,
          alias: null,
          full9routerId: null,
          mapped: false,
        };
        unmapped[modelsDevKey] = providerId;
      }
    }
  }

  return { map, unmapped };
}

let cachedEtag = null;

export async function fetchCatalog() {
  const headers = { Accept: "application/json" };
  if (cachedEtag) headers["If-None-Match"] = cachedEtag;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MODELS_DEV_FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(MODELS_DEV_CATALOG_URL, {
      headers,
      signal: controller.signal,
    });

    if (res.status === 304) return { notModified: true, etag: cachedEtag };
    if (!res.ok) throw new Error(`models.dev returned ${res.status}: ${res.statusText}`);

    const etag = res.headers.get("etag");
    if (etag) cachedEtag = etag;

    const data = await res.json();
    return { notModified: false, etag, data };
  } finally {
    clearTimeout(timeout);
  }
}

export async function syncModelsDevPricing() {
  const result = await fetchCatalog();
  if (result.notModified) {
    const existing = await getSnapshot();
    return {
      synced: true,
      unchanged: true,
      lastSynced: existing?.lastSynced || null,
    };
  }

  const snapshot = catalogToSnapshot(result.data);
  const manualMappings = await getManualMap();
  const { map, unmapped } = buildModelMap(snapshot.providers, manualMappings);

  const now = new Date().toISOString();
  const payload = {
    lastSynced: now,
    sourceUrl: MODELS_DEV_CATALOG_URL,
    etag: result.etag,
    version: "1",
    providers: snapshot.providers,
    models: snapshot.models,
  };

  await saveSnapshot(payload);
  await saveModelMap(map);

  return {
    synced: true,
    unchanged: false,
    lastSynced: now,
    providerCount: Object.keys(snapshot.providers).length,
    modelCount: Object.keys(snapshot.models).length,
    mappedCount: Object.values(map).filter((v) => v.mapped).length,
    unmappedCount: Object.keys(unmapped).length,
  };
}

export async function getModelsDevStatus() {
  const snapshot = await getSnapshot();
  const modelMap = await getModelMap();
  const mapValues = modelMap ? Object.values(modelMap) : [];
  const manualMappings = await getManualMap();

  if (!snapshot) {
    return {
      enabled: false,
      lastSynced: null,
      sourceUrl: MODELS_DEV_CATALOG_URL,
      providerCount: 0,
      modelCount: 0,
      mappedCount: 0,
      unmappedCount: 0,
      providers: {},
      manualMappings: {},
      customProviders: [],
    };
  }

  const mapped = mapValues.filter((v) => v.mapped).length;
  const unmapped = mapValues.length - mapped;

  const providerSummaries = {};
  for (const [pid, pdata] of Object.entries(snapshot.providers || {})) {
    const autoAlias = PROVIDER_ID_TO_ALIAS[pid];
    const manualAlias = manualMappings[pid];
    const effectiveAlias = manualAlias || autoAlias || null;
    const modelCount = Object.keys(pdata.models || {}).length;
    const matchedCount = mapValues.filter(
      (v) => v.canonical && Object.keys(pdata.models || {}).includes(v.canonical)
    ).length;
    providerSummaries[pid] = {
      name: pdata.name,
      modelCount,
      matchedCount,
      matched: !!effectiveAlias,
      alias: effectiveAlias,
      autoAlias: autoAlias || null,
      manualAlias: manualAlias || null,
      manualMapped: !!manualAlias,
    };
  }

  const customProviders = await getCustomProvidersList();

  return {
    lastSynced: snapshot.lastSynced,
    sourceUrl: snapshot.sourceUrl,
    providerCount: Object.keys(snapshot.providers || {}).length,
    modelCount: Object.keys(snapshot.models || {}).length,
    mappedCount: mapped,
    unmappedCount: unmapped,
    providers: providerSummaries,
    manualMappings,
    customProviders,
  };
}

export async function getModelsDevManualMappings() {
  return await getManualMap();
}

export async function saveModelsDevManualMappings(map) {
  await saveManualMap(map);
  const snapshot = await getSnapshot();
  if (snapshot?.lastSynced) {
    const modelMap = await getModelMap();
    const { map: rebuiltMap } = buildModelMap(snapshot.providers, map);
    const mergedMap = { ...modelMap, ...rebuiltMap };
    await saveModelMap(mergedMap);
  }
}

async function getCustomProvidersList() {
  try {
    const { getProviderNodes } = await import("@/lib/localDb");
    const nodes = await getProviderNodes();
    const openai = nodes.filter((n) => n.type === "openai-compatible")
      .map((n) => ({ id: n.id, name: n.name || n.id, type: "openai-compatible" }));
    const anthropic = nodes.filter((n) => n.type === "anthropic-compatible")
      .map((n) => ({ id: n.id, name: n.name || n.id, type: "anthropic-compatible" }));
    return [...openai, ...anthropic];
  } catch {
    return [];
  }
}

export async function getModelsDevPricing() {
  return await getSnapshot();
}

export async function clearModelsDevData() {
  await clearAll();
  cachedEtag = null;
}

let autoSyncInitiated = false;

export async function maybeAutoSyncModelsDev() {
  if (autoSyncInitiated) return;
  autoSyncInitiated = true;

  try {
    const { getSettings } = await import("@/lib/localDb");
    const settings = await getSettings();

    if (!settings.modelsDevEnabled) return;

    const snapshot = await getSnapshot();
    if (!snapshot?.lastSynced) {
      syncModelsDevPricing().catch(() => {});
      return;
    }

    const lastSync = new Date(snapshot.lastSynced).getTime();
    const hours = settings.modelsDevAutoSyncHours || 24;
    const staleMs = hours * 60 * 60 * 1000;

    if (Date.now() - lastSync > staleMs) {
      syncModelsDevPricing().catch(() => {});
    }
  } catch {
    // silently fail on startup
  }
}
