export function validateComboAutoReorderConfig(config) {
  const errors = [];

  if (config.comboAutoReorderEnabled !== undefined && typeof config.comboAutoReorderEnabled !== "boolean") {
    errors.push("comboAutoReorderEnabled must be a boolean");
  }
  if (config.comboAutoReorderFailThreshold !== undefined) {
    const n = config.comboAutoReorderFailThreshold;
    if (typeof n !== "number" || !Number.isFinite(n) || n < 1) {
      errors.push("comboAutoReorderFailThreshold must be a number >= 1");
    }
  }
  if (config.comboAutoReorderWindowMs !== undefined) {
    const n = config.comboAutoReorderWindowMs;
    if (typeof n !== "number" || !Number.isFinite(n) || n < 60000) {
      errors.push("comboAutoReorderWindowMs must be a number >= 60000 (1 minute)");
    }
  }
  if (config.comboAutoReorderIntervalMs !== undefined) {
    const n = config.comboAutoReorderIntervalMs;
    if (typeof n !== "number" || !Number.isFinite(n) || n < 30000) {
      errors.push("comboAutoReorderIntervalMs must be a number >= 30000 (30 seconds)");
    }
  }

  return { valid: errors.length === 0, errors };
}
