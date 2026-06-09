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

const fmt = (n) => new Intl.NumberFormat().format(n || 0);

export default function SavingsTrendChart({ chartData }) {
  if (!chartData || chartData.length === 0) {
    return (
      <Card className="flex min-w-0 flex-col items-center justify-center py-8">
        <span className="text-text-muted">No savings trend data available</span>
      </Card>
    );
  }

  return (
    <Card className="flex min-w-0 flex-col gap-3 p-3 sm:p-4">
      <h3 className="text-text-main font-semibold">Daily RTK Savings Trend</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="gradSavings" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "currentColor" }} />
          <YAxis tick={{ fontSize: 10, fill: "currentColor" }} tickFormatter={fmt} width={50} />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-bg)",
              border: "1px solid var(--color-border)",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value) => [fmt(value), "Tokens Saved"]}
          />
          <Area
            type="monotone"
            dataKey="rtkSaved"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#gradSavings)"
            dot={false}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}

SavingsTrendChart.propTypes = {
  chartData: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      rtkSaved: PropTypes.number.isRequired,
    })
  ),
};
