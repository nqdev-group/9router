// OpenAI Chat Completions response (JSON or SSE) → Ollama chat wire format.
//
// Ollama's timing fields (total_duration, load_duration, prompt_eval_duration,
// eval_duration) are nanoseconds. 9Router routes to remote provider APIs, not
// a local model runtime, so there is no real "model load" step or per-phase
// prompt-vs-generation timing breakdown available from most upstream
// providers — load_duration is always 0 and eval_duration is a single-bucket
// approximation (== total_duration), documented here rather than faked as a
// precise-looking split.

// Same ~4 chars/token convention already used by /v1/messages/count_tokens
// (docs/guide/04-api-reference.md) — used only when a provider's streamed
// response doesn't report real usage in its final chunk.
function estimateTokens(text) {
  return Math.max(1, Math.ceil((text || "").length / 4));
}

function elapsedNs(startedAtNs) {
  return Number(process.hrtime.bigint() - startedAtNs);
}

function mapToolCalls(toolCalls) {
  if (!Array.isArray(toolCalls) || toolCalls.length === 0) return undefined;
  return toolCalls.map((tc) => ({
    function: {
      name: tc.function?.name || "",
      arguments: (() => {
        try { return JSON.parse(tc.function?.arguments || "{}"); } catch { return {}; }
      })(),
    },
  }));
}

/**
 * Non-streaming path: `handleChat` already returned one complete OpenAI
 * `chat.completion` JSON body (real usage, no estimate needed).
 */
export function openAIChatJsonToOllama(openaiJson, { model, startedAtNs }) {
  const choice = openaiJson?.choices?.[0] || {};
  const message = choice.message || {};
  const usage = openaiJson?.usage || {};
  const totalDurationNs = elapsedNs(startedAtNs);
  const toolCalls = mapToolCalls(message.tool_calls);

  const ollamaMessage = { role: "assistant", content: message.content || "" };
  if (toolCalls) ollamaMessage.tool_calls = toolCalls;

  return {
    model: openaiJson?.model || model,
    created_at: new Date().toISOString(),
    message: ollamaMessage,
    done: true,
    done_reason: toolCalls ? "tool_calls" : (choice.finish_reason || "stop"),
    total_duration: totalDurationNs,
    load_duration: 0,
    prompt_eval_count: usage.prompt_tokens || 0,
    prompt_eval_duration: 0,
    eval_count: usage.completion_tokens || 0,
    eval_duration: totalDurationNs,
  };
}

/**
 * Streaming path: `handleChat` returned an OpenAI SSE body
 * (`data: {...}\n\n` lines, `data: [DONE]` sentinel). Re-emit as Ollama NDJSON
 * (one complete JSON object per line, no `data:` prefix, no [DONE] sentinel).
 */
export function createOllamaChatStreamTransform({ model, startedAtNs, promptText = "" }) {
  let buffer = "";
  let pendingToolCalls = {};
  let contentChars = "";
  let promptTokens = 0;
  let completionTokens = 0;
  let hasUsage = false;
  let emittedDone = false;

  function emitLine(controller, obj) {
    controller.enqueue(new TextEncoder().encode(JSON.stringify(obj) + "\n"));
  }

  function finalize(controller, finishReason) {
    if (emittedDone) return;
    emittedDone = true;

    const totalDurationNs = elapsedNs(startedAtNs);
    const toolCallsArr = Object.values(pendingToolCalls).map((tc) => ({
      function: {
        name: tc.function.name,
        arguments: (() => { try { return JSON.parse(tc.function.arguments || "{}"); } catch { return {}; } })(),
      },
    }));

    emitLine(controller, {
      model,
      created_at: new Date().toISOString(),
      message: {
        role: "assistant",
        content: "",
        ...(toolCallsArr.length ? { tool_calls: toolCallsArr } : {}),
      },
      done: true,
      done_reason: toolCallsArr.length ? "tool_calls" : (finishReason || "stop"),
      total_duration: totalDurationNs,
      load_duration: 0,
      prompt_eval_count: hasUsage ? promptTokens : estimateTokens(promptText),
      prompt_eval_duration: 0,
      eval_count: hasUsage ? completionTokens : estimateTokens(contentChars),
      eval_duration: totalDurationNs,
    });
  }

  return new TransformStream({
    transform(chunk, controller) {
      buffer += new TextDecoder().decode(chunk);
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const rawLine of lines) {
        if (!rawLine.startsWith("data:")) continue;
        const data = rawLine.slice(5).trim();

        if (data === "[DONE]") { finalize(controller, "stop"); return; }

        let parsed;
        try { parsed = JSON.parse(data); } catch { continue; }

        if (parsed.usage) {
          hasUsage = true;
          promptTokens = parsed.usage.prompt_tokens || 0;
          completionTokens = parsed.usage.completion_tokens || 0;
        }

        const delta = parsed.choices?.[0]?.delta || {};

        if (delta.content) {
          contentChars += delta.content;
          emitLine(controller, {
            model,
            created_at: new Date().toISOString(),
            message: { role: "assistant", content: delta.content },
            done: false,
          });
        }

        if (Array.isArray(delta.tool_calls)) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0;
            if (!pendingToolCalls[idx]) pendingToolCalls[idx] = { function: { name: "", arguments: "" } };
            if (tc.function?.name) pendingToolCalls[idx].function.name += tc.function.name;
            if (tc.function?.arguments) pendingToolCalls[idx].function.arguments += tc.function.arguments;
          }
        }

        const finishReason = parsed.choices?.[0]?.finish_reason;
        if (finishReason) finalize(controller, finishReason === "tool_calls" ? "tool_calls" : finishReason);
      }
    },
    flush(controller) {
      finalize(controller, "stop");
    },
  });
}
