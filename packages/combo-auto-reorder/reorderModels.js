/**
 * Moves every model whose "provider/model" string is in `failingModels` to the end
 * of `models`, preserving the relative order within both the healthy and failing
 * groups. Returns the same array reference when no reorder is needed, so callers can
 * skip a no-op DB write (same "return unchanged when nothing to do" convention as
 * filterModelsByTokenLimit in packages/token-limit-routing).
 *
 * @param {string[]} models - combo's current model list, "provider/model" strings
 * @param {Iterable<string>} failingModels - models exceeding the fail-rate threshold
 * @returns {string[]}
 */
export function reorderFailingModelsToEnd(models, failingModels) {
  if (!Array.isArray(models) || models.length <= 1) return models;
  const failingSet = failingModels instanceof Set ? failingModels : new Set(failingModels || []);
  if (failingSet.size === 0) return models;

  const healthy = [];
  const failing = [];
  for (const m of models) {
    (failingSet.has(m) ? failing : healthy).push(m);
  }
  // Nothing to move (no matches in this combo), or every model is failing — either
  // way the order is already "correct", so avoid a no-op write.
  if (failing.length === 0 || failing.length === models.length) return models;

  const next = [...healthy, ...failing];
  const unchanged = next.every((m, i) => m === models[i]);
  return unchanged ? models : next;
}

/**
 * Manual restore support: unconditionally moves `modelStr` to the front of `models`,
 * preserving the relative order of everything else. Unlike reorderFailingModelsToEnd,
 * this always repositions the target — even when nothing else in the combo is
 * currently failing — because the caller (restore.js) already knows this specific
 * model needs to move: it's sitting in a stale demoted position left over from a past
 * sweep tick, and reorderFailingModelsToEnd's "nothing failing right now → no-op"
 * guard would otherwise leave it stranded at the back.
 * @param {string[]} models
 * @param {string} modelStr - must currently be present in `models`
 * @returns {string[]}
 */
export function promoteModelNow(models, modelStr) {
  if (!Array.isArray(models) || models.length === 0) return models;
  if (models[0] === modelStr) return models; // already first — no-op
  if (!models.includes(modelStr)) return models;
  return [modelStr, ...models.filter((m) => m !== modelStr)];
}
