"use client";

import { useState, useEffect } from "react";
import Card from "@/shared/components/Card";

export function ObservationList({ limit = 10 }) {
  const [observations, setObservations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/settings/cmem/observations?limit=${limit}`)
      .then(res => res.json())
      .then(data => setObservations(data.observations || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [limit]);

  return (
    <Card title="Recent Observations" icon="list">
      {loading ? (
        <div className="text-sm text-text-muted">Loading...</div>
      ) : observations.length === 0 ? (
        <div className="text-sm text-text-muted">No observations yet. Enable CMEM and start coding.</div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {observations.map(obs => (
            <div key={obs.id} className="p-2 rounded border border-border-subtle text-xs">
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">{obs.type}</span>
                <span className="font-medium text-text-main truncate">{obs.title || "Untitled"}</span>
                <span className="ml-auto text-text-muted whitespace-nowrap">
                  {obs.createdAt ? new Date(obs.createdAt).toLocaleDateString() : ""}
                </span>
              </div>
              <div className="mt-1 text-text-muted line-clamp-2">{obs.summary || obs.content?.slice(0, 200)}</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
