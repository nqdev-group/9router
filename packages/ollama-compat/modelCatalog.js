import crypto from "crypto";

// 9Router routes to remote provider APIs, not a local model file on disk —
// Ollama's `size`/`digest`/`quantization_level` describe a downloaded GGUF
// model, which has no real equivalent here. Values below are clearly-marked
// placeholders (a deterministic pseudo-digest of the model id, not a real
// content hash), not fabricated "realistic" numbers — see
// plans/2026-09-10-ollama-api-swagger-planning.md Risk R2.
function pseudoDigest(id) {
  return crypto.createHash("sha256").update(String(id)).digest("hex");
}

/**
 * Build an Ollama `/api/tags` ListResponse from 9Router's real model catalog.
 * `models` is the array already produced by the same `buildModelsList()` that
 * powers `/v1/models` (caller passes it in — this stays a pure function, no
 * DB/import-from-src coupling here, see packages/AGENTS.md pitfall on
 * packages/ → src/ dependencies).
 */
export function buildOllamaTagsResponse(models) {
  const now = new Date().toISOString();
  return {
    models: (models || [])
      .filter((m) => m?.id)
      .map((m) => ({
        name: m.id,
        model: m.id,
        modified_at: now,
        size: 0,
        digest: pseudoDigest(m.id),
        details: {
          format: "api",
          family: m.owned_by || "unknown",
          families: null,
          parameter_size: "unknown",
          quantization_level: "unknown",
        },
      })),
  };
}
