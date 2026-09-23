"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import Card from "@/shared/components/Card";
import Badge from "@/shared/components/Badge";
import Button from "@/shared/components/Button";
import Select from "@/shared/components/Select";
import { ConfirmModal } from "@/shared/components";
import { ErrorFrequencyChart } from "@9router/components";

const EMPTY_CHART = { buckets: [], series: [] };
const EMPTY_MODEL_DATA = { buckets: [], series: [], failingModels: [] };

// Fixed time-range presets — "custom" reveals two datetime-local inputs instead.
const PRESETS = [
  { value: "6h", label: "6 giờ qua", ms: 6 * 60 * 60 * 1000 },
  { value: "24h", label: "24 giờ qua", ms: 24 * 60 * 60 * 1000 },
  { value: "3d", label: "3 ngày qua", ms: 3 * 24 * 60 * 60 * 1000 },
  { value: "7d", label: "7 ngày qua (tối đa)", ms: 7 * 24 * 60 * 60 * 1000 },
  { value: "custom", label: "Tuỳ chọn khoảng thời gian..." },
];

// datetime-local <input> wants "YYYY-MM-DDTHH:mm" in local time, no timezone suffix.
function toDatetimeLocalValue(epochMs) {
  const d = new Date(epochMs);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ErrorStatsPage() {
  const [accountData, setAccountData] = useState(EMPTY_CHART);
  const [modelData, setModelData] = useState(EMPTY_MODEL_DATA);
  const [loading, setLoading] = useState(true);
  const [expandedModel, setExpandedModel] = useState(null);
  const [combosByModel, setCombosByModel] = useState({});
  const [confirmState, setConfirmState] = useState(null);
  const [removing, setRemoving] = useState(null);

  const [preset, setPreset] = useState("7d");
  const [customFrom, setCustomFrom] = useState(""); // committed — triggers refetch
  const [customTo, setCustomTo] = useState("");
  const [customFromDraft, setCustomFromDraft] = useState(() => toDatetimeLocalValue(Date.now() - 24 * 60 * 60 * 1000));
  const [customToDraft, setCustomToDraft] = useState(() => toDatetimeLocalValue(Date.now()));

  // Recomputed on every load() call (not memoized against a stale "now") so a
  // fixed preset like "24 giờ qua" slides forward each time the user hits
  // Refresh, instead of replaying the exact window from when it was selected.
  function currentRange() {
    if (preset === "custom") {
      return {
        since: customFrom ? new Date(customFrom).getTime() : undefined,
        until: customTo ? new Date(customTo).getTime() : undefined,
      };
    }
    const ms = PRESETS.find((p) => p.value === preset)?.ms;
    return ms ? { since: Date.now() - ms, until: Date.now() } : {};
  }

  const load = useCallback(async () => {
    try {
      const { since, until } = currentRange();
      const qs = new URLSearchParams();
      if (since) qs.set("since", String(since));
      if (until) qs.set("until", String(until));
      const suffix = qs.toString() ? `?${qs}` : "";
      const [accRes, modRes] = await Promise.all([
        fetch(`/api/error-stats/accounts${suffix}`),
        fetch(`/api/error-stats/models${suffix}`),
      ]);
      if (accRes.ok) setAccountData(await accRes.json());
      if (modRes.ok) setModelData(await modRes.json());
    } catch {
      // silent fail — user can retry via the refresh button
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, customFrom, customTo]);

  useEffect(() => {
    load();
  }, [load]);

  function applyCustomRange() {
    setCustomFrom(customFromDraft);
    setCustomTo(customToDraft);
  }

  const toggleShowCombos = useCallback(
    async (modelStr) => {
      if (expandedModel === modelStr) {
        setExpandedModel(null);
        return;
      }
      setExpandedModel(modelStr);
      if (!combosByModel[modelStr]) {
        try {
          const res = await fetch(`/api/combos/using-model?model=${encodeURIComponent(modelStr)}`);
          const json = await res.json();
          setCombosByModel((prev) => ({ ...prev, [modelStr]: json.combos || [] }));
        } catch {
          setCombosByModel((prev) => ({ ...prev, [modelStr]: [] }));
        }
      }
    },
    [expandedModel, combosByModel]
  );

  function askRemove(modelStr) {
    const known = combosByModel[modelStr];
    const countLabel = known ? `${known.length} combo${known.length !== 1 ? "s" : ""}` : "every combo that declares it";
    setConfirmState({
      modelStr,
      title: "Remove model from all combos",
      message: `This removes "${modelStr}" from ${countLabel}. This cannot be undone.`,
    });
  }

  async function doRemove() {
    const modelStr = confirmState?.modelStr;
    setConfirmState(null);
    if (!modelStr) return;
    setRemoving(modelStr);
    try {
      await fetch("/api/combos/remove-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: modelStr }),
      });
      setCombosByModel((prev) => {
        const next = { ...prev };
        delete next[modelStr];
        return next;
      });
      setExpandedModel(null);
      await load();
    } finally {
      setRemoving(null);
    }
  }

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
        <div>
          <h1 className="text-2xl font-semibold">Error Stats</h1>
          <p className="text-sm text-text-muted/80 mt-1">
            Error frequency — provider/account and provider/model (per combo), up to the last 7 days.
            Backed by a dedicated error-log DB, separate from the app DB.
          </p>
        </div>
        <button
          onClick={load}
          className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-surface-2 transition-colors"
          title="Refresh now"
        >
          <span className="material-symbols-outlined text-[18px]">refresh</span>
        </button>
      </div>

      <Card padding="sm" className="flex flex-wrap items-end gap-3">
        <div className="w-56">
          <Select
            label="Time range"
            options={PRESETS.map((p) => ({ value: p.value, label: p.label }))}
            value={preset}
            onChange={(e) => setPreset(e.target.value)}
          />
        </div>
        {preset === "custom" && (
          <>
            <div>
              <label className="text-sm font-medium text-text-main block mb-1.5">From</label>
              <input
                type="datetime-local"
                value={customFromDraft}
                onChange={(e) => setCustomFromDraft(e.target.value)}
                className="py-2.5 px-3 text-sm bg-surface-2 border border-transparent rounded-[10px] focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/40"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-main block mb-1.5">To</label>
              <input
                type="datetime-local"
                value={customToDraft}
                onChange={(e) => setCustomToDraft(e.target.value)}
                className="py-2.5 px-3 text-sm bg-surface-2 border border-transparent rounded-[10px] focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/40"
              />
            </div>
            <Button size="md" variant="secondary" onClick={applyCustomRange}>
              Apply
            </Button>
          </>
        )}
      </Card>

      <ErrorFrequencyChart
        title="Account errors"
        description="Errors per hour, grouped by provider + account"
        buckets={accountData.buckets}
        series={accountData.series}
      />

      <ErrorFrequencyChart
        title="Model errors"
        description="Errors per hour, grouped by combo + provider/model"
        buckets={modelData.buckets}
        series={modelData.series}
      />

      <Card title="Failing models" padding="none">
        {modelData.failingModels.length === 0 ? (
          <p className="px-4 py-6 text-text-muted text-sm">No model errors in the selected time range.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-bg text-text-muted uppercase text-xs">
                <tr>
                  <th className="px-4 py-2 text-left">Combo</th>
                  <th className="px-4 py-2 text-left">Provider / Model</th>
                  <th className="px-4 py-2 text-right">Errors</th>
                  <th className="px-4 py-2 text-right">Last error</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {modelData.failingModels.map((row) => {
                  const modelStr = `${row.provider}/${row.model}`;
                  const rowKey = `${row.comboName}::${modelStr}`;
                  const isExpanded = expandedModel === modelStr;
                  const combos = combosByModel[modelStr];
                  return (
                    <Fragment key={rowKey}>
                      <tr className="hover:bg-bg/50">
                        <td className="px-4 py-2 font-mono">{row.comboName}</td>
                        <td className="px-4 py-2 font-mono">{modelStr}</td>
                        <td className="px-4 py-2 text-right">
                          <Badge variant="error" dot>{row.count}</Badge>
                        </td>
                        <td className="px-4 py-2 text-right text-text-muted">
                          {row.lastErrorAt ? new Date(row.lastErrorAt).toLocaleString() : "—"}
                        </td>
                        <td className="px-4 py-2 text-right space-x-2 whitespace-nowrap">
                          <Button size="sm" variant="ghost" onClick={() => toggleShowCombos(modelStr)}>
                            {isExpanded ? "Hide combos" : "Show combos"}
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={removing === modelStr}
                            onClick={() => askRemove(modelStr)}
                          >
                            Remove from all combos
                          </Button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={5} className="px-4 py-2 bg-bg/40 text-xs text-text-muted">
                            {combos === undefined
                              ? "Loading…"
                              : combos.length === 0
                              ? "No combo currently declares this model."
                              : `Used in: ${combos.map((c) => c.name).join(", ")}`}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ConfirmModal
        isOpen={!!confirmState}
        onClose={() => setConfirmState(null)}
        onConfirm={doRemove}
        title={confirmState?.title || "Confirm"}
        message={confirmState?.message}
        variant="danger"
      />
    </div>
  );
}
