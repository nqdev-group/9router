// packages/validation/rtkConfigSchemas.js
export const VALID_INTENSITIES = ["minimal", "moderate", "aggressive", "maximal"];
export const VALID_RETENTION_MODES = ["none", "first_kb", "full"];
export const VALID_LANGUAGES = ["js", "ts", "py", "rs", "go", "java", "rb", "php", "c", "cpp", "swift", "kt"];

export function validateRtkConfig(config) {
  const errors = [];
  if (config.intensity && !VALID_INTENSITIES.includes(config.intensity)) {
    errors.push(`Invalid intensity: ${config.intensity}`);
  }
  if (config.enabledFilters !== null && typeof config.enabledFilters !== 'object') {
    errors.push('enabledFilters must be null or an object');
  }
  if (config.minCompressSize !== undefined && (typeof config.minCompressSize !== 'number' || config.minCompressSize < 0)) {
    errors.push('minCompressSize must be a non-negative number');
  }
  if (config.maxCompressSize !== undefined && (typeof config.maxCompressSize !== 'number' || config.maxCompressSize < 0)) {
    errors.push('maxCompressSize must be a non-negative number');
  }
  if (config.minCompressSize !== undefined && config.maxCompressSize !== undefined && config.minCompressSize > config.maxCompressSize) {
    errors.push('maxCompressSize must be greater than or equal to minCompressSize');
  }
  if (config.truncateHeadLines !== undefined && (typeof config.truncateHeadLines !== 'number' || config.truncateHeadLines < 0)) {
    errors.push('truncateHeadLines must be a non-negative number');
  }
  if (config.truncateTailLines !== undefined && (typeof config.truncateTailLines !== 'number' || config.truncateTailLines < 0)) {
    errors.push('truncateTailLines must be a non-negative number');
  }
  if (config.truncateThreshold !== undefined && (typeof config.truncateThreshold !== 'number' || config.truncateThreshold < 0)) {
    errors.push('truncateThreshold must be a non-negative number');
  }
  if (config.dedupThreshold !== undefined && (typeof config.dedupThreshold !== 'number' || config.dedupThreshold < 0)) {
    errors.push('dedupThreshold must be a non-negative number');
  }
  if (typeof config.dedupEnabled !== 'boolean' && config.dedupEnabled !== undefined) {
    errors.push('dedupEnabled must be a boolean');
  }
  if (typeof config.codeStrippingEnabled !== 'boolean' && config.codeStrippingEnabled !== undefined) {
    errors.push('codeStrippingEnabled must be a boolean');
  }
  if (config.codeStrippingLanguages !== undefined && !Array.isArray(config.codeStrippingLanguages)) {
    errors.push('codeStrippingLanguages must be an array');
  } else if (config.codeStrippingLanguages) {
    for (const lang of config.codeStrippingLanguages) {
      if (!VALID_LANGUAGES.includes(lang)) {
        errors.push(`Invalid language for code stripping: ${lang}`);
      }
    }
  }
  if (config.rawOutputRetention !== undefined && !VALID_RETENTION_MODES.includes(config.rawOutputRetention)) {
    errors.push(`Invalid rawOutputRetention: ${config.rawOutputRetention}`);
  }
  if (typeof config.autoDetectEnabled !== 'boolean' && config.autoDetectEnabled !== undefined) {
    errors.push('autoDetectEnabled must be a boolean');
  }
  if (typeof config.commandDetectionEnabled !== 'boolean' && config.commandDetectionEnabled !== undefined) {
    errors.push('commandDetectionEnabled must be a boolean');
  }
  if (config.providerOverrides !== undefined && typeof config.providerOverrides !== 'object') {
    errors.push('providerOverrides must be an object');
  }

  return { valid: errors.length === 0, errors };
}

export function mergeRtkConfig(userConfig, defaults) {
  if (!userConfig) return defaults;
  const merged = { ...defaults };
  for (const key in userConfig) {
    if (userConfig[key] !== undefined && userConfig[key] !== null) {
      if (typeof userConfig[key] === 'object' && userConfig[key] !== null && !Array.isArray(userConfig[key])) {
        merged[key] = mergeRtkConfig(userConfig[key], defaults[key] || {});
      } else {
        merged[key] = userConfig[key];
      }
    }
  }
  return merged;
}