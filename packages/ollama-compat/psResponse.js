// 9Router is a stateless API router, not a local model host — there is no
// "model currently loaded in VRAM" concept to report for `/api/ps`. An empty
// list is spec-valid and honest rather than fabricating fake VRAM/expiry data
// (confirmed with stakeholder, plans/2026-09-10-ollama-api-swagger-planning.md §6).
export function buildEmptyPsResponse() {
  return { models: [] };
}
