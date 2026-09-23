/**
 * Groups rolling fail counts into "models currently over the threshold" per combo —
 * the single source of truth shared by the sweep's reorder plan (planReorder.js) and
 * the dashboard's "currently demoted" status query, so the UI never shows a model the
 * sweep wouldn't actually act on (and vice versa).
 *
 * @param {{comboName:string, provider:string, model:string, count:number}[]} failCounts
 * @param {number} threshold - fail count at/above which a model is considered failing
 * @param {(comboName:string, modelStr:string) => boolean} [isSuppressed] - a manually
 *   restored (combo, model) pair is excluded even if still over threshold, until the
 *   suppression expires — see restoreModelNow() in restore.js.
 * @returns {Map<string, Set<string>>} comboName -> Set<"provider/model">
 */
export function groupFailingModelsByCombo(failCounts, threshold, isSuppressed) {
  const byCombo = new Map();
  if (!Number.isFinite(threshold) || threshold <= 0) return byCombo;

  for (const row of failCounts || []) {
    if (!row || !(row.count >= threshold)) continue;
    const modelStr = `${row.provider}/${row.model}`;
    if (typeof isSuppressed === "function" && isSuppressed(row.comboName, modelStr)) continue;
    if (!byCombo.has(row.comboName)) byCombo.set(row.comboName, new Set());
    byCombo.get(row.comboName).add(modelStr);
  }
  return byCombo;
}
