"use client";

import { useState } from "react";
import Card from "@/shared/components/Card";

export function TokenBudgetSlider({ value, onChange }) {
  const [localVal, setLocalVal] = useState(value || 4000);

  const handleChange = (e) => {
    const v = parseInt(e.target.value, 10);
    setLocalVal(v);
    onChange(v);
  };

  const presets = [500, 1000, 2000, 4000, 8000, 16000];

  return (
    <Card title="Token Budget" subtitle="Max tokens per request for memory injection" icon="token">
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={500}
            max={16000}
            step={100}
            value={localVal}
            onChange={handleChange}
            className="flex-1 accent-primary"
          />
          <span className="text-sm font-mono text-text-main w-20 text-right">{localVal.toLocaleString()} tokens</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {presets.map(p => (
            <button
              key={p}
              onClick={() => { setLocalVal(p); onChange(p); }}
              className={`px-3 py-1 rounded text-xs border transition-colors ${
                localVal === p
                  ? "border-primary bg-primary/10 text-text-main"
                  : "border-border-subtle text-text-muted hover:border-text-muted"
              }`}
            >
              {p.toLocaleString()}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}
