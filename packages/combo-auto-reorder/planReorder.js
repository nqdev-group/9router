import { reorderFailingModelsToEnd } from "./reorderModels.js";
import { groupFailingModelsByCombo } from "./failingModels.js";

/**
 * Pure planning step: given combos and rolling fail counts, decide which combos need
 * their `models` array reordered (failing models pushed to the end) and compute the
 * new array for each. Combos whose order doesn't actually change are omitted from the
 * result, so the caller never issues a no-op write.
 *
 * Fail-rate scope is per (comboName, provider/model) — matches how error-log rows are
 * already recorded (combo_name is required on model-level errors), so the same model
 * can be healthy in one combo and demoted in another.
 *
 * Re-running this every sweep tick against the live rolling-window fail counts also
 * gives "promote back" for free: once a model's count drops below threshold (the old
 * failures aged out of the window), it's simply no longer in the failing set, so this
 * function naturally partitions it back into the healthy group ahead of any
 * still-failing models — no separate "undo" code path or stored original position
 * needed.
 *
 * @param {{id:string, name:string, models:string[], updatedAt:string}[]} combos
 * @param {{comboName:string, provider:string, model:string, count:number}[]} failCounts
 * @param {number} threshold - fail count at/above which a model is considered failing
 * @param {(comboName:string, modelStr:string) => boolean} [isSuppressed] - see
 *   groupFailingModelsByCombo; lets a manual restore (restore.js) exempt a pair for a
 *   while so this function doesn't just re-demote it on the very next tick.
 * @returns {{id:string, name:string, updatedAt:string, models:string[]}[]}
 */
export function planComboReorders(combos, failCounts, threshold, isSuppressed) {
  if (!Array.isArray(combos) || combos.length === 0) return [];

  const failingByCombo = groupFailingModelsByCombo(failCounts, threshold, isSuppressed);
  if (failingByCombo.size === 0) return [];

  const plans = [];
  for (const combo of combos) {
    const failing = failingByCombo.get(combo.name);
    if (!failing || failing.size === 0) continue;
    const nextModels = reorderFailingModelsToEnd(combo.models, failing);
    if (nextModels === combo.models) continue; // no-op, skip write
    plans.push({ id: combo.id, name: combo.name, updatedAt: combo.updatedAt, models: nextModels });
  }
  return plans;
}
