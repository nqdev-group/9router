import { getAdapter } from "../driver.js";
import { parseJson, stringifyJson } from "../helpers/jsonCol.js";

const DEFAULT_MITM_ROUTER_BASE = "http://localhost:20128";

const DEFAULT_SETTINGS = {
  cloudEnabled: false,
  tunnelEnabled: false,
  tunnelUrl: "",
  tunnelProvider: "cloudflare",
  tailscaleEnabled: false,
  tailscaleUrl: "",
  stickyRoundRobinLimit: 3,
  providerStrategies: {},
  comboStrategy: "fallback",
  comboStickyRoundRobinLimit: 1,
  comboStrategies: {},
  requireLogin: true,
  tunnelDashboardAccess: true,
  authMode: "password",
  oidcIssuerUrl: "",
  oidcClientId: "",
  oidcClientSecret: "",
  oidcScopes: "openid profile email",
  oidcLoginLabel: "Sign in with OIDC",
  enableObservability: true,
  observabilityMaxRecords: 1000,
  observabilityBatchSize: 20,
  observabilityFlushIntervalMs: 5000,
  observabilityMaxJsonSize: 5,
  outboundProxyEnabled: false,
  outboundProxyUrl: "",
  outboundNoProxy: "",
  mitmRouterBaseUrl: DEFAULT_MITM_ROUTER_BASE,
  dnsToolEnabled: {},
  rtkEnabled: true,
  rtkConfig: {
    // Intensity
    intensity: "aggressive",                   // "minimal" | "moderate" | "aggressive" | "maximal"
    
    // Per-filter control (null = use intensity default)
    enabledFilters: null,                    // null = all; or { "git-diff": true, "grep": false, ... }
    
    // Size thresholds
    minCompressSize: 200,                    // bytes (default: 200)
    maxCompressSize: 10485760,               // bytes (10 MiB)
    
    // Truncation (smart-truncate)
    truncateHeadLines: 120,                  // keep first N lines
    truncateTailLines: 60,                   // keep last N lines
    truncateThreshold: 250,                  // only truncate if > N lines
    
    // Dedup
    dedupThreshold: 2,                       // consecutive identical lines to collapse
    dedupEnabled: true,
    
    // Code stripping (comment/whitespace removal per language)
    codeStrippingEnabled: false,
    codeStrippingLanguages: ["js", "ts", "py", "rs", "go"],  // target languages
    
    // Raw output retention (for debugging)
    rawOutputRetention: "none",              // "none" | "first_kb" | "full"
    
    // Auto-detection
    autoDetectEnabled: true,                 // auto-detect filter from content
    commandDetectionEnabled: false,          // detect command type (git, test, build, etc.)
    
    // Per-provider overrides (optional, phase 2)
    providerOverrides: {},                   // { "claude": { intensity: "aggressive" }, ... }
  },
  cavemanEnabled: false,
  cavemanLevel: "full",
};

async function readRaw() {
  const db = await getAdapter();
  const row = db.get(`SELECT data FROM settings WHERE id = 1`);
  return row ? parseJson(row.data, {}) : {};
}

// Merge raw settings with defaults; backward-compat for missing keys
function mergeWithDefaults(raw) {
  const merged = { ...DEFAULT_SETTINGS, ...(raw || {}) };
  for (const [key, defVal] of Object.entries(DEFAULT_SETTINGS)) {
    if (merged[key] === undefined) {
      if (
        key === "outboundProxyEnabled" &&
        typeof merged.outboundProxyUrl === "string" &&
        merged.outboundProxyUrl.trim()
      ) {
        merged[key] = true;
      } else {
        merged[key] = defVal;
      }
    }
  }
  return merged;
}

export async function getSettings() {
  const raw = await readRaw();
  return mergeWithDefaults(raw);
}

// Atomic read-merge-write inside transaction (prevents losing concurrent updates)
export async function updateSettings(updates) {
  const db = await getAdapter();
  let next;
  db.transaction(() => {
    const row = db.get(`SELECT data FROM settings WHERE id = 1`);
    const current = row ? parseJson(row.data, {}) : {};
    next = { ...current, ...updates };
    db.run(
      `INSERT INTO settings(id, data) VALUES(1, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data`,
      [stringifyJson(next)]
    );
  });
  return mergeWithDefaults(next);
}

export async function isCloudEnabled() {
  const settings = await getSettings();
  return settings.cloudEnabled === true;
}

export async function getCloudUrl() {
  const settings = await getSettings();
  return (
    settings.cloudUrl ||
    process.env.CLOUD_URL ||
    process.env.NEXT_PUBLIC_CLOUD_URL ||
    ""
  );
}

export async function exportSettings() {
  return await readRaw();
}
