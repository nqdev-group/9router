"use client";

import PropTypes from "prop-types";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
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

const COLORS = ["#10b981", "#6366f1", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#84cc16", "#06b6d4"];

const FILTER_LABELS = {
  "git-diff": "Git Diff",
  "git-status": "Git Status",
  grep: "Grep",
  find: "Find",
  ls: "LS",
  tree: "Tree",
  "dedup-log": "Dedup Log",
  "smart-truncate": "Smart Truncate",
  "read-numbered": "Read Numbered",
  "search-list": "Search List",
};

export default function RtkFilterBreakdown({ stats }) {
  const topFilters = stats?.rtk?.topFilters || [];
  const sorted = [...topFilters].sort((a, b) => b.saved - a.saved);
  const chartData = sorted.map((f) => ({
    name: FILTER_LABELS[f.filter] || f.filter,
    value: f.saved || 0,
    hits: f.hits || 0,
  }));

  return (
    <div className="flex min-w-0 flex-col gap-6 lg:flex-row">
      <Card className="flex min-w-0 flex-1 flex-col gap-3 p-3 sm:p-4">
        <h3 className="text-text-main font-semibold">RTK Savings by Filter</h3>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <span className="text-text-muted">No filter data available</span>
          </div>
        ) : (
          <div className="relative flex justify-center">
            <PieChart width={350} height={300}>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                labelLine={false}
                label={({ name, percent }) =>
                  (percent || 0) * 100 > 3 ? `${((percent || 0) * 100).toFixed(0)}%` : ""
                }
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-bg)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value, name) => [fmtBytes(value), name]}
              />
              <Legend
                verticalAlign="top"
                height={36}
                formatter={(name) => <span className="text-xs">{name}</span>}
              />
            </PieChart>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden flex-1">
        <div className="p-4 border-b border-border bg-bg-subtle/50">
          <h3 className="font-semibold">Filter Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-bg-subtle/30 text-text-muted uppercase text-xs">
              <tr>
                <th className="px-6 py-3">Filter</th>
                <th className="px-6 py-3 text-right">Bytes Saved</th>
                <th className="px-6 py-3 text-right">Hits</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {chartData.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-text-muted">
                    No filter data available
                  </td>
                </tr>
              ) : (
                chartData.map((item, i) => (
                  <tr key={i} className="hover:bg-bg-subtle/20 transition-colors">
                    <td className="px-6 py-3 font-medium">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: COLORS[i % COLORS.length] }}
                        />
                        {item.name}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right text-success font-mono">
                      {fmtBytes(item.value)}
                    </td>
                    <td className="px-6 py-3 text-right text-text-muted font-mono">
                      {fmt(item.hits)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

RtkFilterBreakdown.propTypes = {
  stats: PropTypes.object.isRequired,
};
