export const VALID_CAVEMAN_LEVELS = ["lite", "full", "ultra", "wenyan-lite", "wenyan", "wenyan-ultra"];

export function validateCavemanConfig(config) {
  const errors = [];
  if (config.cavemanEnabled !== undefined && typeof config.cavemanEnabled !== "boolean") {
    errors.push("cavemanEnabled must be a boolean");
  }
  if (config.cavemanLevel !== undefined && !VALID_CAVEMAN_LEVELS.includes(config.cavemanLevel)) {
    errors.push(`Invalid cavemanLevel: ${config.cavemanLevel}. Valid: ${VALID_CAVEMAN_LEVELS.join(", ")}`);
  }
  return { valid: errors.length === 0, errors };
}
