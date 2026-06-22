"use client";

import { useState, useEffect, useCallback } from "react";
import Card from "@/shared/components/Card";

export function ObservationList({ limit = 10 }) {
  const [observations, setObservations] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [observationsEnabled, setObservationsEnabled] = useState(true);
  const [purging, setPurging] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/settings/cmem/observations?limit=${limit}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (cancelled) return;
        if (!data) return;
        setObservations(data.observations || []);
        setTotal(data.total || 0);
        if (data.observationsEnabled !== undefined) {
          setObservationsEnabled(data.observationsEnabled);
        }
        setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [limit]);

  const handleToggleObservations = useCallback(async (enabled) => {
    setObservationsEnabled(enabled);
    try {
      const res = await fetch("/api/settings/cmem/observations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observationsEnabled: enabled }),
      });
      if (!res.ok) setObservationsEnabled(!enabled);
    } catch {
      setObservationsEnabled(!enabled);
    }
  }, []);

  const handlePurgeAll = useCallback(async () => {
    setPurging(true);
    try {
      await fetch("/api/settings/cmem/observations", { method: "DELETE" });
      setObservations([]);
      setTotal(0);
      setLoading(false);
      setPurging(false);
    } catch { setPurging(false); }
  }, []);

  const handleDeleteSingle = useCallback(async (id) => {
    try {
      await fetch(`/api/settings/cmem/observations?id=${id}`, { method: "DELETE" });
      setObservations(prev => prev.filter(o => o.id !== id));
      setTotal(prev => Math.max(0, prev - 1));
    } catch { /* silent */ }
  }, []);

  return (
    <Card className="flex min-w-0 flex-col gap-3 p-3 sm:p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-text-main font-semibold">Recent Observations</h3>
        <div className="flex items-center gap-3">
          <span className="text-text-muted text-xs">{total} total</span>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <span className="text-xs text-text-muted">Collect</span>
            <input
              type="checkbox"
              checked={observationsEnabled}
              onChange={(e) => handleToggleObservations(e.target.checked)}
              className="toggle toggle-primary toggle-sm"
            />
          </label>
          {total > 0 && (
            <button
              onClick={handlePurgeAll}
              disabled={purging}
              className="px-3 py-1 rounded-lg border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/10 disabled:opacity-50 transition-colors"
            >
              {purging ? "Purging..." : "Purge All"}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-text-muted">Loading...</div>
      ) : observations.length === 0 ? (
        <div className="text-sm text-text-muted">
          {!observationsEnabled
            ? "Observations collection is disabled. Toggle \"Collect\" above to enable."
            : "No observations yet. Enable CMEM and start coding."}
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {observations.map(obs => (
            <div key={obs.id} className="flex items-start gap-2 p-2 rounded border border-border-subtle text-xs group">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">{obs.type}</span>
                  <span className="font-medium text-text-main truncate">{obs.title || "Untitled"}</span>
                  <span className="ml-auto text-text-muted whitespace-nowrap">
                    {obs.createdAt ? new Date(obs.createdAt).toLocaleDateString() : ""}
                  </span>
                </div>
                <div className="mt-1 text-text-muted line-clamp-2">{obs.summary || obs.content?.slice(0, 200)}</div>
              </div>
              <button
                onClick={() => handleDeleteSingle(obs.id)}
                className="mt-0.5 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-all"
                title="Delete"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
