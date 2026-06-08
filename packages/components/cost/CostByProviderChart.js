"use client";

import PropTypes from "prop-types";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import Card from "@/shared/components/Card";
import { getProviderNameByAlias } from "@/shared/constants/providers";

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function CostByProviderChart({ stats }) {
  const providerData = stats?.byProvider || {};
  const chartData = Object.entries(providerData)
    .map(([providerId, data]) => ({
      name: providerId,
      value: data.cost || 0,
    }))
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value); // descending by cost

  if (chartData.length === 0) {
    return (
      <Card className="flex min-w-0 flex-col items-center justify-center py-8">
        <span className="text-text-muted">No cost data available</span>
      </Card>
    );
  }

  return (
    <Card className="flex min-w-0 flex-col gap-3 p-3 sm:p-4">
      <h3 className="text-text-main font-semibold">Cost by Provider</h3>
      <div className="relative">
        <PieChart
          width={400}
          height={300}
        >
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={120}
            labelLine={false}
            label={({ name, value, percentage }) => {
              const providerName = getProviderNameByAlias(name) || name;
              return (
                <label>
                  {(percentage * 100).toFixed(0)}% {providerName}
                </label>
              );
            }}
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
            formatter={(value, name) => [
              `$${(value || 0).toFixed(4)}`,
              getProviderNameByAlias(name) || name,
            ]}
          />
          <Legend
            verticalAlign="top"
            height={36}
            formatter={(name) => `${getProviderNameByAlias(name) || name}`}
          />
        </PieChart>
      </div>
    </Card>
  );
}

CostByProviderChart.propTypes = {
  stats: PropTypes.object.isRequired,
};
