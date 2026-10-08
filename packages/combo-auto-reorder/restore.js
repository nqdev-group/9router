import { promoteModelNow } from "./reorderModels.js";
import { resolveComboAutoReorderConfig } from "./resolveConfig.js";

/**
 * Manual "restore" action: immediately moves `provider/model` to the front of
 * `comboName`'s model list, instead of waiting for the rolling window to naturally
 * age the old failures out. Also suppresses re-demotion of that pair for the rolling
 * window duration (via deps.suppressComboModelReorder) so the very next sweep tick
 * doesn't just see the same still-in-window error-log rows and demote it right back.
 *
 * @param {object} deps
 * @param {() => Promise<object>} deps.getSettings
 * @param {(name: string) => Promise<object|null>} deps.getComboByName
 * @param {(id: string, data: object, opts?: {expectedUpdatedAt?: string}) => Promise<object|null>} deps.updateCombo
 * @param {(comboName: string) => void} deps.resetComboRotation
 * @param {(comboName: string, modelStr: string, ttlMs: number) => void} deps.suppressComboModelReorder
 * @param {{comboName: string, provider: string, model: string}} target
 * @returns {Promise<{restored: boolean, reason?: string}>}
 */
export async function restoreModelNow(deps, target) {
  const { getSettings, getComboByName, updateCombo, resetComboRotation, suppressComboModelReorder } = deps;
  const { comboName, provider, model } = target || {};
  if (!comboName || !provider || !model) return { restored: false, reason: "comboName, provider and model are required" };
  const modelStr = `${provider}/${model}`;

  const combo = await getComboByName(comboName);
  if (!combo) return { restored: false, reason: "combo not found" };
  if (!combo.models.includes(modelStr)) return { restored: false, reason: "model not declared in this combo" };

  const settings = await getSettings();
  const { windowMs } = resolveComboAutoReorderConfig(settings);

  // Suppress first so a sweep tick racing this restore can't immediately undo it.
  suppressComboModelReorder(comboName, modelStr, windowMs);

  const nextModels = promoteModelNow(combo.models, modelStr);
  if (nextModels === combo.models) return { restored: true };

  try {
    const result = await updateCombo(combo.id, { models: nextModels }, { expectedUpdatedAt: combo.updatedAt });
    if (!result) return { restored: false, reason: "combo was modified concurrently, try again" };
  } catch {
    return { restored: false, reason: "combo was modified concurrently, try again" };
  }

  resetComboRotation(comboName);
  return { restored: true };
}
