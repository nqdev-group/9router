"use client";

import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { CostReport as CostReportView } from "@9router/components/cost";

/**
 * CostReport component displays an overview of cost statistics, including trends and breakdowns.
 * It fetches data from the server based on the selected time period and handles loading and error states.
 * @param {{ period: string }} param0 - The props object containing the period for which to fetch cost data.
 * @returns {JSX.Element} The rendered CostReport component.
 */
export default function CostReport({ period = "7d" }) {
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [statsRes, chartRes] = await Promise.all([
          fetch(`/api/usage/stats?period=${period}`),
          fetch(`/api/usage/chart?period=${period}`),
        ]);

        if (!statsRes.ok) throw new Error(`Stats: ${statsRes.status}`);
        if (!chartRes.ok) throw new Error(`Chart: ${chartRes.status}`);

        const statsData = await statsRes.json();
        const chartData = await chartRes.json();

        if (!cancelled) {
          setStats(statsData);
          setChartData(chartData);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [period]);

  if (loading) {
    return (
      <div className="flex min-w-0 flex-col items-center justify-center py-8">
        <span className="material-symbols-outlined animate-spin text-[32px]">progress_activity</span>
        <p className="mt-2 text-text-muted">Loading cost data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-w-0 flex-col items-center justify-center py-8">
        <span className="material-symbols-outlined text-[32px] text-red-500">error</span>
        <p className="mt-2 text-text-muted">{error}</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex min-w-0 flex-col items-center justify-center py-8">
        <span className="material-symbols-outlined text-[32px] text-text-muted">incomplete_circle</span>
        <p className="mt-2 text-text-muted">No cost data available</p>
      </div>
    );
  }

  return (
    <CostReportView
      period={period}
      stats={stats}
      chartData={chartData}
    />
  );
}

CostReport.propTypes = {
  period: PropTypes.string,
};
