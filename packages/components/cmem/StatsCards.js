"use client";

import Card from "@/shared/components/Card";

export function CmemStatsCards({ stats }) {
  if (!stats) return null;

  const cards = [
    {
      label: "Observations",
      value: stats.totalObservations?.toLocaleString() || "0",
      desc: "Total captured memories",
    },
    {
      label: "Injections",
      value: stats.contextInjections?.toLocaleString() || "0",
      desc: "Times context was injected",
    },
    {
      label: "Avg Tokens/Injection",
      value: stats.avgInjectionTokens?.toLocaleString() || "0",
      desc: "Tokens per injection",
    },
    {
      label: "Total Tokens Stored",
      value: stats.totalTokens?.toLocaleString() || "0",
      desc: "Tokens in observation DB",
    },
  ];

  return (
    <Card title="CMEM Statistics" icon="bar_chart">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {cards.map(card => (
          <div key={card.label} className="p-3 rounded-lg bg-bg border border-border-subtle">
            <div className="text-2xl font-semibold text-text-main">{card.value}</div>
            <div className="text-xs font-medium text-text-muted mt-1">{card.label}</div>
            <div className="text-xs text-text-muted/60 mt-0.5">{card.desc}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
