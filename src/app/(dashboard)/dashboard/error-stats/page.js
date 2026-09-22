"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import Card from "@/shared/components/Card";
import Badge from "@/shared/components/Badge";
import Button from "@/shared/components/Button";
import { ConfirmModal } from "@/shared/components";
import { ErrorFrequencyChart } from "@9router/components";

const EMPTY_CHART = { buckets: [], series: [] };
const EMPTY_MODEL_DATA = { buckets: [], series: [], failingModels: [] };

export default function ErrorStatsPage() {
  const [accountData, setAccountData] = useState(EMPTY_CHART);
  const [modelData, setModelData] = useState(EMPTY_MODEL_DATA);
  const [loading, setLoading] = useState(true);
  const [expandedModel, setExpandedModel] = useState(null);
  const [combosByModel, setCombosByModel] = useState({});
  const [confirmState, setConfirmState] = useState(null);
  const [removing, setRemoving] = useState(null);

  const load = useCallback(async () => {
    try {
      const [accRes, modRes] = await Promise.all([
        fetch("/api/error-stats/accounts"),
        fetch("/api/error-stats/models"),
      ]);
      if (accRes.ok) setAccountData(await accRes.json());
      if (modRes.ok) setModelData(await modRes.json());
    } catch {
      // silent fail — user can retry via the refresh button
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
            Error frequency over the last 7 days — provider/account and provider/model (per combo).
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
          <p className="px-4 py-6 text-text-muted text-sm">No model errors in the last 7 days.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-bg text-text-muted uppercase text-xs">
                <tr>
                  <th className="px-4 py-2 text-left">Combo</th>
                  <th className="px-4 py-2 text-left">Provider / Model</th>
                  <th className="px-4 py-2 text-right">Errors (7d)</th>
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
