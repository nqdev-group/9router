// Ollama `/api/show` describes a local Modelfile (parameters/license/template)
// which has no equivalent for an API-routed model — those fields are
// intentionally left empty rather than fabricated, same convention as
// modelCatalog.js's placeholder size/digest/quantization_level.

function mapCapabilities(caps) {
  const out = ["completion"];
  if (caps?.vision) out.push("vision");
  if (caps?.tools) out.push("tools");
  return out;
}

/**
 * Build an Ollama ShowResponse from the matching entry produced by the same
 * `buildModelsList()` catalog used for `/api/tags` (caller looks it up by id
 * and passes it in — pure function, no DB coupling here).
 */
export function buildOllamaShowResponse(modelEntry) {
  return {
    modified_at: new Date().toISOString(),
    parameters: "",
    license: "",
    template: "",
    details: {
      format: "api",
      family: modelEntry?.owned_by || "unknown",
      families: null,
      parameter_size: "unknown",
      quantization_level: "unknown",
    },
    capabilities: mapCapabilities(modelEntry?.capabilities),
    model_info: {
      "9router.context_length": modelEntry?.context_length ?? null,
      "9router.max_completion_tokens": modelEntry?.max_completion_tokens ?? null,
    },
  };
}
