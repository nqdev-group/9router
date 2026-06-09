"use client";

import Card from "@/shared/components/Card";

export function AdvancedSettings({ config, onChange }) {
  return (
    <Card title="Advanced Settings" subtitle="Fine-tune RTK behavior" icon="settings">
      <div className="space-y-4">
        {/* Code Stripping */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="codeStrippingEnabled"
              checked={config.codeStrippingEnabled}
              onChange={(e) =>
                onChange({ codeStrippingEnabled: e.target.checked })
              }
              className="rounded border-border-subtle text-primary focus:ring-primary"
            />
            <label htmlFor="codeStrippingEnabled" className="text-sm font-medium text-text-main">
              Enable Code Stripping
            </label>
          </div>
          {config.codeStrippingEnabled && (
            <div className="mt-2">
              <p className="text-xs text-text-muted mb-1">
                Remove comments and excess whitespace from supported languages
              </p>
              <div className="flex flex-wrap gap-2">
                {config.codeStrippingLanguages.map((lang) => (
                  <span key={lang} className="px-2 py-1 rounded bg-bg text-xs">
                    {lang}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Size Thresholds */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-text-main">Size Thresholds</p>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <label className="flex items-center">
              Min compress size:{" "}
              <input
                type="number"
                min="0"
                value={config.minCompressSize || 500}
                onChange={(e) =>
                  onChange({
                    minCompressSize:
                      parseInt(e.target.value) || (config.minCompressSize || 500),
                  })
                }
                className="w-20 px-2 py-1 rounded bg-bg border border-border-subtle text-sm text-right focus:outline-none focus:border-primary"
              />
              bytes
            </label>
            <label className="flex items-center">
              Max compress size:{" "}
              <input
                type="number"
                min="0"
                value={config.maxCompressSize || 10485760}
                onChange={(e) =>
                  onChange({
                    maxCompressSize:
                      parseInt(e.target.value) ||
                      (config.maxCompressSize || 10485760),
                  })
                }
                className="w-20 px-2 py-1 rounded bg-bg border border-border-subtle text-sm text-right focus:outline-none focus:border-primary"
              />
              bytes ({" "}
              <span className="font-mono text-xs">
                {(config.maxCompressSize || 10485760) / 1048576} MB
              </span>
              )
            </label>
          </div>
        </div>

        {/* Truncation */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-text-main">Truncation (smart-truncate)</p>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <label className="flex items-center">
              Head lines:{" "}
              <input
                type="number"
                min="0"
                value={config.truncateHeadLines || 120}
                onChange={(e) =>
                  onChange({
                    truncateHeadLines:
                      parseInt(e.target.value) ||
                      (config.truncateHeadLines || 120),
                  })
                }
                className="w-20 px-2 py-1 rounded bg-bg border border-border-subtle text-sm text-right focus:outline-none focus:border-primary"
              />
            </label>
            <label className="flex items-center">
              Tail lines:{" "}
              <input
                type="number"
                min="0"
                value={config.truncateTailLines || 60}
                onChange={(e) =>
                  onChange({
                    truncateTailLines:
                      parseInt(e.target.value) ||
                      (config.truncateTailLines || 60),
                  })
                }
                className="w-20 px-2 py-1 rounded bg-bg border border-border-subtle text-sm text-right focus:outline-none focus:border-primary"
              />
            </label>
            <label className="flex items-center">
              Threshold:{" "}
              <input
                type="number"
                min="0"
                value={config.truncateThreshold || 250}
                onChange={(e) =>
                  onChange({
                    truncateThreshold:
                      parseInt(e.target.value) ||
                      (config.truncateThreshold || 250),
                  })
                }
                className="w-20 px-2 py-1 rounded bg-bg border border-border-subtle text-sm text-right focus:outline-none focus:border-primary"
              />
              lines (only truncate if {'>'} N lines)
            </label>
          </div>
        </div>

        {/* Dedup */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-text-main">Dedup</p>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <label className="flex items-center">
              <input
                type="checkbox"
                id="dedupEnabled"
                checked={config.dedupEnabled}
                onChange={(e) =>
                  onChange({ dedupEnabled: e.target.checked })
                }
                className="rounded border-border-subtle text-primary focus:ring-primary"
              />
              <span className="ml-2">Enabled</span>
            </label>
            <label className="flex items-center">
              Threshold:{" "}
              <input
                type="number"
                min="0"
                value={config.dedupThreshold || 2}
                onChange={(e) =>
                  onChange({
                    dedupThreshold:
                      parseInt(e.target.value) || (config.dedupThreshold || 2),
                  })
                }
                className="w-20 px-2 py-1 rounded bg-bg border border-border-subtle text-sm text-right focus:outline-none focus:border-primary"
              />
              consecutive lines
            </label>
          </div>
        </div>

        {/* Debug */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-text-main">Debug</p>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <label className="flex items-center">
              Raw output retention:{" "}
              <select
                value={config.rawOutputRetention || "none"}
                onChange={(e) =>
                  onChange({ rawOutputRetention: e.target.value })
                }
                className="w-36 px-2 py-1 rounded bg-bg border border-border-subtle text-sm text-right focus:outline-none focus:border-primary"
              >
                <option value="none">none</option>
                <option value="first_kb">first_kb</option>
                <option value="full">full</option>
              </select>
            </label>
          </div>
        </div>

        {/* Detection */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-text-main">Detection</p>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <label className="flex items-center">
              <input
                type="checkbox"
                id="autoDetectEnabled"
                checked={config.autoDetectEnabled}
                onChange={(e) =>
                  onChange({ autoDetectEnabled: e.target.checked })
                }
                className="rounded border-border-subtle text-primary focus:ring-primary"
              />
              <span className="ml-2">Auto-detect filter</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                id="commandDetectionEnabled"
                checked={config.commandDetectionEnabled}
                onChange={(e) =>
                  onChange({ commandDetectionEnabled: e.target.checked })
                }
                className="rounded border-border-subtle text-primary focus:ring-primary"
              />
              <span className="ml-2">Detect command type</span>
            </label>
          </div>
        </div>
      </div>
    </Card>
  );
}
