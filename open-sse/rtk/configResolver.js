// open-sse/rtk/configResolver.js
import { VALID_INTENSITIES, VALID_RETENTION_MODES, VALID_LANGUAGES, validateRtkConfig, mergeRtkConfig } from '@9router/validation';

function getDefaultRtkConfig() {
  return {
    intensity: "moderate",
    enabledFilters: null,
    minCompressSize: 500,
    maxCompressSize: 10485760,
    truncateHeadLines: 120,
    truncateTailLines: 60,
    truncateThreshold: 250,
    dedupThreshold: 2,
    dedupEnabled: true,
    codeStrippingEnabled: false,
    codeStrippingLanguages: ["js", "ts", "py", "rs", "go"],
    rawOutputRetention: "none",
    autoDetectEnabled: true,
    commandDetectionEnabled: false,
    providerOverrides: {},
  };
}

export function resolveRtkConfig(userConfig) {
  const defaults = getDefaultRtkConfig();
  if (!userConfig) return defaults;
  const merged = mergeRtkConfig(userConfig, defaults);
  const { valid, errors } = validateRtkConfig(merged);
  if (!valid) {
    console.warn('Invalid RTK configuration:', errors);
    // Return defaults on invalid config? Or throw? We'll return defaults for safety.
    return defaults;
  }
  return merged;
}

export function resolveEffectiveFilters(config) {
  // If enabledFilters is explicitly set, use it
  if (config.enabledFilters !== null) {
    return config.enabledFilters;
  }
  
  // Otherwise, based on intensity level, produce the set of enabled filters
  const intensityPresets = {
    minimal: {
      enabledFilterIds: ["git-diff", "git-status", "grep", "ls", "tree"],
      dedupThreshold: 0,        // off
      codeStrippingEnabled: false,
      truncateThreshold: 500,   // only truncate very long output
    },
    moderate: {
      enabledFilterIds: ["*"],  // all standard filters
      dedupThreshold: 2,
      codeStrippingEnabled: false,
      truncateThreshold: 250,
    },
    aggressive: {
      enabledFilterIds: ["*"],
      dedupThreshold: 1,
      codeStrippingEnabled: true,
      truncateThreshold: 150,
      truncateHeadLines: 80,
      truncateTailLines: 40,
    },
    maximal: {
      enabledFilterIds: ["*"],
      dedupThreshold: 1,
      codeStrippingEnabled: true,
      codeStrippingLanguages: ["*"],  // all supported languages
      truncateThreshold: 100,
      truncateHeadLines: 50,
      truncateTailLines: 25,
      rawOutputRetention: "none",
    },
  };
  
  const preset = intensityPresets[config.intensity] || intensityPresets.moderate;
  
  // Start with preset
  let effectiveFilters = {};
  if (preset.enabledFilterIds && preset.enabledFilterIds[0] === "*") {
    // We'll need to know all available filters. For now, we'll return null to mean "all"
    // In the engine, we'll handle "*" as all filters.
    effectiveFilters = null; // null means all filters
  } else {
    // Specific list of filter IDs
    for (const filterId of preset.enabledFilterIds) {
      effectiveFilters[filterId] = true;
    }
  }
  
  // Override with preset values for other settings
  // Note: The engine will use these preset values for thresholds, etc.
  // We'll return an object that includes both the filter settings and the preset values.
  return {
    ...effectiveFilters,
    _preset: preset, // Internal use by engine
  };
}

export function getFilterPreset(intensity) {
  const presets = {
    minimal: {
      enabledFilterIds: ["git-diff", "git-status", "grep", "ls", "tree"],
      dedupThreshold: 0,
      codeStrippingEnabled: false,
      truncateThreshold: 500,
    },
    moderate: {
      enabledFilterIds: ["*"],
      dedupThreshold: 2,
      codeStrippingEnabled: false,
      truncateThreshold: 250,
    },
    aggressive: {
      enabledFilterIds: ["*"],
      dedupThreshold: 1,
      codeStrippingEnabled: true,
      truncateThreshold: 150,
      truncateHeadLines: 80,
      truncateTailLines: 40,
    },
    maximal: {
      enabledFilterIds: ["*"],
      dedupThreshold: 1,
      codeStrippingEnabled: true,
      codeStrippingLanguages: ["*"],
      truncateThreshold: 100,
      truncateHeadLines: 50,
      truncateTailLines: 25,
      rawOutputRetention: "none",
    },
  };
  return presets[intensity] || presets.moderate;
}