"use client";

import { useState, useEffect } from "react";
import Card from "@/shared/components/Card";
import Toggle from "@/shared/components/Toggle";
import Input from "@/shared/components/Input";

export default function ModelsDevSettingsPage() {
  const [enabled, setEnabled] = useState(false);
  const [preferPrices, setPreferPrices] = useState(false);
  const [autoSyncHours, setAutoSyncHours] = useState(24);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/models-dev");
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setEnabled(data.enabled);
      setPreferPrices(data.preferPrices);
      setAutoSyncHours(data.autoSyncHours);
      setStatus(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEnabled = async (newVal) => {
    setEnabled(newVal);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelsDevEnabled: newVal }),
      });
      if (!res.ok) throw new Error("Failed to update");
      if (newVal) {
        handleSync();
      }
    } catch (err) {
      setEnabled(!newVal);
      setError(err.message);
    }
  };

  const handleTogglePrefer = async (newVal) => {
    setPreferPrices(newVal);
    try {
      const res = await fetch("/api/models-dev", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelsDevPreferPrices: newVal }),
      });
      if (!res.ok) throw new Error("Failed to update");
    } catch (err) {
      setPreferPrices(!newVal);
      setError(err.message);
    }
  };

  const handleSyncHours = async (hours) => {
    const val = Math.max(1, Math.min(168, parseInt(hours) || 24));
    setAutoSyncHours(val);
    try {
      const res = await fetch("/api/models-dev", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelsDevAutoSyncHours: val }),
      });
      if (!res.ok) throw new Error("Failed to update");
    } catch (err) {
      setAutoSyncHours(autoSyncHours);
      setError(err.message);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/models-dev/sync", { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      await loadStatus();
    } catch (err) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleClear = async () => {
    if (!confirm("Clear all cached models.dev pricing data?")) return;
    setError(null);
    try {
      const res = await fetch("/api/models-dev/sync", { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      await loadStatus();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Models.dev Pricing</h1>
          <p className="text-text-muted mt-1">
            Integrate public pricing from models.dev as independent data source
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded bg-red-500/10 border border-red-500/30 text-red-500 text-sm">
          {error}
        </div>
      )}

      {/* Enable Toggle */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Enable Models.dev Pricing</p>
            <p className="text-sm text-text-muted">
              Fetch and use public pricing data from models.dev as reference
            </p>
          </div>
          <Toggle
            checked={enabled}
            onChange={handleToggleEnabled}
          />
        </div>
      </Card>

      {enabled && (
        <>
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-text-muted text-sm uppercase font-semibold">Providers</div>
              <div className="text-2xl font-bold mt-1">{status?.providerCount ?? "—"}</div>
            </Card>
            <Card className="p-4">
              <div className="text-text-muted text-sm uppercase font-semibold">Models</div>
              <div className="text-2xl font-bold mt-1">{status?.modelCount ?? "—"}</div>
            </Card>
            <Card className="p-4">
              <div className="text-text-muted text-sm uppercase font-semibold">Mapped</div>
              <div className="text-2xl font-bold mt-1 text-success">{status?.mappedCount ?? "—"}</div>
            </Card>
            <Card className="p-4">
              <div className="text-text-muted text-sm uppercase font-semibold">Unmapped</div>
              <div className="text-2xl font-bold mt-1 text-warning">{status?.unmappedCount ?? "—"}</div>
            </Card>
          </div>

          {/* Settings */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div>
                  <p className="font-medium">Prefer models.dev prices</p>
                  <p className="text-sm text-text-muted">
                    When enabled, models.dev prices override 9router defaults for matched models
                  </p>
                </div>
                <Toggle
                  checked={preferPrices}
                  onChange={handleTogglePrefer}
                />
              </div>

              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div>
                  <p className="font-medium">Auto-sync interval (hours)</p>
                  <p className="text-sm text-text-muted">
                    How often to refresh data from models.dev (1-168h)
                  </p>
                </div>
                <div className="w-24">
                  <Input
                    type="number"
                    value={autoSyncHours}
                    onChange={(e) => handleSyncHours(e.target.value)}
                    min={1}
                    max={168}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Sync Controls */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">Sync Status</h2>
                <p className="text-sm text-text-muted">
                  Last synced: {status?.lastSynced
                    ? new Date(status.lastSynced).toLocaleString()
                    : "Never"}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleClear}
                  className="px-3 py-1.5 text-sm rounded border border-border-subtle text-text-muted hover:text-text-main transition-colors"
                >
                  Clear Data
                </button>
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="px-4 py-1.5 text-sm rounded bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {syncing ? "Syncing..." : "Sync Now"}
                </button>
              </div>
            </div>
          </Card>

          {/* Provider List */}
          {status?.providers && Object.keys(status.providers).length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Provider Overview</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-text-muted">
                      <th className="pb-2 font-medium">Provider</th>
                      <th className="pb-2 font-medium">Models</th>
                      <th className="pb-2 font-medium">Matched</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(status.providers).slice(0, 50).map(([id, p]) => (
                      <tr key={id} className="border-b border-border/50">
                        <td className="py-2">
                          <span className="font-medium">{p.name}</span>
                          <span className="text-text-muted ml-2 text-xs">({id})</span>
                        </td>
                        <td className="py-2">{p.modelCount}</td>
                        <td className="py-2">{p.matchedCount}</td>
                        <td className="py-2">
                          {p.matched ? (
                            <span className="text-success">✓ {p.alias}</span>
                          ) : (
                            <span className="text-warning">⚠ no match</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {!enabled && (
        <div className="rounded-lg border border-border-subtle p-8 text-center">
          <p className="text-text-muted mb-2">Models.dev pricing is disabled.</p>
          <p className="text-sm text-text-muted/60">
            Enable it above to fetch public pricing data from models.dev.
          </p>
        </div>
      )}
    </div>
  );
}
