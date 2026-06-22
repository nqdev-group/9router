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
const fmtPct = (n) => `${(n || 0).toFixed(1)}%`;

export default function TokenSaverOverview({ stats, period }) {
  const rtk = stats?.rtk || {};
  const caveman = stats?.caveman || {};
  const cmem = stats?.cmem || {};
  const cache = stats?.responseCache || {};
  const combined = stats?.combined || {};

  const savingsPct = rtk.savingsPercent || 0;
  const cavemanSavingPct = caveman.estimatedSavingPercent || 0;
  const totalEstPct = combined.totalEstimatedSavingsPercent || 0;
  const cacheHitPct = parseFloat(cache.hitRate) || 0;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 sm:gap-4">
        <Card className="flex min-w-0 flex-col gap-1 px-4 py-3">
          <span className="text-text-muted text-sm uppercase font-semibold">RTK Input Saved</span>
          <span className="truncate text-2xl font-bold text-success">{fmtBytes(rtk.totalSaved)}</span>
          <span className="text-[10px] text-text-muted">{fmtPct(savingsPct)} of input tokens</span>
        </Card>
        <Card className="flex min-w-0 flex-col gap-1 px-4 py-3">
          <span className="text-text-muted text-sm uppercase font-semibold">RTK Requests</span>
          <span className="truncate text-2xl font-bold text-primary">{fmt(rtk.requestCount)}</span>
          <span className="text-[10px] text-text-muted">{fmt(rtk.totalHits)} filter hits</span>
        </Card>
        <Card className="flex min-w-0 flex-col gap-1 px-4 py-3">
          <span className="text-text-muted text-sm uppercase font-semibold">CMEM Memories</span>
          <span className="truncate text-2xl font-bold text-secondary">{fmt(cmem.observationsCount)}</span>
          <span className="text-[10px] text-text-muted">{fmt(cmem.injectionsCount)} context injections</span>
        </Card>
        <Card className="flex min-w-0 flex-col gap-1 px-4 py-3">
          <span className="text-text-muted text-sm uppercase font-semibold">Response Cache</span>
          <span className="truncate text-2xl font-bold text-success">{fmt(cache.hits || 0)}</span>
          <span className="text-[10px] text-text-muted">{fmtPct(cacheHitPct)} hit rate</span>
        </Card>
        <Card className="flex min-w-0 flex-col gap-1 px-4 py-3">
          <span className="text-text-muted text-sm uppercase font-semibold">Caveman Est. Saved</span>
          <span className="truncate text-2xl font-bold text-warning">{fmtBytes(caveman.totalOutputTokens)}</span>
          <span className="text-[10px] text-text-muted">~{fmtPct(cavemanSavingPct)} output savings</span>
        </Card>
        <Card className="flex min-w-0 flex-col gap-1 px-4 py-3">
          <span className="text-text-muted text-sm uppercase font-semibold">Total Est. Savings</span>
          <span className="truncate text-2xl font-bold text-info">{fmtPct(totalEstPct)}</span>
          <span className="text-[10px] text-text-muted">Combined input+output</span>
        </Card>
      </div>
    </div>
  );
}

TokenSaverOverview.propTypes = {
  stats: PropTypes.object.isRequired,
  period: PropTypes.string.isRequired,
};
