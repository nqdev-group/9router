"use client";

import { useMemo } from "react";
import PropTypes from "prop-types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import Card from "@/shared/components/Card";

// Same 8-color palette as packages/components/cost/CostByProviderChart.js — matches
// the MAX_CHART_SERIES cap in src/lib/errorLogDb/errorLogRepo.js.
const COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

function formatBucketLabel(bucket) {
  // "2026-09-22T08:00:00Z" -> "09/22 08:00"
  const d = new Date(bucket);
  if (Number.isNaN(d.getTime())) return bucket;
  return d.toLocaleString(undefined, { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function ErrorFrequencyChart({ title, description, buckets, series }) {
  const rows = useMemo(() => {
    if (!buckets || buckets.length === 0) return [];
    return buckets.map((bucket, i) => {
      const row = { label: formatBucketLabel(bucket) };
      for (const s of series) row[s.key] = s.counts[i] || 0;
      return row;
    });
  }, [buckets, series]);

  if (!series || series.length === 0) {
    return (
      <Card className="flex min-w-0 flex-col items-center justify-center py-8" title={title}>
        <span className="text-text-muted">No errors in the last 7 days</span>
      </Card>
    );
  }

  return (
    <Card className="flex min-w-0 flex-col gap-3 p-3 sm:p-4">
      <div>
        <h3 className="text-text-main font-semibold">{title}</h3>
        {description && <p className="text-xs text-text-muted mt-0.5">{description}</p>}
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "currentColor" }} />
          <YAxis tick={{ fontSize: 10, fill: "currentColor" }} width={40} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-bg)",
              border: "1px solid var(--color-border)",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Legend wrapperStyle={{ fontSize: "11px" }} />
          {series.map((s, i) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

ErrorFrequencyChart.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  buckets: PropTypes.arrayOf(PropTypes.string),
  series: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      counts: PropTypes.arrayOf(PropTypes.number).isRequired,
    })
  ),
};
