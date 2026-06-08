"use client";

import { useState } from "react";
import PropTypes from "prop-types";
import Card from "@/shared/components/Card";
import { getProviderByAlias } from "@/shared/constants/providers";

const fmt = (n) => new Intl.NumberFormat().format(n || 0);
const fmtCost = (n) => `$${(n || 0).toFixed(4)}`;

function SortIcon({ field, currentSort }) {
  if (currentSort !== field) return <span className="ml-1 opacity-20">↕</span>;
  return <span className="ml-1">↓</span>;
}

SortIcon.propTypes = { field: PropTypes.string.isRequired, currentSort: PropTypes.string.isRequired };

const sortProviders = (entries, sortField) => {
  return [...entries].sort((a, b) => b[1][sortField] - a[1][sortField]);
};

export default function CostBreakdownTable({ stats }) {
  const [providerSort, setProviderSort] = useState("cost");
  const [modelSort, setModelSort] = useState("cost");

  const byProviderData = stats?.byProvider || {};
  const byModelData = stats?.byModel || {};

  const sortedProviders = sortProviders(Object.entries(byProviderData), providerSort);
  const sortedModels = sortProviders(Object.entries(byModelData), modelSort);

  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b border-border bg-bg-subtle/50">
        <h3 className="font-semibold">Cost Breakdown</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-bg-subtle/30 text-text-muted uppercase text-xs">
            <tr>
              <th className="px-6 py-3">Category</th>
              <th
                className="px-6 py-3 text-right cursor-pointer hover:bg-bg-subtle/50"
                onClick={() => setProviderSort("cost")}
              >
                Cost <SortIcon field="cost" currentSort={providerSort} />
              </th>
              <th
                className="px-6 py-3 text-right cursor-pointer hover:bg-bg-subtle/50"
                onClick={() => setProviderSort("promptTokens")}
              >
                Input Tokens <SortIcon field="promptTokens" currentSort={providerSort} />
              </th>
              <th
                className="px-6 py-3 text-right cursor-pointer hover:bg-bg-subtle/50"
                onClick={() => setProviderSort("completionTokens")}
              >
                Output Tokens <SortIcon field="completionTokens" currentSort={providerSort} />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedProviders.length === 0 && sortedModels.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-text-muted">
                  No cost data available
                </td>
              </tr>
            ) : (
              <>
                <tr className="bg-bg-subtle/20">
                  <td colSpan={4} className="px-6 py-2 text-sm font-semibold text-text-muted uppercase">By Provider</td>
                </tr>
                {sortedProviders.map(([providerId, data]) => (
                  <tr key={providerId} className="hover:bg-bg-subtle/20 transition-colors">
                     <td className="px-6 py-3 font-medium">
                       {getProviderByAlias(providerId)?.name || providerId}
                     </td>
                    <td className="px-6 py-3 text-right text-warning font-mono">
                      {fmtCost(data.cost)}
                    </td>
                    <td className="px-6 py-3 text-right text-text-muted font-mono">
                      {fmt(data.promptTokens)}
                    </td>
                    <td className="px-6 py-3 text-right text-text-muted font-mono">
                      {fmt(data.completionTokens)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-bg-subtle/20">
                  <td colSpan={4} className="px-6 py-2 text-sm font-semibold text-text-muted uppercase">By Model</td>
                </tr>
                {sortedModels.map(([modelKey, data]) => (
                  <tr key={modelKey} className="hover:bg-bg-subtle/20 transition-colors">
                    <td className="px-6 py-3 font-mono text-xs max-w-[300px] truncate">
                      {modelKey}
                    </td>
                    <td className="px-6 py-3 text-right text-warning font-mono">
                      {fmtCost(data.cost)}
                    </td>
                    <td className="px-6 py-3 text-right text-text-muted font-mono">
                      {fmt(data.promptTokens)}
                    </td>
                    <td className="px-6 py-3 text-right text-text-muted font-mono">
                      {fmt(data.completionTokens)}
                    </td>
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

CostBreakdownTable.propTypes = {
  stats: PropTypes.object.isRequired,
};
