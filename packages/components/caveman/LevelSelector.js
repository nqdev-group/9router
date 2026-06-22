"use client";

import Card from "@/shared/components/Card";

const CAVEMAN_LEVELS = [
  {
    id: "lite",
    label: "Lite",
    description: "Drop filler, keep grammar. Still reads naturally.",
    expectedSavings: "15-25%",
  },
  {
    id: "full",
    label: "Full",
    description: "Drop articles, fragments OK. Standard caveman terseness.",
    expectedSavings: "35-45%",
  },
  {
    id: "ultra",
    label: "Ultra",
    description: "Telegraphic, max compression. One word when one word enough.",
    expectedSavings: "50-65%",
  },
  {
    id: "wenyan-lite",
    label: "Wenyan Lite",
    description: "Semi-classical Chinese. Drop filler, keep grammar, classical register.",
    expectedSavings: "20-30%",
  },
  {
    id: "wenyan",
    label: "Wenyan",
    description: "Maximum classical Chinese. 80-90% character reduction.",
    expectedSavings: "60-70%",
  },
  {
    id: "wenyan-ultra",
    label: "Wenyan Ultra",
    description: "Extreme classical compression. One classical particle per clause.",
    expectedSavings: "70-85%",
  },
];

export function LevelSelector({ value, onChange }) {
  return (
    <Card title="Caveman Level" subtitle="Choose output compression style" icon="short_text">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {CAVEMAN_LEVELS.map((level) => (
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
