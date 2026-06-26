"use client";

import PropTypes from "prop-types";
import Card from "@/shared/components/Card";

const fmt = (n) => new Intl.NumberFormat().format(n || 0);
const fmtBytes = (b) => {
  if (!b) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = b;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 ? 1 : 0)} ${units[i]}`;
};

const TYPE_LABELS = {
  note: "Notes",
  error: "Errors",
  preference: "Preferences",
  project: "Project",
  code: "Code",
  config: "Config",
};

const TYPE_COLORS = {
  note: "text-info",
  error: "text-red-500",
  preference: "text-warning",
  project: "text-secondary",
  code: "text-success",
  config: "text-text-muted",
};

export default function CmemContextStats({ stats }) {
  const cmem = stats?.cmem || {};
  const byType = cmem.byType || {};

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Card className="flex min-w-0 flex-1 flex-col gap-3 p-3 sm:p-4">
        <h3 className="text-text-main font-semibold">CMEM Context Memory</h3>
        <p className="text-xs text-text-muted">
          CMEM captures tool observations across sessions and injects relevant context
          into subsequent requests, reducing re-explanation overhead.
        </p>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-text-muted uppercase font-semibold">Memories</span>
            <span className="truncate text-lg font-bold text-secondary">{fmt(cmem.observationsCount)}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-text-muted uppercase font-semibold">Token Storage</span>
            <span className="truncate text-lg font-bold">{fmtBytes(cmem.totalTokens)}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-text-muted uppercase font-semibold">Context Injections</span>
            <span className="truncate text-lg font-bold text-primary">{fmt(cmem.injectionsCount)}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-text-muted uppercase font-semibold">Avg. Injection</span>
            <span className="truncate text-lg font-bold">{fmtBytes(cmem.avgInjectedTokens)}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-text-muted uppercase font-semibold">Tokens Saved (est.)</span>
            <span className="truncate text-lg font-bold text-success">{fmt(cmem.estimatedSavedTokens)}</span>
          </div>
        </div>
      </Card>

      {Object.keys(byType).length > 0 && (
        <Card className="flex min-w-0 flex-1 flex-col gap-3 p-3 sm:p-4">
          <h3 className="text-text-main font-semibold">Memory Type Breakdown</h3>
          <div className="flex flex-col gap-2">
            {Object.entries(byType).map(([type, count]) => {
              const label = TYPE_LABELS[type] || type;
              const color = TYPE_COLORS[type] || "text-text-main";
              const pct = cmem.observationsCount > 0
                ? ((count / cmem.observationsCount) * 100).toFixed(0)
                : "0";
              return (
                <div
                  key={type}
                  className="flex items-center justify-between rounded-lg bg-bg-subtle/30 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-bold ${color}`}>{fmt(count)}</span>
                    <span className="text-xs text-text-muted font-mono">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

CmemContextStats.propTypes = {
  stats: PropTypes.object.isRequired,
};
