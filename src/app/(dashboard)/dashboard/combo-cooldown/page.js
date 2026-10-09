"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Card from "@/shared/components/Card";
import Badge from "@/shared/components/Badge";
import Select from "@/shared/components/Select";

const POLL_INTERVAL_MS = 5000;

function cooldownKey(comboName, model) {
  return `${comboName}::${model}`;
}

function formatRemaining(expiresAt, now) {
  const diff = expiresAt - now;
  if (diff <= 0) return "";
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

export default function ComboCooldownPage() {
  const [combos, setCombos] = useState([]);
  const [cooldowns, setCooldowns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const [selectedCombo, setSelectedCombo] = useState("");

  const loadCombos = useCallback(async () => {
    try {
      const res = await fetch("/api/combos");
      if (res.ok) {
        const json = await res.json();
        setCombos(json.combos || []);
      }
    } catch {
      // silent fail — combo list is not time-sensitive, next mount retries
    }
  }, []);

  const loadCooldowns = useCallback(async () => {
    try {
      const res = await fetch("/api/combos/cooldowns");
      if (res.ok) {
        const json = await res.json();
        setCooldowns(json.cooldowns || []);
      }
    } catch {
      // silent fail — will retry on next poll tick
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCombos();
    loadCooldowns();
    const interval = setInterval(loadCooldowns, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadCombos, loadCooldowns]);

  // Live-ticking countdowns between polls, without hitting the API every second
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  const cooldownMap = useMemo(() => {
    const map = {};
    for (const c of cooldowns) map[cooldownKey(c.comboName, c.model)] = c.expiresAt;
    return map;
  }, [cooldowns]);

  const combosWithModels = useMemo(
    () => combos.filter((c) => Array.isArray(c.models) && c.models.length > 0),
    [combos]
  );

  // Auto-select the first combo once the list loads, so the grid always has
  // something to show without requiring an extra click.
  useEffect(() => {
    if (!selectedCombo && combosWithModels.length > 0) {
      setSelectedCombo(combosWithModels[0].name);
    }
  }, [selectedCombo, combosWithModels]);

  const comboOptions = useMemo(
    () => combosWithModels.map((c) => ({ value: c.name, label: c.name })),
    [combosWithModels]
  );

  const activeCombo = useMemo(
    () => combosWithModels.find((c) => c.name === selectedCombo) || null,
    [combosWithModels, selectedCombo]
  );

  const affectedCount = cooldowns.length;
  const affectedCombos = useMemo(() => new Set(cooldowns.map((c) => c.comboName)).size, [cooldowns]);

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
        <h1 className="text-2xl font-semibold">Combo Cooldown</h1>
        <button
          onClick={loadCooldowns}
          className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-surface-2 transition-colors"
          title="Refresh now"
        >
          <span className="material-symbols-outlined text-[18px]">refresh</span>
        </button>
      </div>

      <p className="text-sm text-text-muted/80 -mt-4">
        When a model fails inside a combo, it is skipped in that same combo for 5 minutes
        (fallback/round-robin combos only, not Fusion) before automatically rejoining rotation.
        This page reads live in-memory state — it resets if the server restarts.
      </p>

      <p className="text-sm text-text-muted">
        {affectedCount === 0
          ? "No models are currently cooling down."
          : `${affectedCount} model${affectedCount !== 1 ? "s" : ""} cooling down across ${affectedCombos} combo${affectedCombos !== 1 ? "s" : ""}.`}
      </p>

      {combosWithModels.length === 0 && (
        <Card padding="md">
          <p className="text-text-muted">No combos configured yet.</p>
        </Card>
      )}

      {combosWithModels.length > 0 && (
        <Select
          label="Combo"
          value={selectedCombo}
          onChange={(e) => setSelectedCombo(e.target.value)}
          options={comboOptions}
          placeholder="Select a combo"
          className="max-w-xs"
        />
      )}

      {activeCombo && (() => {
        const rows = activeCombo.models.map((model) => ({
          model,
          expiresAt: cooldownMap[cooldownKey(activeCombo.name, model)] || null,
        }));
        const hasCooldown = rows.some((r) => r.expiresAt);

        return (
          <Card title={activeCombo.name} padding="none">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-bg text-text-muted uppercase text-xs">
                  <tr>
                    <th className="px-4 py-2 text-left">Model</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-right">Cooldown ends</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {rows.map((r) => {
                    const remaining = r.expiresAt ? formatRemaining(r.expiresAt, now) : "";
                    const isCooling = !!remaining;
                    return (
                      <tr key={r.model} className="hover:bg-bg/50">
                        <td className="px-4 py-2 font-mono">{r.model}</td>
                        <td className="px-4 py-2">
                          {isCooling ? (
                            <Badge variant="warning" dot icon="schedule">
                              Cooling down &middot; {remaining}
                            </Badge>
                          ) : (
                            <Badge variant="success" dot>
                              Active
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right text-text-muted">
                          {r.expiresAt ? new Date(r.expiresAt).toLocaleTimeString() : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!hasCooldown && (
              <p className="px-4 py-2 text-xs text-text-muted/70">All models active — no recent failures.</p>
            )}
          </Card>
        );
      })()}
    </div>
  );
}
