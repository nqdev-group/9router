"use client";

import Card from "@/shared/components/Card";

const ALL_SECTIONS = [
  { key: "recent", label: "Recent", description: "Most recent observations" },
  { key: "relevant", label: "Relevant", description: "Semantic matches to current query" },
  { key: "project-facts", label: "Project Facts", description: "High-level project statistics" },
];

export function ContextSections({ value = [], onChange }) {
  const toggle = (key) => {
    const next = value.includes(key)
      ? value.filter(s => s !== key)
      : [...value, key];
    onChange(next);
  };

  return (
    <Card title="Context Sections" subtitle="What memory data to include in injection" icon="layers">
      <div className="space-y-3">
        {ALL_SECTIONS.map(section => (
          <label key={section.key} className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={value.includes(section.key)}
              onChange={() => toggle(section.key)}
              className="mt-0.5 accent-primary"
            />
            <div>
              <div className="text-sm font-medium text-text-main">{section.label}</div>
              <div className="text-xs text-text-muted">{section.description}</div>
            </div>
          </label>
        ))}
      </div>
    </Card>
  );
}
