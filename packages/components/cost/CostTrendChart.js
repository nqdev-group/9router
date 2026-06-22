"use client";

import PropTypes from "prop-types";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Card from "@/shared/components/Card";

const fmtCost = (n) => `$${(n || 0).toFixed(4)}`;

export default function CostTrendChart({ chartData }) {
  if (!chartData || chartData.length === 0) {
    return (
      <Card className="flex min-w-0 flex-col items-center justify-center py-8">
        <span className="text-text-muted">No cost data available</span>
      </Card>
    );
  }

  return (
    <Card className="flex min-w-0 flex-col gap-3 p-3 sm:p-4">
      <h3 className="text-text-main font-semibold">Daily Cost Trend</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="gradCost" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "currentColor" }}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "currentColor" }}
            tickFormatter={fmtCost}
            width={50}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-bg)",
              border: "1px solid var(--color-border)",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value) => [fmtCost(value), "Cost"]}
          />
          <Area
            type="monotone"
            dataKey="cost"
            stroke="#f59e0b"
            strokeWidth={2}
            fill="url(#gradCost)"
            dot={false}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}

CostTrendChart.propTypes = {
  chartData: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      cost: PropTypes.number.isRequired,
    })
  ),
};
