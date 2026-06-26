"use client";

import { useState } from "react";
import PropTypes from "prop-types";
import Card from "@/shared/components/Card";

const fmt = (n) => new Intl.NumberFormat().format(n || 0);

const STATUS_LABELS = {
  ok: "OK",
  error: "Error",
  skipped: "Skipped",
};

const STATUS_COLORS = {
  ok: "bg-success/10 text-success",
  error: "bg-danger/10 text-danger",
  skipped: "bg-text-muted/10 text-text-muted",
};

export default function TokenSaverPerRequestTable({ data, onPageChange }) {
  const requests = data?.requests || [];
  const total = data?.total || 0;
  const page = data?.page || 1;
  const limit = data?.limit || 50;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = statusFilter === "all"
    ? requests
    : requests.filter((r) => r.status === statusFilter);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border bg-bg-subtle/50">
        <h3 className="font-semibold">Per-Request RTK Savings</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Status:</span>
          <select
            className="text-xs rounded-lg border border-border bg-bg px-2 py-1"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="ok">OK</option>
            <option value="error">Error</option>
            <option value="skipped">Skipped</option>
          </select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-bg-subtle/30 text-text-muted uppercase text-xs">
            <tr>
              <th className="px-6 py-3">Time</th>
              <th className="px-6 py-3">Provider</th>
              <th className="px-6 py-3">Model</th>
              <th className="px-6 py-3">RTK Saved</th>
              <th className="px-6 py-3">Filters</th>
              <th className="px-6 py-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-text-muted">
                  No request data available
                </td>
              </tr>
            ) : (
              filtered.map((req, i) => (
                <tr key={i} className="hover:bg-bg-subtle/20 transition-colors">
                  <td className="px-6 py-3 text-xs text-text-muted font-mono">
                    {new Date(req.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-3 font-medium">{req.provider}</td>
                  <td className="px-6 py-3 text-xs font-mono max-w-[200px] truncate">
                    {req.model}
                  </td>
                  <td className="px-6 py-3 text-success font-mono font-medium">
                    {fmt(req.rtkSaved)}
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(req.rtkFilters || []).map((f, j) => (
                        <span
                          key={j}
                          className="text-[10px] bg-bg-subtle text-text-muted px-1.5 py-0.5 rounded font-mono"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${STATUS_COLORS[req.status] || STATUS_COLORS.ok}`}>
                      {STATUS_LABELS[req.status] || "OK"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-bg-subtle/20">
          <span className="text-xs text-text-muted">
            Page {page} of {totalPages} ({fmt(total)} total)
          </span>
          <div className="flex gap-1">
            <button
              className="px-3 py-1 text-xs rounded-lg border border-border hover:bg-bg-subtle disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              disabled={page <= 1}
              onClick={() => onPageChange?.(page - 1)}
            >
              Previous
            </button>
            <button
              className="px-3 py-1 text-xs rounded-lg border border-border hover:bg-bg-subtle disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              disabled={page >= totalPages}
              onClick={() => onPageChange?.(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

TokenSaverPerRequestTable.propTypes = {
  data: PropTypes.shape({
    requests: PropTypes.arrayOf(
      PropTypes.shape({
        timestamp: PropTypes.string.isRequired,
        provider: PropTypes.string,
        model: PropTypes.string,
        rtkSaved: PropTypes.number,
        rtkFilters: PropTypes.arrayOf(PropTypes.string),
        status: PropTypes.string,
      })
    ),
    total: PropTypes.number,
    page: PropTypes.number,
    limit: PropTypes.number,
  }),
  onPageChange: PropTypes.func,
};
