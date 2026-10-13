// Pure cost-based model reordering. The caller supplies a pricing lookup so this
// package never depends on any specific provider registry (open-sse/src consume
// this, not the other way around).

// Blended $/1M tokens estimate. Input is weighted higher — it usually dominates
// chat-with-tools traffic (system prompt + history + tool results).
function blendedCost(pricing) {
  if (!pricing) return null;
  return pricing.input * 0.7 + pricing.output * 0.3;
}

/**
 * Stable-sort `models` cheapest-first using `getPricing(modelStr) => {input, output} | null`.
 * Models with unknown pricing keep their relative order and sort last — an unpriced
 * model is never assumed cheap, so this never silently prioritizes a mystery model.
 * @param {string[]} models
 * @param {(modelStr: string) => {input: number, output: number} | null} getPricing
 * @returns {string[]}
 */
export function reorderByCost(models, getPricing) {
  if (!Array.isArray(models) || models.length <= 1 || typeof getPricing !== "function") return models;
  return models
    .map((m, i) => ({ m, i, cost: blendedCost(getPricing(m)) }))
    .sort((a, b) => {
      if (a.cost === null && b.cost === null) return a.i - b.i;
      if (a.cost === null) return 1;
      if (b.cost === null) return -1;
      return a.cost - b.cost || a.i - b.i;
    })
    .map((x) => x.m);
}

export const DEFAULT_FREE_TIER_THRESHOLD_USD_PER_1M = 0.01;

/**
 * Cost-sorted, but models at/under `freeTierThreshold` blended $/1M cost float to
 * the front as a block (still cost-sorted within each block). Used for non-critical
 * requests or once a budget cap has been hit.
 * @param {string[]} models
 * @param {(modelStr: string) => {input: number, output: number} | null} getPricing
 * @param {number} [freeTierThreshold]
 * @returns {string[]}
 */
export function reorderFreeTierFirst(models, getPricing, freeTierThreshold = DEFAULT_FREE_TIER_THRESHOLD_USD_PER_1M) {
  const sorted = reorderByCost(models, getPricing);
  if (typeof getPricing !== "function") return sorted;

  const free = [];
  const paid = [];
  for (const m of sorted) {
    const cost = blendedCost(getPricing(m));
    (cost !== null && cost <= freeTierThreshold ? free : paid).push(m);
  }
  return [...free, ...paid];
}
