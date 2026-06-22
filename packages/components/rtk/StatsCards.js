"use client";

import Card from "@/shared/components/Card";

export function StatsCards({ stats, filters }) {
  if (!stats) {
    return (
      <Card title="Token Savings Analytics" subtitle="Loading..." icon="analytics">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 mx-auto mb-4 border-b-2 border-primary" />
          <p className="text-sm text-text-muted">Fetching statistics...</p>
        </div>
      </Card>
    );
  }

  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const formatPercent = (num) => {
    return num ? `${num.toFixed(1)}%` : "0%";
  };

  // Calculate total savings from byFilter if available, otherwise use totalSaved
  const totalSaved =
    stats.totalSaved !== undefined
      ? stats.totalSaved
      : Object.values(stats.byFilter || {}).reduce(
          (sum, filterStats) => sum + (filterStats.bytes || 0),
          0
        );

  const totalBefore =
    stats.totalBefore !== undefined
      ? stats.totalBefore
      : Object.values(stats.byFilter || {}).reduce(
          (sum, filterStats) => sum + (filterStats.bytesBefore || 0),
          0
        );

  const savingsPercent =
    totalBefore > 0 ? ((totalSaved / totalBefore) * 100).toFixed(1) : 0;

  // Get top 5 filters by savings
  const topFilters =
    stats.byFilter &&
    Object.entries(stats.byFilter)
      .map(([id, filterStats]) => ({
        id,
        name:
          filters.find((f) => f.id === id)?.name ||
          id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        savings: filterStats.bytes || 0,
        hits: filterStats.hits || 0,
      }))
      .sort((a, b) => b.savings - a.savings)
      .slice(0, 5) || [];

  return (
    <Card title="Token Savings Analytics" subtitle="Track RTK compression savings" icon="analytics">
      <div className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="p-4">
            <span className="text-text-muted text-sm uppercase font-semibold">Total Saved</span>
            <span className="block text-2xl font-bold text-success">
              {formatBytes(totalSaved)}
            </span>
          </Card>
          <Card className="p-4">
            <span className="text-text-muted text-sm uppercase font-semibold">Savings Rate</span>
            <span className="block text-2xl font-bold text-primary">
              {formatPercent(savingsPercent)}
            </span>
          </Card>
          <Card className="p-4">
            <span className="text-text-muted text-sm uppercase font-semibold">Total Requests</span>
            <span className="block text-2xl font-bold">
              {(stats.totalRequests || 0).toLocaleString()}
            </span>
          </Card>
          <Card className="p-4">
            <span className="text-text-muted text-sm uppercase font-semibold">Avg per Request</span>
            <span className="block text-2xl font-bold">
              {totalBefore > 0
                ? formatBytes(Math.round(totalBefore / (stats.totalRequests || 1)))
                : "0 B"}
            </span>
          </Card>
        </div>

        {/* Period Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            className={`px-3 py-1 rounded text-sm font-medium ${
              stats.period === "today"
                ? "bg-primary text-white"
                : "bg-bg text-text-muted hover:bg-surface-2"
            }`}
            onClick={() => {
              // Would need to fetch new stats for period - placeholder
              console.log("Switch to today");
            }}
          >
            Today
          </button>
          <button
            className={`px-3 py-1 rounded text-sm font-medium ${
              stats.period === "7d"
                ? "bg-primary text-white"
                : "bg-bg text-text-muted hover:bg-surface-2"
            }`}
            onClick={() => {
              console.log("Switch to 7d");
            }}
          >
            7D
          </button>
          <button
            className={`px-3 py-1 rounded text-sm font-medium ${
              stats.period === "30d"
                ? "bg-primary text-white"
                : "bg-bg text-text-muted hover:bg-surface-2"
            }`}
            onClick={() => {
              console.log("Switch to 30d");
            }}
          >
            30D
          </button>
        </div>

        {/* Top Filters */}
        {topFilters.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-text-main mb-1">Top Filters by Savings</p>
            <div className="space-y-2">
              {topFilters.map((filter, index) => (
                <div key={filter.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-bg">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{filter.name}</span>
                    <span className="text-xs text-text-muted ml-2">
                      {filter.hits} hits
                    </span>
                  </div>
                  <div className="text-right text-sm font-mono">
                    {formatBytes(filter.savings)}
                  </div>
                  <div className="w-2 h-2 rounded-full bg-primary/20">
                    <div
                      className={`h-2 w-full rounded-full bg-primary ${
                        index === 0 ? "w-full" : `${Math.min(
                          (filter.savings / topFilters[0].savings) * 100,
                          100
                        )}%`
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Savings Trend (placeholder) */}
        <div className="border-t border-border-subtle pt-4">
          <p className="text-xs font-semibold text-text-main mb-2">
            Savings Trend (last 30 days)
          </p>
          <div className="h-12 bg-bg rounded overflow-hidden">
            <div className="h-full w-1/2 bg-primary rounded-r" />
          </div>
          <p className="text-xs text-text-muted mt-1 text-center">
            32% avg savings over last 30 days
          </p>
        </div>
      </div>
    </Card>
  );
}
