"use client";

import { useState, useEffect, useCallback } from "react";
import { ModeSelector, TokenBudgetSlider, ContextSections, CmemTestPanel, CmemStatsCards, ObservationList } from "@9router/components";

export default function CmemEnginePage() {
  const [cmemEnabled, setCmemEnabled] = useState(false);
  const [cmemConfig, setCmemConfig] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings/cmem")
      .then(res => res.json())
      .then(data => {
        setCmemEnabled(data.cmemEnabled || false);
        setCmemConfig(data.cmemConfig || null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    fetch("/api/settings/cmem/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "stats" }),
    })
      .then(res => res.json())
      .then(data => setStats(data.stats || null))
      .catch(() => {});
  }, []);

  const handleConfigChange = useCallback((updates) => {
    setCmemConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/cmem", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cmemConfig }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const data = await res.json();
      setCmemConfig(data.cmemConfig);
    } catch (err) {
      console.error("Failed to save CMEM config:", err);
    } finally {
      setSaving(false);
    }
  }, [cmemConfig]);

  const handleReset = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/cmem", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cmemConfig: {
            mode: "code",
            tokenBudget: 4000,
            historyDepth: "session",
            maxObservations: 20,
            observationsEnabled: true,
            compressionModel: null,
            summarizationEnabled: true,
            searchMode: "fts",
            contextSections: ["recent", "relevant", "project-facts"],
            excludePrivateContent: true,
            observationRetentionDays: 90,
          }
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCmemConfig(data.cmemConfig);
      }
    } catch (err) {
      console.error("Failed to reset CMEM config:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleToggleEnabled = useCallback(async (enabled) => {
    setCmemEnabled(enabled);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cmemEnabled: enabled }),
      });
    } catch (err) {
      console.error("Failed to toggle CMEM:", err);
      setCmemEnabled(!enabled);
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
        <h1 className="text-2xl font-semibold">CMEM Engine — Memory Context Configuration</h1>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-sm text-text-muted">Enabled</span>
          <input
            type="checkbox"
            checked={cmemEnabled}
            onChange={(e) => handleToggleEnabled(e.target.checked)}
            className="toggle toggle-primary"
          />
        </label>
      </div>

      {cmemEnabled && cmemConfig && (
        <>
          <ModeSelector
            value={cmemConfig.mode || "code"}
            onChange={(mode) => handleConfigChange({ mode })}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TokenBudgetSlider
              value={cmemConfig.tokenBudget || 4000}
              onChange={(tokenBudget) => handleConfigChange({ tokenBudget })}
            />

            <ContextSections
              value={cmemConfig.contextSections || ["recent", "relevant", "project-facts"]}
              onChange={(contextSections) => handleConfigChange({ contextSections })}
            />
          </div>

          <CmemTestPanel cmemConfig={cmemConfig} />

          <CmemStatsCards stats={stats} />

          <ObservationList limit={10} />

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

      {cmemEnabled && !cmemConfig && (
        <p className="text-text-muted">No CMEM configuration loaded.</p>
      )}

      {!cmemEnabled && (
        <div className="rounded-lg border border-border-subtle p-8 text-center">
          <p className="text-text-muted mb-2">CMEM Memory Engine is disabled.</p>
          <p className="text-sm text-text-muted/60">Enable it above to configure memory context injection. Observations are stored locally in the app database.</p>
        </div>
      )}
    </div>
  );
}
