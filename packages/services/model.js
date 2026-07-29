/**
 * Additional provider model inference logic
 * Extends open-sse/services/model.js with custom prefixes
 */

// Additional model prefixes not in open-sse core
export const EXTRA_MODEL_PREFIXES = [
  [/^kira-/, "kira"],
];

/**
 * Check if model matches an extra prefix
 * @param {string} modelName - Full model name (e.g. "kira-mini-1.0")
 * @returns {string|null} Provider ID if match, null otherwise
 */
export function getProviderFromExtraPrefixes(modelName) {
  if (!modelName) return null;
  const m = modelName.toLowerCase();
  for (const [re, provider] of EXTRA_MODEL_PREFIXES) {
    if (re.test(m)) return provider;
  }
  return null;
}