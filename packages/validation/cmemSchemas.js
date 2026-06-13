export const VALID_CMEM_MODES = ["code", "code--zh", "code--ja", "code--es", "code--ko", "code--fr"];
export const VALID_HISTORY_DEPTHS = ["session", "project", "global"];
export const VALID_SEARCH_MODES = ["fts", "vector", "hybrid"];
export const MAX_TOKEN_BUDGET = 16000;
export const MIN_TOKEN_BUDGET = 500;

export function validateCmemConfig(config) {
  const errors = [];
  if (!config || typeof config !== "object") {
    return { valid: false, errors: ["config must be an object"] };
  }

  if (config.mode !== undefined && !VALID_CMEM_MODES.includes(config.mode)) {
    errors.push(`Invalid mode: ${config.mode}. Valid: ${VALID_CMEM_MODES.join(", ")}`);
  }

  if (config.tokenBudget !== undefined) {
    if (typeof config.tokenBudget !== "number" || config.tokenBudget < MIN_TOKEN_BUDGET || config.tokenBudget > MAX_TOKEN_BUDGET) {
      errors.push(`tokenBudget must be between ${MIN_TOKEN_BUDGET} and ${MAX_TOKEN_BUDGET}`);
    }
  }

  if (config.historyDepth !== undefined && !VALID_HISTORY_DEPTHS.includes(config.historyDepth)) {
    errors.push(`Invalid historyDepth: ${config.historyDepth}`);
  }

  if (config.maxObservations !== undefined && (typeof config.maxObservations !== "number" || config.maxObservations < 1 || config.maxObservations > 100)) {
    errors.push("maxObservations must be between 1 and 100");
  }

  if (config.searchMode !== undefined && !VALID_SEARCH_MODES.includes(config.searchMode)) {
    errors.push(`Invalid searchMode: ${config.searchMode}`);
  }

  if (config.summarizationEnabled !== undefined && typeof config.summarizationEnabled !== "boolean") {
    errors.push("summarizationEnabled must be a boolean");
  }

  if (config.excludePrivateContent !== undefined && typeof config.excludePrivateContent !== "boolean") {
    errors.push("excludePrivateContent must be a boolean");
  }

  if (config.observationRetentionDays !== undefined && (typeof config.observationRetentionDays !== "number" || config.observationRetentionDays < 1)) {
    errors.push("observationRetentionDays must be a positive number");
  }

  if (config.contextSections !== undefined) {
    if (!Array.isArray(config.contextSections)) {
      errors.push("contextSections must be an array");
    } else {
      const validSections = ["recent", "relevant", "project-facts"];
      for (const s of config.contextSections) {
        if (!validSections.includes(s)) errors.push(`Invalid contextSection: ${s}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
