// Ollama chat request → OpenAI Chat Completions shape. The two are already
// structurally close (messages[] with role/content); this only maps the
// fields that actually differ (images, options, format, think).

function mapOllamaOptionsToOpenAI(options) {
  const out = {};
  if (!options || typeof options !== "object") return out;
  if (typeof options.temperature === "number") out.temperature = options.temperature;
  if (typeof options.top_p === "number") out.top_p = options.top_p;
  if (typeof options.seed === "number") out.seed = options.seed;
  if (Array.isArray(options.stop)) out.stop = options.stop;
  if (typeof options.num_predict === "number" && options.num_predict > 0) out.max_tokens = options.num_predict;
  // num_ctx/top_k/min_p have no direct OpenAI-shape equivalent across 9Router's
  // 40+ upstream providers — intentionally dropped rather than guessed.
  return out;
}

function mapOllamaFormatToResponseFormat(format) {
  if (format === "json") return { type: "json_object" };
  if (format && typeof format === "object") {
    return { type: "json_schema", json_schema: { name: "ollama_format", schema: format } };
  }
  return null;
}

function ollamaMessageToOpenAI(message) {
  const { role, content, images, tool_calls } = message || {};
  const out = { role: role || "user" };

  if (Array.isArray(images) && images.length > 0) {
    const parts = [];
    if (content) parts.push({ type: "text", text: content });
    for (const b64 of images) {
      parts.push({ type: "image_url", image_url: { url: `data:image/png;base64,${b64}` } });
    }
    out.content = parts;
  } else {
    out.content = content ?? "";
  }

  if (Array.isArray(tool_calls) && tool_calls.length > 0) {
    out.tool_calls = tool_calls.map((tc, i) => ({
      id: tc.id || `call_${i}`,
      type: "function",
      function: {
        name: tc.function?.name || "",
        arguments: typeof tc.function?.arguments === "string"
          ? tc.function.arguments
          : JSON.stringify(tc.function?.arguments || {}),
      },
    }));
  }

  return out;
}

export function ollamaChatRequestToOpenAI(body) {
  const { model, messages, tools, format, options, stream } = body || {};

  const openaiBody = {
    model,
    messages: Array.isArray(messages) ? messages.map(ollamaMessageToOpenAI) : [],
    // Ollama defaults stream to true; only an explicit `false` turns it off.
    stream: stream !== false,
  };

  if (Array.isArray(tools) && tools.length > 0) openaiBody.tools = tools;

  const responseFormat = mapOllamaFormatToResponseFormat(format);
  if (responseFormat) openaiBody.response_format = responseFormat;

  Object.assign(openaiBody, mapOllamaOptionsToOpenAI(options));

  // Ask providers that support it to report usage in the final SSE chunk so
  // the streaming NDJSON transform can emit real prompt_eval_count/eval_count
  // instead of falling back to the char-count estimate.
  if (openaiBody.stream) openaiBody.stream_options = { include_usage: true };

  return openaiBody;
}

/**
 * POST /api/generate — Ollama's single-prompt (non-chat) completion. 9Router
 * has no raw-prompt pipeline, so this is built as a 1-2 message chat request
 * (system + user) and routed through the same chat path as
 * `ollamaChatRequestToOpenAI`.
 *
 * `suffix` (fill-in-the-middle) has no equivalent in a chat-message pipeline
 * across 9Router's 40+ providers — best-effort appended as plain text into
 * the same user message rather than silently dropped, not true FIM infill.
 * `raw` (skip prompt templating) is a no-op: 9Router never applies its own
 * chat template, upstream providers apply theirs regardless.
 */
export function ollamaGenerateRequestToOpenAI(body) {
  const { model, prompt, suffix, images, system, format, options, stream } = body || {};

  let userContent = prompt || "";
  if (suffix) userContent = `${userContent}\n${suffix}`;

  const messages = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push(ollamaMessageToOpenAI({ role: "user", content: userContent, images }));

  const openaiBody = {
    model,
    messages,
    stream: stream !== false,
  };

  const responseFormat = mapOllamaFormatToResponseFormat(format);
  if (responseFormat) openaiBody.response_format = responseFormat;

  Object.assign(openaiBody, mapOllamaOptionsToOpenAI(options));
  if (openaiBody.stream) openaiBody.stream_options = { include_usage: true };

  return openaiBody;
}

/**
 * POST /api/embed — Ollama embeddings request → OpenAI embeddings shape.
 * The two are already structurally identical for the fields 9Router's
 * `/v1/embeddings` handler understands (`model`, `input`, `dimensions`).
 * `truncate`/`keep_alive`/`options` have no equivalent and are dropped.
 */
export function ollamaEmbedRequestToOpenAI(body) {
  const { model, input, dimensions } = body || {};
  const openaiBody = { model, input };
  if (typeof dimensions === "number") openaiBody.dimensions = dimensions;
  return openaiBody;
}
