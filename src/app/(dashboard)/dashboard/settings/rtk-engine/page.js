"use client";

import { useState, useEffect, useCallback } from "react";
import { IntensitySelector, FilterGrid, AdvancedSettings, TestPanel, StatsCards } from "@9router/components/rtk";

export default function RtkEnginePage() {
  const [rtkEnabled, setRtkEnabled] = useState(true);
  const [rtkConfig, setRtkConfig] = useState(null);
  const [filters, setFilters] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings/rtk")
      .then(res => res.json())
      .then(data => {
        setRtkEnabled(data.rtkEnabled);
        setRtkConfig(data.rtkConfig);
        setFilters(data.filters || []);
        setStats(data.stats || null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleConfigChange = useCallback((updates) => {
    setRtkConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/rtk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rtkConfig }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const data = await res.json();
      setRtkConfig(data.rtkConfig);
    } catch (err) {
      console.error("Failed to save RTK config:", err);
    } finally {
      setSaving(false);
    }
  }, [rtkConfig]);

  const handleReset = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/rtk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rtkConfig: {
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
          }
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setRtkConfig(data.rtkConfig);
      }
    } catch (err) {
      console.error("Failed to reset RTK config:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleToggleEnabled = useCallback(async (enabled) => {
    setRtkEnabled(enabled);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rtkEnabled: enabled }),
      });
    } catch (err) {
      console.error("Failed to toggle RTK:", err);
      setRtkEnabled(!enabled);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
      {/* Header + Master Switch */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">RTK Engine — Token Saver Configuration</h1>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-sm text-text-muted">Enabled</span>
          <input
            type="checkbox"
            checked={rtkEnabled}
            onChange={(e) => handleToggleEnabled(e.target.checked)}
            className="toggle toggle-primary"
          />
        </label>
      </div>

      {rtkEnabled && rtkConfig && (
        <>
          {/* Intensity */}
          <IntensitySelector
            value={rtkConfig.intensity || "moderate"}
            onChange={(intensity) => handleConfigChange({ intensity })}
          />

          {/* Filters */}
          <FilterGrid
            filters={filters}
            enabledFilters={rtkConfig.enabledFilters}
            intensity={rtkConfig.intensity || "moderate"}
            onChange={(enabledFilters) => handleConfigChange({ enabledFilters })}
          />

          {/* Advanced */}
          <AdvancedSettings
            config={rtkConfig}
            onChange={handleConfigChange}
          />

          {/* Test Panel */}
          <TestPanel rtkConfig={rtkConfig} />

          {/* Stats */}
          <StatsCards stats={stats} filters={filters} />

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              onClick={handleReset}
              className="px-6 py-2 rounded-lg border border-border-subtle text-text-muted hover:text-text-main hover:border-text-muted transition-colors"
            >
              Reset to Defaults
            </button>
          </div>
        </>
      )}

      {rtkEnabled && !rtkConfig && (
        <p className="text-text-muted">No RTK configuration loaded.</p>
      )}

      {!rtkEnabled && (
        <div className="rounded-lg border border-border-subtle p-8 text-center">
          <p className="text-text-muted mb-2">RTK Token Saver is disabled.</p>
          <p className="text-sm text-text-muted/60">Enable it above to configure compression settings.</p>
        </div>
      )}
    </div>
  );
}