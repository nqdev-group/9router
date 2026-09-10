export function validateTokenLimitRoutingConfig(config) {
  const errors = [];

  if (config.tokenLimitRoutingEnabled !== undefined && typeof config.tokenLimitRoutingEnabled !== "boolean") {
    errors.push("tokenLimitRoutingEnabled must be a boolean");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a PATCH payload for /api/model-token-limits: { [provider]: { [model]: number } }.
 */
export function validateModelTokenLimits(body) {
  const errors = [];

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { valid: false, errors: ["Payload must be an object keyed by provider"] };
  }

  for (const [provider, models] of Object.entries(body)) {
    if (typeof models !== "object" || models === null || Array.isArray(models)) {
      errors.push(`Invalid model-token-limits for provider: ${provider}`);
      continue;
    }
    for (const [model, limit] of Object.entries(models)) {
      if (typeof limit !== "number" || !Number.isFinite(limit) || limit <= 0) {
        errors.push(`Invalid token limit for ${provider}/${model}: must be a positive number`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
