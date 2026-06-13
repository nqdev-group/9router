"use client";

import PropTypes from "prop-types";
import Card from "@/shared/components/Card";

const fmt = (n) => new Intl.NumberFormat().format(n || 0);
const fmtMs = (ms) => {
  if (!ms) return "0s";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(0)}s`;
  return `${(ms / 60000).toFixed(0)}m`;
};
const fmtPct = (n) => `${(n || 0).toFixed(1)}%`;

export default function ResponseCacheStats({ stats }) {
  const cache = stats?.responseCache || {};
  const s = cache;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Card className="flex min-w-0 flex-1 flex-col gap-3 p-3 sm:p-4">
        <h3 className="text-text-main font-semibold">Response Cache</h3>
        <p className="text-xs text-text-muted">
          LRU cache for identical LLM requests. Cache key is a hash of model, messages, temperature, and max_tokens.
          Responses are served from cache when the exact same request repeats within the TTL window.
        </p>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-text-muted uppercase font-semibold">Cached Requests</span>
            <span className="truncate text-lg font-bold text-success">{fmt(s.hits || 0)}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-text-muted uppercase font-semibold">Misses</span>
            <span className="truncate text-lg font-bold">{fmt(s.misses || 0)}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-text-muted uppercase font-semibold">Hit Rate</span>
            <span className="truncate text-lg font-bold text-primary">{fmtPct(parseFloat(s.hitRate) || 0)}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-text-muted uppercase font-semibold">Evictions</span>
            <span className="truncate text-lg font-bold text-warning">{fmt(s.evictions || 0)}</span>
          </div>
        </div>
      </Card>

      <Card className="flex min-w-0 flex-1 flex-col gap-3 p-3 sm:p-4">
        <h3 className="text-text-main font-semibold">Cache Configuration</h3>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-text-muted uppercase font-semibold">Status</span>
            <span className={`truncate text-lg font-bold ${cache.enabled ? "text-success" : "text-text-muted"}`}>
              {cache.enabled ? "Enabled" : "Disabled"}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-text-muted uppercase font-semibold">Max Entries</span>
            <span className="truncate text-lg font-bold">{fmt(s.size || 0)} / {fmt(cache.maxSize || 100)}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-text-muted uppercase font-semibold">TTL</span>
            <span className="truncate text-lg font-bold">{fmtMs(cache.ttlMs || 300000)}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

ResponseCacheStats.propTypes = {
  stats: PropTypes.object.isRequired,
};
