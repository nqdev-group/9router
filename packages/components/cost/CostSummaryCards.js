"use client";

import PropTypes from "prop-types";
import Card from "@/shared/components/Card";

const fmt = (n) => new Intl.NumberFormat().format(n || 0);
const fmtCost = (n) => `$${(n || 0).toFixed(2)}`;

export default function CostSummaryCards({ stats, period }) {
  const totalCost = stats?.totalCost || 0;
  const totalRequests = stats?.totalRequests || 0;
  const dailyAvg = totalCost / (period === "today" ? 1 : period === "24h" ? 1 : period === "7d" ? 7 : period === "30d" ? 30 : period === "60d" ? 60 : 1);
  const projectedMonthly = dailyAvg * 30;

  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 sm:gap-4">
      <Card className="flex min-w-0 flex-col gap-1 px-4 py-3">
        <span className="text-text-muted text-sm uppercase font-semibold">Total Cost</span>
        <span className="truncate text-2xl font-bold text-warning">{fmtCost(totalCost)}</span>
        <span className="text-[10px] text-text-muted">Estimated, not actual billing</span>
      </Card>
      <Card className="flex min-w-0 flex-col gap-1 px-4 py-3">
        <span className="text-text-muted text-sm uppercase font-semibold">Daily Average</span>
        <span className="truncate text-2xl font-bold text-primary">{fmtCost(dailyAvg)}</span>
      </Card>
      <Card className="flex min-w-0 flex-col gap-1 px-4 py-3">
        <span className="text-text-muted text-sm uppercase font-semibold">Projected Monthly</span>
        <span className="truncate text-2xl font-bold text-success">{fmtCost(projectedMonthly)}</span>
      </Card>
      <Card className="flex min-w-0 flex-col gap-1 px-4 py-3">
        <span className="text-text-muted text-sm uppercase font-semibold">Total Requests</span>
        <span className="truncate text-2xl font-bold">{fmt(totalRequests)}</span>
      </Card>
    </div>
  );
}

CostSummaryCards.propTypes = {
  stats: PropTypes.object.isRequired,
  period: PropTypes.string.isRequired,
};
