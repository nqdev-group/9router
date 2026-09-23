import {
  DEFAULT_COMBO_AUTO_REORDER_FAIL_THRESHOLD,
  DEFAULT_COMBO_AUTO_REORDER_WINDOW_MS,
} from "./config/defaults.js";

/**
 * Applies the same "fall back to default when missing/invalid" rule the sweep and the
 * manual restore action both need, so they never disagree about what threshold/window
 * is currently in effect.
 * @param {object} settings
 * @returns {{threshold: number, windowMs: number}}
 */
export function resolveComboAutoReorderConfig(settings) {
  const threshold = Number.isFinite(settings?.comboAutoReorderFailThreshold) && settings.comboAutoReorderFailThreshold > 0
    ? settings.comboAutoReorderFailThreshold
    : DEFAULT_COMBO_AUTO_REORDER_FAIL_THRESHOLD;
  const windowMs = Number.isFinite(settings?.comboAutoReorderWindowMs) && settings.comboAutoReorderWindowMs > 0
    ? settings.comboAutoReorderWindowMs
    : DEFAULT_COMBO_AUTO_REORDER_WINDOW_MS;
  return { threshold, windowMs };
}
