"use client";

import Card from "@/shared/components/Card";

const INTENSITY_LEVELS = [
  {
    id: "minimal",
    label: "Minimal",
    description: "Only git-diff, grep, ls, tree. No dedup. Best for high-quality code review.",
    expectedSavings: "10-15%",
  },
  {
    id: "moderate",
    label: "Moderate",
    description: "All standard filters, moderate dedup. Balanced savings vs quality.",
    expectedSavings: "20-30%",
  },
  {
    id: "aggressive",
    label: "Aggressive",
    description: "All filters + code stripping + aggressive dedup. Max compression.",
    expectedSavings: "30-45%",
  },
  {
    id: "maximal",
    label: "Maximal",
    description: "Everything maxed out. Highest savings, may lose some context.",
    expectedSavings: "40-65%",
  },
];

export function IntensitySelector({ value, onChange }) {
  return (
    <Card title="Compression Intensity" subtitle="Choose how aggressively to compress tool outputs" icon="tune">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {INTENSITY_LEVELS.map((level) => (
          <button
            key={level.id}
            onClick={() => onChange(level.id)}
            className={`p-4 rounded-[10px] border-2 text-left transition-all cursor-pointer ${
              value === level.id
                ? "border-primary bg-primary/5"
                : "border-border-subtle bg-bg hover:border-primary/30"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-text-main">{level.label}</span>
              <span className="text-xs font-mono text-primary">{level.expectedSavings}</span>
            </div>
            <p className="text-xs text-text-muted">{level.description}</p>
            {value === level.id && (
              <div className="mt-2 w-full h-1 rounded-full bg-primary/20">
                <div className="h-1 rounded-full bg-primary w-full" />
              </div>
            )}
          </button>
        ))}
      </div>
    </Card>
  );
}
