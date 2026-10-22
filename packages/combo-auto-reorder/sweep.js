import { planComboReorders } from "./planReorder.js";
import { resolveComboAutoReorderConfig } from "./resolveConfig.js";

/**
 * One sweep tick: read settings + rolling fail counts + combos (all injected — this
 * package never touches the DB directly, same convention as packages/token-limit-routing
 * — src/lib is the only layer allowed to talk to SQLite), compute which combos need
 * reordering, and write each one back.
 *
 * Fail-open per combo: a write conflict (concurrent manual edit on the combos UI raced
 * the sweep — see deps.updateCombo's expectedUpdatedAt contract) or any other per-combo
 * error is swallowed and skipped, never aborting the rest of the sweep.
 *
 * @param {object} deps
 * @param {() => Promise<object>} deps.getSettings
 * @param {(windowMs: number) => Promise<Array>} deps.getRecentModelFailCounts
 * @param {() => Promise<Array>} deps.getCombos
 * @param {(id: string, data: object, opts?: {expectedUpdatedAt?: string}) => Promise<object|null>} deps.updateCombo
 * @param {(comboName: string) => void} deps.resetComboRotation
 * @param {(comboName:string, modelStr:string) => boolean} [deps.isSuppressed] - see
 *   planComboReorders; skips re-demoting a pair an admin just manually restored.
 * @param {(msg: string) => void} [deps.onWarn]
 * @returns {Promise<{checked: number, reordered: string[], skipped: string[]}>}
 */
export async function runComboAutoReorderSweep(deps) {
  const { getSettings, getRecentModelFailCounts, getCombos, updateCombo, resetComboRotation, isSuppressed, onWarn } = deps;
  const warn = onWarn || (() => {});

  const settings = await getSettings();
  if (!settings?.comboAutoReorderEnabled) return { checked: 0, reordered: [], skipped: [] };

  const { threshold, windowMs } = resolveComboAutoReorderConfig(settings);

  const [failCounts, combos] = await Promise.all([getRecentModelFailCounts(windowMs), getCombos()]);
  const plans = planComboReorders(combos, failCounts, threshold, isSuppressed);

  const reordered = [];
  const skipped = [];
  for (const plan of plans) {
    try {
      const result = await updateCombo(plan.id, { models: plan.models }, { expectedUpdatedAt: plan.updatedAt });
      if (!result) {
        skipped.push(plan.name);
        continue;
      }
      resetComboRotation(plan.name);
      reordered.push(plan.name);
    } catch (err) {
      skipped.push(plan.name);
      warn(`[ComboAutoReorder] skip ${plan.name}: ${err?.message || err}`);
    }
  }

  return { checked: combos.length, reordered, skipped };
}
