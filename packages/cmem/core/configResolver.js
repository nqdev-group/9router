import { DEFAULT_CMEM_CONFIG } from "../config/defaults.js";
import { VALID_CMEM_MODE_KEYS } from "../config/modes.js";

const VALID_HISTORY_DEPTHS = ["session", "project", "global"];
const VALID_SEARCH_MODES = ["fts", "vector", "hybrid"];
const MAX_TOKEN_BUDGET = 16000;
const MIN_TOKEN_BUDGET = 500;

export function resolveCmemConfig(userConfig) {
  if (!userConfig) return { ...DEFAULT_CMEM_CONFIG };
  const merged = { ...DEFAULT_CMEM_CONFIG, ...userConfig };
  if (!VALID_CMEM_MODE_KEYS.includes(merged.mode)) merged.mode = DEFAULT_CMEM_CONFIG.mode;
  if (!VALID_HISTORY_DEPTHS.includes(merged.historyDepth)) merged.historyDepth = DEFAULT_CMEM_CONFIG.historyDepth;
  if (!VALID_SEARCH_MODES.includes(merged.searchMode)) merged.searchMode = DEFAULT_CMEM_CONFIG.searchMode;
  if (typeof merged.tokenBudget !== "number" || merged.tokenBudget < MIN_TOKEN_BUDGET) merged.tokenBudget = MIN_TOKEN_BUDGET;
  if (merged.tokenBudget > MAX_TOKEN_BUDGET) merged.tokenBudget = MAX_TOKEN_BUDGET;
  if (typeof merged.maxObservations !== "number" || merged.maxObservations < 1) merged.maxObservations = 1;
  if (merged.maxObservations > 100) merged.maxObservations = 100;
  return merged;
}

export { VALID_HISTORY_DEPTHS, VALID_SEARCH_MODES, MAX_TOKEN_BUDGET, MIN_TOKEN_BUDGET };
