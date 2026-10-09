export const VALID_TIER_ROUTING_MODES = ["cheapest-first", "task-aware"];

export function validateTierRoutingConfig(config) {
  const errors = [];

  if (config.tierRoutingEnabled !== undefined && typeof config.tierRoutingEnabled !== "boolean") {
    errors.push("tierRoutingEnabled must be a boolean");
  }
  if (config.tierRoutingMode !== undefined && !VALID_TIER_ROUTING_MODES.includes(config.tierRoutingMode)) {
    errors.push(`tierRoutingMode must be one of: ${VALID_TIER_ROUTING_MODES.join(", ")}`);
  }
  if (config.tierRoutingDailyBudgetCapUsd !== undefined && config.tierRoutingDailyBudgetCapUsd !== null) {
    const v = config.tierRoutingDailyBudgetCapUsd;
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0) {
      errors.push("tierRoutingDailyBudgetCapUsd must be a non-negative number or null");
    }
  }
  if (config.tierRoutingFreeTierThresholdUsd !== undefined) {
    const v = config.tierRoutingFreeTierThresholdUsd;
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0) {
      errors.push("tierRoutingFreeTierThresholdUsd must be a non-negative number");
    }
  }

  return { valid: errors.length === 0, errors };
}
