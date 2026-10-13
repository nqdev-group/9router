/**
 * Manual "restore" override: temporarily exempts a (comboName, modelStr) pair from
 * being auto-demoted again, even if its rolling-window fail count is still over
 * threshold — lets an admin override the automatic judgment (e.g. "I just fixed the
 * upstream issue, trust this model again") without waiting for the rolling window to
 * naturally roll the old failures out. Same shape and tradeoff as
 * packages/model-combo-cooldown/cooldownStore.js: in-memory only, state resets on
 * server restart (acceptable given the TTL is bounded by the rolling window itself).
 */

/** @type {Map<string, number>} key -> expiresAt (ms since epoch) */
const suppressions = new Map();

function key(comboName, modelStr) {
  return `${comboName}::${modelStr}`;
}

/**
 * @param {string} comboName
 * @param {string} modelStr
 * @param {number} ttlMs
 */
export function suppressComboModelReorder(comboName, modelStr, ttlMs) {
  suppressions.set(key(comboName, modelStr), Date.now() + ttlMs);
}

/**
 * Lazy-expire check: a suppression past its TTL is removed on read rather than via a
 * background timer, same pattern as isComboModelSkipped in model-combo-cooldown.
 * @param {string} comboName
 * @param {string} modelStr
 * @returns {boolean}
 */
export function isComboModelReorderSuppressed(comboName, modelStr) {
  const k = key(comboName, modelStr);
  const expiresAt = suppressions.get(k);
  if (expiresAt == null) return false;
  if (Date.now() >= expiresAt) {
    suppressions.delete(k);
    return false;
  }
  return true;
}

/**
 * Clear suppression state. Omit `comboName` to clear everything (test helper).
 * @param {string} [comboName]
 */
export function resetComboModelReorderSuppression(comboName) {
  if (!comboName) {
    suppressions.clear();
    return;
  }
  const prefix = `${comboName}::`;
  for (const k of suppressions.keys()) {
    if (k.startsWith(prefix)) suppressions.delete(k);
  }
}
