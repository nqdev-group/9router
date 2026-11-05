import { describe, it, expect } from "vitest";
import {
  ollamaChatRequestToOpenAI,
  openAIChatJsonToOllama,
  createOllamaChatStreamTransform,
  buildOllamaTagsResponse,
  buildEmptyPsResponse,
  buildOllamaVersionResponse,
} from "@9router/ollama-compat";

async function collectNdjson(readable) {
  const reader = readable.getReader();
  let buffer = "";
  const lines = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += new TextDecoder().decode(value);
  }
  for (const line of buffer.split("\n")) {
    if (line.trim()) lines.push(JSON.parse(line));
  }
  return lines;
}

function sseBody(lines) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const line of lines) controller.enqueue(encoder.encode(`data: ${line}\n\n`));
      controller.close();
    },
  });
}

describe("ollama-compat: request translate", () => {
  it("maps a plain text message and defaults stream to true", () => {
    const out = ollamaChatRequestToOpenAI({
      model: "cc/claude-opus-4-8",
      messages: [{ role: "user", content: "hi" }],
    });
    expect(out.model).toBe("cc/claude-opus-4-8");
    expect(out.messages).toEqual([{ role: "user", content: "hi" }]);
    expect(out.stream).toBe(true);
    expect(out.stream_options).toEqual({ include_usage: true });
  });

  it("respects an explicit stream:false and omits stream_options", () => {
    const out = ollamaChatRequestToOpenAI({
      model: "m",
      messages: [{ role: "user", content: "hi" }],
      stream: false,
    });
    expect(out.stream).toBe(false);
    expect(out.stream_options).toBeUndefined();
  });

  it("converts base64 images into OpenAI multimodal content parts", () => {
    const out = ollamaChatRequestToOpenAI({
      model: "m",
      messages: [{ role: "user", content: "what is this", images: ["AAAA"] }],
    });
    expect(out.messages[0].content).toEqual([
      { type: "text", text: "what is this" },
      { type: "image_url", image_url: { url: "data:image/png;base64,AAAA" } },
    ]);
  });

  it("passes tools through and maps options to OpenAI fields", () => {
    const out = ollamaChatRequestToOpenAI({
      model: "m",
      messages: [{ role: "user", content: "hi" }],
      tools: [{ type: "function", function: { name: "get_weather", parameters: {} } }],
      options: { temperature: 0.5, top_p: 0.9, seed: 42, stop: ["\n"], num_predict: 100, top_k: 40 },
    });
    expect(out.tools).toHaveLength(1);
    expect(out.temperature).toBe(0.5);
    expect(out.top_p).toBe(0.9);
    expect(out.seed).toBe(42);
    expect(out.stop).toEqual(["\n"]);
    expect(out.max_tokens).toBe(100);
    expect(out.top_k).toBeUndefined();
  });

  it("maps format:json to response_format json_object", () => {
    const out = ollamaChatRequestToOpenAI({ model: "m", messages: [], format: "json" });
    expect(out.response_format).toEqual({ type: "json_object" });
  });
});

describe("ollama-compat: non-streaming response translate", () => {
  it("builds a done Ollama ChatResponse from an OpenAI chat.completion body", () => {
    const startedAtNs = process.hrtime.bigint();
    const ollama = openAIChatJsonToOllama(
      {
        model: "cc/claude-opus-4-8",
        choices: [{ message: { role: "assistant", content: "hello" }, finish_reason: "stop" }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      },
      { model: "cc/claude-opus-4-8", startedAtNs }
    );
    expect(ollama.done).toBe(true);
    expect(ollama.done_reason).toBe("stop");
    expect(ollama.message).toEqual({ role: "assistant", content: "hello" });
    expect(ollama.prompt_eval_count).toBe(10);
    expect(ollama.eval_count).toBe(5);
    expect(ollama.load_duration).toBe(0);
    expect(typeof ollama.total_duration).toBe("number");
    expect(ollama.total_duration).toBeGreaterThanOrEqual(0);
  });

  it("parses tool_calls arguments into an object and sets done_reason tool_calls", () => {
    const ollama = openAIChatJsonToOllama(
      {
        model: "m",
        choices: [{
          message: {
            role: "assistant",
            content: "",
            tool_calls: [{ function: { name: "get_weather", arguments: '{"city":"Hanoi"}' } }],
          },
          finish_reason: "tool_calls",
        }],
        usage: {},
      },
      { model: "m", startedAtNs: process.hrtime.bigint() }
    );
    expect(ollama.done_reason).toBe("tool_calls");
    expect(ollama.message.tool_calls).toEqual([
      { function: { name: "get_weather", arguments: { city: "Hanoi" } } },
    ]);
  });
});

describe("ollama-compat: streaming NDJSON transform", () => {
  it("re-emits SSE content deltas as NDJSON lines and closes with done:true", async () => {
    const body = sseBody([
      JSON.stringify({ choices: [{ delta: { content: "He" } }] }),
      JSON.stringify({ choices: [{ delta: { content: "llo" } }] }),
      JSON.stringify({ choices: [{ delta: {}, finish_reason: "stop" }], usage: { prompt_tokens: 3, completion_tokens: 2 } }),
      "[DONE]",
    ]);
    const transform = createOllamaChatStreamTransform({ model: "m", startedAtNs: process.hrtime.bigint(), promptText: "hi" });
    const lines = await collectNdjson(body.pipeThrough(transform));

    expect(lines).toHaveLength(3);
    expect(lines[0]).toMatchObject({ message: { role: "assistant", content: "He" }, done: false });
    expect(lines[1]).toMatchObject({ message: { role: "assistant", content: "llo" }, done: false });
    expect(lines[2]).toMatchObject({ done: true, done_reason: "stop", prompt_eval_count: 3, eval_count: 2 });
    expect(lines[2].load_duration).toBe(0);
  });

  it("falls back to char-count token estimate when no usage is reported", async () => {
    const body = sseBody([
      JSON.stringify({ choices: [{ delta: { content: "hello world" } }] }),
      "[DONE]",
    ]);
    const transform = createOllamaChatStreamTransform({ model: "m", startedAtNs: process.hrtime.bigint(), promptText: "hi there" });
    const lines = await collectNdjson(body.pipeThrough(transform));
    const last = lines[lines.length - 1];
    expect(last.done).toBe(true);
    expect(last.eval_count).toBeGreaterThan(0);
    expect(last.prompt_eval_count).toBeGreaterThan(0);
  });

  it("accumulates streamed tool_calls and emits parsed-object arguments on done", async () => {
    const body = sseBody([
      JSON.stringify({ choices: [{ delta: { tool_calls: [{ index: 0, function: { name: "get_", arguments: "" } }] } }] }),
      JSON.stringify({ choices: [{ delta: { tool_calls: [{ index: 0, function: { name: "weather", arguments: '{"city":' } }] } }] }),
      JSON.stringify({ choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: '"Hanoi"}' } }] }, finish_reason: "tool_calls" }] }),
    ]);
    const transform = createOllamaChatStreamTransform({ model: "m", startedAtNs: process.hrtime.bigint() });
    const lines = await collectNdjson(body.pipeThrough(transform));
    const last = lines[lines.length - 1];
    expect(last.done_reason).toBe("tool_calls");
    expect(last.message.tool_calls).toEqual([
      { function: { name: "get_weather", arguments: { city: "Hanoi" } } },
    ]);
  });
});

describe("ollama-compat: model catalog / ps / version", () => {
  it("builds tags response from the real model list with placeholder file fields", () => {
    const out = buildOllamaTagsResponse([{ id: "cc/claude-opus-4-8", owned_by: "cc" }]);
    expect(out.models).toHaveLength(1);
    expect(out.models[0].name).toBe("cc/claude-opus-4-8");
    expect(out.models[0].model).toBe("cc/claude-opus-4-8");
    expect(out.models[0].size).toBe(0);
    expect(out.models[0].details.family).toBe("cc");
    expect(typeof out.models[0].digest).toBe("string");
  });

  it("filters out entries without an id", () => {
    const out = buildOllamaTagsResponse([{ owned_by: "x" }, { id: "a/b", owned_by: "a" }]);
    expect(out.models).toHaveLength(1);
  });

  it("returns an empty running-models list", () => {
    expect(buildEmptyPsResponse()).toEqual({ models: [] });
  });

  it("returns a version string", () => {
    const out = buildOllamaVersionResponse();
    expect(typeof out.version).toBe("string");
    expect(out.version.length).toBeGreaterThan(0);
  });
});
