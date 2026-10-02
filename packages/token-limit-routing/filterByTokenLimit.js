/**
 * Pure filter: drop models whose configured max-input-token limit is smaller than
 * the estimated prompt token count. The lookup is injected by the caller so this
 * package never depends on any specific provider registry or DB (open-sse/src
 * consume this, not the other way around — same convention as packages/tier-routing).
 *
 * Fail-open: if filtering would leave zero candidates (misconfigured limit, huge
 * prompt), the original list is returned unchanged so combo fallback never breaks —
 * the provider itself is left to reject an oversized prompt instead of the router
 * blocking the request outright.
 * @param {string[]} models - "provider/model" strings
 * @param {number} promptTokens
 * @param {(modelStr: string) => number|null|undefined} getMaxInputTokens - null/undefined = no limit configured
 * @returns {string[]}
 */
export function filterModelsByTokenLimit(models, promptTokens, getMaxInputTokens) {
  if (!Array.isArray(models) || models.length <= 1 || typeof getMaxInputTokens !== "function") return models;
  if (!Number.isFinite(promptTokens) || promptTokens <= 0) return models;

  const kept = models.filter((m) => {
    const limit = getMaxInputTokens(m);
    return limit == null || limit >= promptTokens;
  });

  return kept.length > 0 ? kept : models;
}
