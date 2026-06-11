"use client";

import { useState, useEffect, useCallback } from "react";
import Card from "@/shared/components/Card";
import Toggle from "@/shared/components/Toggle";
import Input from "@/shared/components/Input";

function ProviderRow({ pid, p, onChangeMapping, customProviders, manualMappings }) {
  const [saving, setSaving] = useState(false);
  const [selectedCustom, setSelectedCustom] = useState(p.manualAlias || "");

  const handleSave = async () => {
    setSaving(true);
    try {
      const newMappings = { ...manualMappings };
      if (selectedCustom) {
        newMappings[pid] = selectedCustom;
      } else {
        delete newMappings[pid];
      }
      await onChangeMapping(newMappings);
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr className="border-b border-border/50">
      <td className="py-2">
        <span className="font-medium">{p.name}</span>
        <span className="text-text-muted ml-2 text-xs">({pid})</span>
      </td>
      <td className="py-2">{p.modelCount}</td>
      <td className="py-2">{p.matchedCount}</td>
      <td className="py-2">
        {p.autoAlias ? (
          <span className="text-success text-sm font-medium">{p.autoAlias}</span>
        ) : p.manualAlias ? (
          <span className="text-success text-sm font-medium">{p.manualAlias} (manual)</span>
        ) : (
          <span className="text-warning text-sm">Unmapped</span>
        )}
      </td>
      <td className="py-2">
        {!p.autoAlias ? (
          <div className="flex items-center gap-2">
            <select
              className="bg-surface border border-border rounded px-2 py-1 text-sm max-w-[180px]"
              value={selectedCustom}
              onChange={(e) => setSelectedCustom(e.target.value)}
            >
              <option value="">— Select custom provider —</option>
              {customProviders.map((cp) => (
                <option key={cp.id} value={cp.id}>
                  {cp.name} ({cp.type === "openai-compatible" ? "OAI" : "AC"})
                </option>
              ))}
            </select>
            <button
              onClick={handleSave}
              disabled={saving || selectedCustom === (p.manualAlias || "")}
              className="px-2 py-1 text-xs rounded bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        ) : (
          <span className="text-xs text-text-muted">Auto-mapped</span>
        )}
      </td>
    </tr>
  );
}

export default function ModelsDevSettingsPage() {
  const [enabled, setEnabled] = useState(false);
  const [preferPrices, setPreferPrices] = useState(false);
  const [autoSyncHours, setAutoSyncHours] = useState(24);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [customProviders, setCustomProviders] = useState([]);
  const [manualMappings, setManualMappings] = useState({});

  const loadStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusRes, mapRes] = await Promise.all([
        fetch("/api/models-dev"),
        fetch("/api/models-dev/custom-mappings"),
      ]);
      if (!statusRes.ok) throw new Error(await statusRes.text());
      const data = await statusRes.json();
      setEnabled(data.enabled);
      setPreferPrices(data.preferPrices);
      setAutoSyncHours(data.autoSyncHours);
      setStatus(data);
      setCustomProviders(data.customProviders || []);

      if (mapRes.ok) {
        const mapData = await mapRes.json();
        setManualMappings(mapData.manualMappings || {});
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStatus();
  }, []);

  const handleToggleEnabled = async (newVal) => {
    setEnabled(newVal);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelsDevEnabled: newVal }),
      });
      if (!res.ok) throw new Error("Failed to update");
      if (newVal) handleSync();
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
      setManualMappings({});
      await loadStatus();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleMappingChange = useCallback(async (newMappings) => {
    setError(null);
    try {
      const res = await fetch("/api/models-dev/custom-mappings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manualMappings: newMappings }),
      });
      if (!res.ok) throw new Error(await res.text());
      setManualMappings(newMappings);
      await loadStatus();
    } catch (err) {
      setError(err.message);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  const unmappedProviders = status?.providers
    ? Object.entries(status.providers).filter(([, p]) => !p.matched)
    : [];
  const mappedProviders = status?.providers
    ? Object.entries(status.providers).filter(([, p]) => p.matched)
    : [];
  const hasCustomProviders = customProviders.length > 0;

  return (
    <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Models.dev Pricing</h1>
        <Toggle checked={enabled} onChange={handleToggleEnabled} />
      </div>

      {error && (
        <div className="p-3 rounded bg-red-500/10 border border-red-500/30 text-red-500 text-sm">
          {error}
        </div>
      )}

      {!enabled && (
        <Card className="p-6 text-center">
          <p className="text-text-muted">Enable Models.dev to fetch public pricing data.</p>
        </Card>
      )}

      {enabled && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div>
                  <p className="font-medium">Prefer models.dev prices</p>
                  <p className="text-sm text-text-muted">
                    When enabled, models.dev prices override 9router defaults
                  </p>
                </div>
                <Toggle checked={preferPrices} onChange={handleTogglePrefer} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Auto-sync interval (hours)</p>
                  <p className="text-sm text-text-muted">How often to refresh data (1-168h)</p>
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

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Sync Status</h2>
                <p className="text-sm text-text-muted">
                  Last synced: {status?.lastSynced ? new Date(status.lastSynced).toLocaleString() : "Never"}
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

          {status?.providers && Object.keys(status.providers).length > 0 && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Provider Mapping</h2>
                {!hasCustomProviders && (
                  <span className="text-xs text-text-muted bg-surface border border-border rounded px-2 py-1">
                    Add custom providers in Dashboard → Providers first to enable manual mapping
                  </span>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-text-muted">
                      <th className="pb-2 font-medium">Provider</th>
                      <th className="pb-2 font-medium">Models</th>
                      <th className="pb-2 font-medium">Matched</th>
                      <th className="pb-2 font-medium">Mapped To</th>
                      <th className="pb-2 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unmappedProviders.map(([pid, p]) => (
                      <ProviderRow
                        key={pid}
                        pid={pid}
                        p={p}
                        customProviders={customProviders}
                        manualMappings={manualMappings}
                        onChangeMapping={handleMappingChange}
                      />
                    ))}
                    {mappedProviders.map(([pid, p]) => (
                      <ProviderRow
                        key={pid}
                        pid={pid}
                        p={p}
                        customProviders={customProviders}
                        manualMappings={manualMappings}
                        onChangeMapping={handleMappingChange}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
