/**
 * Per-combo model cooldown: when a model fails inside a specific combo, skip it
 * for a fixed TTL so subsequent requests to that same combo don't retry it right
 * away. Scope is (comboName, modelStr) — the same model can still be used normally
 * in another combo that hasn't seen the failure.
 *
 * In-memory only (same pattern as comboRotationState in open-sse/services/combo.js):
 * state resets on server restart, which is acceptable given the short TTL.
 */
import { DEFAULT_MODEL_COOLDOWN_TTL_MS } from "./config/defaults.js";

/** @type {Map<string, number>} key -> expiresAt (ms since epoch) */
const cooldowns = new Map();

function cooldownKey(comboName, modelStr) {
  return `${comboName || "__default__"}::${modelStr}`;
}

/**
 * Mark a model as failed inside a combo — skipped for `ttlMs` from now.
 * @param {string} comboName
 * @param {string} modelStr
 * @param {number} [ttlMs=DEFAULT_MODEL_COOLDOWN_TTL_MS]
 */
export function markComboModelFailed(comboName, modelStr, ttlMs = DEFAULT_MODEL_COOLDOWN_TTL_MS) {
  cooldowns.set(cooldownKey(comboName, modelStr), Date.now() + ttlMs);
}

/**
 * Lazy-expire check: a cooldown past its TTL is removed on read rather than via a
 * background timer, so there is nothing to clean up on module load/unload.
 * @param {string} comboName
 * @param {string} modelStr
 * @returns {boolean}
 */
export function isComboModelSkipped(comboName, modelStr) {
  const k = cooldownKey(comboName, modelStr);
  const expiresAt = cooldowns.get(k);
  if (expiresAt == null) return false;
  if (Date.now() >= expiresAt) {
    cooldowns.delete(k);
    return false;
  }
  return true;
}

/**
 * Fail-open: if every model in the combo is currently cooling down, filtering would
 * empty the candidate pool — return the original list unchanged instead, so the combo
 * still tries every model rather than failing the request outright. Same contract as
 * filterModelsByTokenLimit in packages/token-limit-routing.
 * @param {string} comboName
 * @param {string[]} models
 * @returns {string[]}
 */
export function filterSkippedComboModels(comboName, models) {
  if (!Array.isArray(models) || models.length <= 1) return models;
  const kept = models.filter((m) => !isComboModelSkipped(comboName, m));
  return kept.length > 0 ? kept : models;
}

/**
 * List every currently active (non-expired) cooldown, for dashboard display.
 * Lazy-expires stale entries in the same pass, same as isComboModelSkipped.
 * @returns {{ comboName: string, model: string, expiresAt: number }[]}
 */
export function listActiveCooldowns() {
  const now = Date.now();
  const active = [];
  for (const [k, expiresAt] of cooldowns.entries()) {
    if (now >= expiresAt) {
      cooldowns.delete(k);
      continue;
    }
    const sep = k.indexOf("::");
    active.push({
      comboName: sep === -1 ? k : k.slice(0, sep),
      model: sep === -1 ? "" : k.slice(sep + 2),
      expiresAt,
    });
  }
  return active;
}

/**
 * Clear cooldown state. Omit `comboName` to clear everything (test helper).
 * @param {string} [comboName]
 */
export function resetComboCooldown(comboName) {
  if (!comboName) {
    cooldowns.clear();
    return;
  }
  const prefix = `${comboName}::`;
  for (const k of cooldowns.keys()) {
    if (k.startsWith(prefix)) cooldowns.delete(k);
  }
}
