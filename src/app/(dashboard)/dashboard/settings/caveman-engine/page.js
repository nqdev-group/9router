"use client";

import { useState, useEffect, useCallback } from "react";
import { LevelSelector, InfoPanel, TestPanel as CavemanTestPanel } from "@9router/components";
import Card from "@/shared/components/Card";

export default function CavemanEnginePage() {
  const [cavemanEnabled, setCavemanEnabled] = useState(false);
  const [cavemanLevel, setCavemanLevel] = useState(""); // e.g., "eco", "medium", "max"
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings/caveman")
      .then(res => res.json())
      .then(data => {
        setCavemanEnabled(data.cavemanEnabled);
        setCavemanLevel(data.cavemanLevel || "");
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleLevelChange = useCallback((level) => {
    setCavemanLevel(level);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/caveman", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cavemanLevel }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const data = await res.json();
      setCavemanLevel(data.cavemanLevel);
    } catch (err) {
      console.error("Failed to save caveman config:", err);
    } finally {
      setSaving(false);
    }
  }, [cavemanLevel]);

  const handleReset = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/caveman", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cavemanLevel: "medium", // default level
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCavemanLevel(data.cavemanLevel);
      }
    } catch (err) {
      console.error("Failed to reset caveman config:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleToggleEnabled = useCallback(async (enabled) => {
    setCavemanEnabled(enabled);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cavemanEnabled: enabled }),
      });
    } catch (err) {
      console.error("Failed to toggle caveman:", err);
      setCavemanEnabled(!enabled);
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
        <h1 className="text-2xl font-semibold">Caveman Engine — Response Conciseness Configuration</h1>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-sm text-text-muted">Enabled</span>
          <input
            type="checkbox"
            checked={cavemanEnabled}
            onChange={(e) => handleToggleEnabled(e.target.checked)}
            className="toggle toggle-primary"
          />
        </label>
      </div>

      {cavemanEnabled && (
        <>
          {/* Level Selector */}
          <Card title="Caveman Level" subtitle="Choose conciseness level" icon="cpu">
            <LevelSelector value={cavemanLevel} onChange={handleLevelChange} />
          </Card>

          {/* Info Panel */}
          <Card title="How It Works" subtitle="Learn about caveman speak" icon="info">
            <InfoPanel level={cavemanLevel} />
          </Card>

          {/* Test Panel */}
          <Card title="Test Caveman" subtitle="Preview the injection prompt" icon="science">
            <CavemanTestPanel level={cavemanLevel} />
          </Card>

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

      {!cavemanEnabled && (
        <div className="rounded-lg border border-border-subtle p-8 text-center">
          <p className="text-text-muted mb-2">Caveman Engine is disabled.</p>
          <p className="text-sm text-text-muted/60">Enable it above to configure conciseness level.</p>
        </div>
      )}
    </div>
  );
}
