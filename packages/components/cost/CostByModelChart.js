"use client";

import PropTypes from "prop-types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import Card from "@/shared/components/Card";

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

export default function CostByModelChart({ stats }) {
  const modelData = stats?.byModel || {};
  const chartData = Object.entries(modelData)
    .map(([modelKey, data]) => {
      // modelKey might be like "model (provider)" or just "model"
      return {
        name: modelKey.length > 30 ? modelKey.substring(0, 27) + "..." : modelKey,
        value: data.cost || 0,
        fullName: modelKey,
      };
    })
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value) // descending by cost
    .slice(0, 10); // top 10

  if (chartData.length === 0) {
    return (
      <Card className="flex min-w-0 flex-col items-center justify-center py-8">
        <span className="text-text-muted">No cost data available</span>
      </Card>
    );
  }

  return (
    <Card className="flex min-w-0 flex-col gap-3 p-3 sm:p-4">
      <h3 className="text-text-main font-semibold">Cost by Model (Top 10)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "currentColor" }} />
          <YAxis
            tick={{ fontSize: 10, fill: "currentColor" }}
            tickFormatter={(value) => `$${(value || 0).toFixed(4)}`}
            width={50}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-bg)",
              border: "1px solid var(--color-border)",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value, name) => {
              const item = chartData.find((d) => d.name === name);
              return [
                `$${(value || 0).toFixed(4)}`,
                item ? item.fullName : name,
              ];
            }}
          />
          <Legend verticalAlign="top" height={36} />
          <Bar dataKey="value" barSize="20" fill={COLORS[0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

CostByModelChart.propTypes = {
  stats: PropTypes.object.isRequired,
};
