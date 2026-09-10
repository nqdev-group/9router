function elapsedNs(startedAtNs) {
  return Number(process.hrtime.bigint() - startedAtNs);
}

/**
 * OpenAI embeddings response (`{data:[{embedding}], usage}`) → Ollama
 * `/api/embed` response (`{embeddings:[[...]]}`) — embeddings are always
 * returned in full (non-streaming), no NDJSON path exists for this endpoint
 * in the Ollama spec.
 */
export function openAIEmbeddingJsonToOllama(openaiJson, { model, startedAtNs }) {
  const data = Array.isArray(openaiJson?.data) ? openaiJson.data : [];
  const usage = openaiJson?.usage || {};

  return {
    model: openaiJson?.model || model,
    embeddings: data.map((d) => d.embedding || []),
    total_duration: elapsedNs(startedAtNs),
    load_duration: 0,
    prompt_eval_count: usage.prompt_tokens || 0,
  };
}
