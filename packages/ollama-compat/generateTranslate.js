// OpenAI Chat Completions response → Ollama `/api/generate` response shape.
// Structurally the same timing/usage story as chat (see responseTranslate.js)
// but the text field is `response` (string), not `message.content`, and there
// is no tool_calls concept for /api/generate in the Ollama spec.

function estimateTokens(text) {
  return Math.max(1, Math.ceil((text || "").length / 4));
}

function elapsedNs(startedAtNs) {
  return Number(process.hrtime.bigint() - startedAtNs);
}

export function openAIChatJsonToOllamaGenerate(openaiJson, { model, startedAtNs }) {
  const choice = openaiJson?.choices?.[0] || {};
  const message = choice.message || {};
  const usage = openaiJson?.usage || {};
  const totalDurationNs = elapsedNs(startedAtNs);

  return {
    model: openaiJson?.model || model,
    created_at: new Date().toISOString(),
    response: message.content || "",
    done: true,
    done_reason: choice.finish_reason || "stop",
    total_duration: totalDurationNs,
    load_duration: 0,
    prompt_eval_count: usage.prompt_tokens || 0,
    prompt_eval_duration: 0,
    eval_count: usage.completion_tokens || 0,
    eval_duration: totalDurationNs,
  };
}

export function createOllamaGenerateStreamTransform({ model, startedAtNs, promptText = "" }) {
  let buffer = "";
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
    emitLine(controller, {
      model,
      created_at: new Date().toISOString(),
      response: "",
      done: true,
      done_reason: finishReason || "stop",
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
            response: delta.content,
            done: false,
          });
        }

        const finishReason = parsed.choices?.[0]?.finish_reason;
        if (finishReason) finalize(controller, finishReason);
      }
    },
    flush(controller) {
      finalize(controller, "stop");
    },
  });
}
