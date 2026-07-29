"use client";

import PropTypes from "prop-types";
import Card from "@/shared/components/Card";

const fmt = (n) => new Intl.NumberFormat().format(n || 0);
const fmtPct = (n) => `${(n || 0).toFixed(0)}%`;

const LEVEL_LABELS = {
  lite: "Lite (~20%)",
  full: "Full (~40%)",
  ultra: "Ultra (~60%)",
  max: "Max (~80%)",
};

const LEVEL_VALUES = { lite: 20, full: 40, ultra: 60, max: 80 };

export default function CavemanLevelHistory({ stats }) {
  const caveman = stats?.caveman || {};
  const level = caveman.level || "off";
  const levelLabel = LEVEL_LABELS[level] || "Off";
  const savingPct = caveman.estimatedSavingPercent || 0;
  const totalOutput = caveman.totalOutputTokens || 0;
  const estimatedSaved = caveman.estimatedSavedTokens || 0;
  const estimatedWithout = caveman.estimatedOutputWithoutCaveman || 0;

  return (
    <div className="flex min-w-0 flex-col gap-6 lg:flex-row">
      <Card className="flex min-w-0 flex-1 flex-col gap-3 p-3 sm:p-4">
        <h3 className="text-text-main font-semibold">Caveman Savings (Estimated)</h3>
        <p className="text-xs text-text-muted">
          Caveman reduces output tokens by injecting a terse-prompt. Savings are estimated
          based on current level and actual output volume.
        </p>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-text-muted uppercase font-semibold">Current Level</span>
            <span className="text-lg font-bold text-warning">{levelLabel}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-text-muted uppercase font-semibold">Est. Saving</span>
            <span className="text-lg font-bold text-success">{fmtPct(savingPct)}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-text-muted uppercase font-semibold">Output Tokens</span>
            <span className="text-lg font-bold">{fmt(totalOutput)}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-text-muted uppercase font-semibold">Est. Saved Tokens</span>
            <span className="text-lg font-bold text-primary">{fmt(estimatedSaved)}</span>
          </div>
        </div>
      </Card>

      <Card className="flex min-w-0 flex-1 flex-col gap-3 p-3 sm:p-4">
        <h3 className="text-text-main font-semibold">Level Impact</h3>
        <div className="flex flex-col gap-2">
          {Object.entries(LEVEL_LABELS).map(([key, label]) => {
            const pct = LEVEL_VALUES[key];
            const isCurrent = key === level;
            const estTokens = Math.round((estimatedWithout * pct) / 100);
            return (
              <div
                key={key}
                className={`flex items-center justify-between rounded-lg px-3 py-2 transition-colors ${
                  isCurrent
                    ? "bg-warning/10 border border-warning/30"
                    : "bg-bg-subtle/30 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${isCurrent ? "text-warning" : "text-text-main"}`}>
                    {label}
                  </span>
                  {isCurrent && (
                    <span className="text-[10px] bg-warning text-white px-1.5 py-0.5 rounded font-semibold">
                      Active
                    </span>
                  )}
                </div>
                <span className="text-sm font-mono text-text-muted">
                  ~{fmt(estTokens)} tokens
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

CavemanLevelHistory.propTypes = {
  stats: PropTypes.object.isRequired,
};
