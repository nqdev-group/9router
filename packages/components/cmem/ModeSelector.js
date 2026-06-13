"use client";

import Card from "@/shared/components/Card";

const CMEM_MODES = {
  "code": { label: "Code", description: "Default engineering mode" },
  "code--zh": { label: "Code (中文)", description: "Chinese observations" },
  "code--ja": { label: "Code (日本語)", description: "Japanese observations" },
  "code--es": { label: "Code (Español)", description: "Spanish observations" },
  "code--ko": { label: "Code (한국어)", description: "Korean observations" },
  "code--fr": { label: "Code (Français)", description: "French observations" },
};

export function ModeSelector({ value, onChange }) {
  return (
    <Card title="Workflow Mode" subtitle="Observation language and style" icon="translate">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Object.entries(CMEM_MODES).map(([key, mode]) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`p-3 rounded-lg border text-left transition-colors ${
              value === key
                ? "border-primary bg-primary/10 text-text-main"
                : "border-border-subtle text-text-muted hover:border-text-muted"
            }`}
          >
            <div className="text-sm font-medium">{mode.label}</div>
            <div className="text-xs mt-1 opacity-70">{mode.description}</div>
          </button>
        ))}
      </div>
    </Card>
  );
}
