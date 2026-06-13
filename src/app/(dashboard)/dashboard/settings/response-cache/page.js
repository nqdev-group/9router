"use client";

import { useState, useEffect, useCallback } from "react";
import Card from "@/shared/components/Card";

function fmt(n) {
  return new Intl.NumberFormat().format(n || 0);
}

function fmtMs(ms) {
  if (!ms) return "0s";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(0)}s`;
  return `${(ms / 60000).toFixed(0)}m`;
}

export default function ResponseCachePage() {
  const [enabled, setEnabled] = useState(false);
  const [maxSize, setMaxSize] = useState(100);
  const [ttlMs, setTtlMs] = useState(300000);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings/response-cache")
      .then(res => res.json())
      .then(data => {
        setEnabled(data.enabled || false);
        setMaxSize(data.maxSize || 100);
        setTtlMs(data.ttlMs || 300000);
        setStats(data.stats || null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/response-cache", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxSize, ttlMs }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const data = await res.json();
      setMaxSize(data.maxSize);
      setTtlMs(data.ttlMs);
      setStats(data.stats);
    } catch (err) {
      console.error("Failed to save response cache config:", err);
    } finally {
      setSaving(false);
    }
  }, [maxSize, ttlMs]);

  const handleReset = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/response-cache", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxSize: 100, ttlMs: 300000 }),
      });
      if (res.ok) {
        const data = await res.json();
        setMaxSize(data.maxSize);
        setTtlMs(data.ttlMs);
      }
    } catch (err) {
      console.error("Failed to reset response cache config:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleToggleEnabled = useCallback(async (val) => {
    setEnabled(val);
    try {
      await fetch("/api/settings/response-cache", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: val }),
      });
    } catch (err) {
      console.error("Failed to toggle response cache:", err);
      setEnabled(!val);
    }
  }, []);

  const handleClearCache = useCallback(async () => {
    try {
      await fetch("/api/settings/response-cache", { method: "DELETE" });
      setStats(null);
    } catch (err) {
      console.error("Failed to clear cache:", err);
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Response Cache — LLM Response Deduplication</h1>
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

      {enabled && (
        <>
          {/* Live Stats */}
          <Card title="Live Statistics" subtitle="Real-time cache performance" icon="monitoring">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-text-muted uppercase font-semibold">Cache Hits</span>
                <span className="truncate text-lg font-bold text-success">{fmt(stats?.hits || 0)}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-text-muted uppercase font-semibold">Cache Misses</span>
                <span className="truncate text-lg font-bold">{fmt(stats?.misses || 0)}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-text-muted uppercase font-semibold">Hit Rate</span>
                <span className="truncate text-lg font-bold text-primary">{stats?.hitRate || "0%"}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-text-muted uppercase font-semibold">Evictions</span>
                <span className="truncate text-lg font-bold text-warning">{fmt(stats?.evictions || 0)}</span>
              </div>
            </div>
          </Card>

          {/* Config */}
          <Card title="Cache Settings" subtitle="Configure cache capacity and TTL" icon="tune">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Max Entries</label>
                <input
                  type="number"
                  min={1}
                  max={10000}
                  value={maxSize}
                  onChange={(e) => setMaxSize(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full rounded-lg border border-border-subtle bg-bg-subtle px-3 py-2 text-sm"
                />
                <span className="text-xs text-text-muted">
                  Maximum number of cached responses (1 - 10,000)
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">TTL (ms)</label>
                <input
                  type="number"
                  min={1000}
                  max={86400000}
                  step={60000}
                  value={ttlMs}
                  onChange={(e) => setTtlMs(Math.max(1000, parseInt(e.target.value, 10) || 1000))}
                  className="w-full rounded-lg border border-border-subtle bg-bg-subtle px-3 py-2 text-sm"
                />
                <span className="text-xs text-text-muted">
                  Time-to-live per entry: {fmtMs(ttlMs)} ({(ttlMs / 60000).toFixed(0)} minutes)
                </span>
              </div>
            </div>
          </Card>

          {/* How It Works */}
          <Card title="How It Works" subtitle="Response cache behavior" icon="info">
            <div className="flex flex-col gap-2 text-sm text-text-muted">
              <p>
                <strong>Cache Key:</strong> A hash of (model, messages, temperature, max_tokens, top_p).
                Identical requests to the same model with the same content hit the cache.
              </p>
              <p>
                <strong>Eviction:</strong> LRU (Least Recently Used). When the cache is full, the oldest
                entry is removed to make room for new ones.
              </p>
              <p>
                <strong>TTL:</strong> Each entry expires after the configured time-to-live.
                Expired entries are lazily evicted on the next access.
              </p>
              <p>
                <strong>Scope:</strong> The cache lives in-process memory (not persisted to disk).
                It resets when the server restarts. Non-streaming responses only.
              </p>
            </div>
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
            <button
              onClick={handleClearCache}
              className="px-6 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
            >
              Clear Cache Now
            </button>
          </div>
        </>
      )}

      {!enabled && (
        <div className="rounded-lg border border-border-subtle p-8 text-center">
          <p className="text-text-muted mb-2">Response Cache is disabled.</p>
          <p className="text-sm text-text-muted/60">
            Enable it above to cache identical LLM responses. This saves tokens and reduces latency
            for repeated requests within the TTL window.
          </p>
        </div>
      )}
    </div>
  );
}
