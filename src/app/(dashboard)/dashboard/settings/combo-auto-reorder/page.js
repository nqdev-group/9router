"use client";

import { useState, useEffect, useCallback } from "react";
import Card from "@/shared/components/Card";
import Badge from "@/shared/components/Badge";
import Button from "@/shared/components/Button";

const MS_PER_MIN = 60 * 1000;

export default function ComboAutoReorderPage() {
  const [enabled, setEnabled] = useState(false);
  const [failThreshold, setFailThreshold] = useState(10);
  const [windowMin, setWindowMin] = useState(60);
  const [intervalMin, setIntervalMin] = useState(5);
  const [saveMessage, setSaveMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [demoted, setDemoted] = useState([]);
  const [statusLoading, setStatusLoading] = useState(false);
  const [restoringKey, setRestoringKey] = useState(null);

  const loadStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const res = await fetch("/api/combo-auto-reorder/status");
      const data = await res.json();
      setDemoted(data.demoted || []);
    } catch (err) {
      console.error("Failed to load combo auto-reorder status:", err);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/combo-auto-reorder");
      const data = await res.json();
      setEnabled(!!data.comboAutoReorderEnabled);
      setFailThreshold(data.comboAutoReorderFailThreshold ?? 10);
      setWindowMin(Math.round((data.comboAutoReorderWindowMs ?? 3600000) / MS_PER_MIN));
      setIntervalMin(Math.round((data.comboAutoReorderIntervalMs ?? 300000) / MS_PER_MIN));
      if (data.comboAutoReorderEnabled) await loadStatus();
    } catch (err) {
      console.error("Failed to load combo auto-reorder config:", err);
    } finally {
      setLoading(false);
    }
  }, [loadStatus]);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const handleRestore = useCallback(async (comboName, provider, model) => {
    const rowKey = `${comboName}::${provider}/${model}`;
    setRestoringKey(rowKey);
    try {
      const res = await fetch("/api/combo-auto-reorder/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comboName, provider, model }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Restore failed");
      await loadStatus();
    } catch (err) {
      console.error("Failed to restore model:", err);
      setSaveMessage(err.message || "Restore failed.");
      setTimeout(() => setSaveMessage(""), 3000);
    } finally {
      setRestoringKey(null);
    }
  }, [loadStatus]);

  const handleToggleEnabled = useCallback(async (val) => {
    setEnabled(val);
    try {
      await fetch("/api/settings/combo-auto-reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comboAutoReorderEnabled: val }),
      });
    } catch {
      setEnabled(!val);
    }
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveMessage("");
    try {
      const res = await fetch("/api/settings/combo-auto-reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comboAutoReorderEnabled: enabled,
          comboAutoReorderFailThreshold: Number(failThreshold),
          comboAutoReorderWindowMs: Number(windowMin) * MS_PER_MIN,
          comboAutoReorderIntervalMs: Number(intervalMin) * MS_PER_MIN,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (data.details || []).join(", ") || "Failed to save");
      setEnabled(data.comboAutoReorderEnabled);
      setFailThreshold(data.comboAutoReorderFailThreshold);
      setWindowMin(Math.round(data.comboAutoReorderWindowMs / MS_PER_MIN));
      setIntervalMin(Math.round(data.comboAutoReorderIntervalMs / MS_PER_MIN));
      setSaveMessage("Settings saved. Sweep interval change takes effect after server restart.");
      setTimeout(() => setSaveMessage(""), 4000);
    } catch (err) {
      console.error("Failed to save combo auto-reorder config:", err);
      setSaveMessage(err.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }, [enabled, failThreshold, windowMin, intervalMin]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Combo Auto-Reorder</h1>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-sm text-text-muted">Enabled</span>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => handleToggleEnabled(e.target.checked)}
            className="toggle toggle-primary"
          />
        </label>
      </div>

      <p className="text-sm text-text-muted/80 -mt-4">
        When enabled, a background sweep periodically checks every combo for models whose
        fail count exceeds the threshold below within a rolling time window, and moves
        those models to the end of that combo&apos;s model list — so healthier models are
        tried first. This only reorders; it never removes a model from the combo.
        Independent from the short-lived per-request cooldown (skips a model for 5 minutes
        right after a single failure) — this instead persists a demotion based on a
        sustained fail rate.
      </p>

      {enabled && (
        <>
          <Card title="Fail-rate threshold" subtitle="Fails within the rolling window that trigger a demote" icon="report">
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={failThreshold}
                onChange={(e) => setFailThreshold(e.target.value)}
                min={1}
                step={1}
                className="w-24 px-3 py-2 rounded-lg bg-bg border border-border-subtle text-sm focus:outline-none focus:border-primary"
              />
              <span className="text-sm text-text-muted">fails</span>
            </div>
          </Card>

          <Card title="Rolling window" subtitle="Time span the fail count is measured over" icon="schedule">
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={windowMin}
                onChange={(e) => setWindowMin(e.target.value)}
                min={1}
                step={1}
                className="w-24 px-3 py-2 rounded-lg bg-bg border border-border-subtle text-sm focus:outline-none focus:border-primary"
              />
              <span className="text-sm text-text-muted">minutes</span>
            </div>
          </Card>

          <Card title="Sweep interval" subtitle="How often the background check runs — takes effect after server restart" icon="timer">
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={intervalMin}
                onChange={(e) => setIntervalMin(e.target.value)}
                min={1}
                step={1}
                className="w-24 px-3 py-2 rounded-lg bg-bg border border-border-subtle text-sm focus:outline-none focus:border-primary"
              />
              <span className="text-sm text-text-muted">minutes</span>
            </div>
          </Card>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            {saveMessage && (
              <span className="text-sm text-emerald-600 dark:text-emerald-400">{saveMessage}</span>
            )}
          </div>

          <Card
            title="Currently demoted models"
            subtitle="Models over the threshold right now — they'll naturally move back once their fail count drops below threshold, or restore one immediately below"
            icon="low_priority"
            padding="none"
            action={
              <button
                onClick={loadStatus}
                disabled={statusLoading}
                className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-surface-2 transition-colors"
                title="Refresh now"
              >
                <span className="material-symbols-outlined text-[18px]">refresh</span>
              </button>
            }
          >
            {demoted.length === 0 ? (
              <p className="px-4 py-6 text-text-muted text-sm">No model is currently over the threshold.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-bg text-text-muted uppercase text-xs">
                    <tr>
                      <th className="px-4 py-2 text-left">Combo</th>
                      <th className="px-4 py-2 text-left">Provider / Model</th>
                      <th className="px-4 py-2 text-right">Fails (window)</th>
                      <th className="px-4 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {demoted.map((row) => {
                      const rowKey = `${row.comboName}::${row.provider}/${row.model}`;
                      return (
                        <tr key={rowKey} className="hover:bg-bg/50">
                          <td className="px-4 py-2 font-mono">{row.comboName}</td>
                          <td className="px-4 py-2 font-mono">{row.provider}/{row.model}</td>
                          <td className="px-4 py-2 text-right">
                            <Badge variant="error" dot>{row.count}</Badge>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={restoringKey === rowKey}
                              onClick={() => handleRestore(row.comboName, row.provider, row.model)}
                            >
                              {restoringKey === rowKey ? "Restoring..." : "Restore now"}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {!enabled && (
        <div className="rounded-lg border border-border-subtle p-8 text-center">
          <p className="text-text-muted mb-2">Combo Auto-Reorder is disabled.</p>
          <p className="text-sm text-text-muted/60">Enable it above to configure the fail-rate threshold and sweep timing.</p>
        </div>
      )}
    </div>
  );
}
