"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TokenSaverOverview,
  SavingsTrendChart,
  RtkFilterBreakdown,
  CavemanLevelHistory,
  TokenSaverPerRequestTable,
} from "@9router/components/token-saver";

const PERIODS = [
  { value: "today", label: "Today" },
  { value: "24h", label: "24h" },
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "60d", label: "60D" },
];

export default function TokenSaverReport() {
  const [period, setPeriod] = useState("30d");
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [perRequestData, setPerRequestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadStats = useCallback(async () => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    try {
      const [statsRes, chartRes] = await Promise.all([
        fetch(`/api/settings/token-saver?action=stats&period=${period}`),
        fetch(`/api/settings/token-saver?action=chart&period=${period}`),
      ]);
      if (!statsRes.ok) throw new Error(`Stats: ${statsRes.status}`);
      if (!chartRes.ok) throw new Error(`Chart: ${chartRes.status}`);
      const statsData = await statsRes.json();
      const chartDataJson = await chartRes.json();
      if (!cancelled) {
        setStats(statsData);
        setChartData(chartDataJson);
      }
    } catch (err) {
      if (!cancelled) setError(err.message);
    } finally {
      if (!cancelled) setLoading(false);
    }
    return () => { cancelled = true; };
  }, [period]);

  const loadPerRequest = useCallback(async (page = 1) => {
    try {
      const res = await fetch(`/api/settings/token-saver?action=per-request&page=${page}&limit=50`);
      if (!res.ok) return;
      const data = await res.json();
      setPerRequestData(data);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    const cleanup = loadStats();
    loadPerRequest(1);
    return () => { cleanup?.then((fn) => fn?.()); };
  }, [loadStats, loadPerRequest]);

  const handlePageChange = (page) => {
    loadPerRequest(page);
  };

  return (
    <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold text-text-main">Token Saver Report</h2>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${period === p.value
                ? "bg-primary text-white"
                : "bg-bg-subtle text-text-muted hover:bg-bg-subtle/70"
                }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex min-w-0 flex-col items-center justify-center py-8">
          <span className="material-symbols-outlined animate-spin text-[32px]">progress_activity</span>
          <p className="mt-2 text-text-muted">Loading token saver data...</p>
        </div>
      ) : error ? (
        <div className="flex min-w-0 flex-col items-center justify-center py-8">
          <span className="material-symbols-outlined text-[32px] text-red-500">error</span>
          <p className="mt-2 text-text-muted">{error}</p>
        </div>
      ) : !stats ? (
        <div className="flex min-w-0 flex-col items-center justify-center py-8">
          <span className="material-symbols-outlined text-[32px] text-text-muted">incomplete_circle</span>
          <p className="mt-2 text-text-muted">No token saver data available</p>
        </div>
      ) : (
        <>
          <TokenSaverOverview stats={stats} period={period} />
          <SavingsTrendChart chartData={chartData} />
          <RtkFilterBreakdown stats={stats} />
          <CavemanLevelHistory stats={stats} />
          <TokenSaverPerRequestTable data={perRequestData} onPageChange={handlePageChange} />
        </>
      )}
    </div>
  );
}
