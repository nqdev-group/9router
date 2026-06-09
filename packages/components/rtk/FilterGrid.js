"use client";

import { useState } from "react";
import Card from "@/shared/components/Card";

const CATEGORY_LABELS = {
  git: "Git",
  shell: "Shell",
  build: "Build/Test",
  docker: "Docker",
  log: "Logs",
  generic: "Generic",
};

const CATEGORY_ICONS = {
  git: "code",
  shell: "terminal",
  build: "build",
  docker: "docker",
  log: "notes",
  generic: "widgets",
};

export function FilterGrid({ filters, enabledFilters, intensity, onChange }) {
  const [search, setSearch] = useState("");

  const categories = {};
  for (const f of filters) {
    const cat = f.category || "generic";
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(f);
  }

  const isEnabled = (filterId) => {
    if (enabledFilters === null) return true; // all enabled
    if (enabledFilters[filterId] === true) return true;
    if (enabledFilters[filterId] === false) return false;
    return true; // default enabled
  };

  const handleToggle = (filterId) => {
    const current = enabledFilters === null ? {} : { ...enabledFilters };
    // If currently null (all enabled), we need to build the full map first
    if (enabledFilters === null) {
      const fullMap = {};
      for (const f of filters) fullMap[f.id] = true;
      fullMap[filterId] = false;
      onChange(fullMap);
    } else {
      current[filterId] = !current[filterId];
      onChange(current);
    }
  };

  const filteredCategories = {};
  for (const [cat, catFilters] of Object.entries(categories)) {
    const matched = catFilters.filter(
      (f) =>
        !search ||
        f.id.toLowerCase().includes(search.toLowerCase()) ||
        f.name?.toLowerCase().includes(search.toLowerCase()) ||
        f.description?.toLowerCase().includes(search.toLowerCase())
    );
    if (matched.length > 0) {
      filteredCategories[cat] = matched;
    }
  }

  return (
    <Card
      title="Active Filters"
      subtitle="Enable or disable specific compression filters"
      icon="filter_alt"
    >
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search filters..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-bg border border-border-subtle text-sm text-text-main placeholder-text-muted/50 focus:outline-none focus:border-primary"
        />
      </div>

      <div className="space-y-4">
        {Object.entries(filteredCategories).map(([cat, catFilters]) => (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-[16px] text-text-muted">
                {CATEGORY_ICONS[cat] || "widgets"}
              </span>
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                {CATEGORY_LABELS[cat] || cat}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {catFilters.map((f) => (
                <label
                  key={f.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg bg-bg border border-border-subtle hover:border-primary/30 transition-colors cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={isEnabled(f.id)}
                    onChange={() => handleToggle(f.id)}
                    className="rounded border-border-subtle text-primary focus:ring-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-text-main">{f.name || f.id}</span>
                    {f.description && (
                      <p className="text-xs text-text-muted truncate">{f.description}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
