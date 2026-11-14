import pkg from "../../package.json" with { type: "json" };

// GET /api/v1/ollama/api/version — Ollama clients expect { version }. Not the
// same as 9Router's own /api/version (app-update-check feature, different
// shape) — separate namespace under /api/v1/ollama, no conflict, no route
// migration needed (see plans/2026-09-10-ollama-api-swagger-planning.md §2.1).
export function buildOllamaVersionResponse() {
  return { version: pkg.version };
}
