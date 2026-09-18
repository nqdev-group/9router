export const VALID_TIER_ROUTING_MODES = ["cheapest-first", "task-aware"];

export const DEFAULT_TIER_ROUTING_CONFIG = {
  enabled: false, // opt-in, matches privacy/cmem/provider-alert convention
  mode: "cheapest-first", // "cheapest-first" | "task-aware"
  dailyBudgetCapUsd: null, // null = no cap
  freeTierThresholdUsd: 0.01, // blended $/1M tokens considered "free tier"
};
