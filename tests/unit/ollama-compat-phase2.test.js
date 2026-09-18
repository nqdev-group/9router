import { describe, it, expect } from "vitest";
import {
  ollamaGenerateRequestToOpenAI,
  ollamaEmbedRequestToOpenAI,
  openAIChatJsonToOllamaGenerate,
  createOllamaGenerateStreamTransform,
  openAIEmbeddingJsonToOllama,
  buildOllamaShowResponse,
  buildNotImplementedMessage,
} from "@9router/ollama-compat";

async function collectNdjson(readable) {
  const reader = readable.getReader();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += new TextDecoder().decode(value);
  }
  return buffer.split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
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

describe("ollama-compat: /api/generate request translate", () => {
  it("builds a single user message from prompt, with system as a separate message", () => {
    const out = ollamaGenerateRequestToOpenAI({ model: "m", system: "be terse", prompt: "why is the sky blue?" });
    expect(out.messages).toEqual([
      { role: "system", content: "be terse" },
      { role: "user", content: "why is the sky blue?" },
    ]);
    expect(out.stream).toBe(true);
  });

  it("appends suffix as best-effort plain text, not true fill-in-the-middle", () => {
    const out = ollamaGenerateRequestToOpenAI({ model: "m", prompt: "def add(a, b):", suffix: "return result" });
    expect(out.messages[0].content).toBe("def add(a, b):\nreturn result");
  });

  it("omits the system message entirely when system is not provided", () => {
    const out = ollamaGenerateRequestToOpenAI({ model: "m", prompt: "hi" });
    expect(out.messages).toHaveLength(1);
    expect(out.messages[0].role).toBe("user");
  });
});

describe("ollama-compat: /api/embed request translate", () => {
  it("passes model/input/dimensions through, drops unsupported fields", () => {
    const out = ollamaEmbedRequestToOpenAI({ model: "m", input: "hello", truncate: true, dimensions: 256, keep_alive: "5m" });
    expect(out).toEqual({ model: "m", input: "hello", dimensions: 256 });
  });

  it("supports array input", () => {
    const out = ollamaEmbedRequestToOpenAI({ model: "m", input: ["a", "b"] });
    expect(out.input).toEqual(["a", "b"]);
  });
});

describe("ollama-compat: /api/generate response translate (non-stream)", () => {
  it("maps an OpenAI chat.completion body to a done GenerateResponse", () => {
    const out = openAIChatJsonToOllamaGenerate(
      { model: "m", choices: [{ message: { content: "because of Rayleigh scattering" }, finish_reason: "stop" }], usage: { prompt_tokens: 7, completion_tokens: 4 } },
      { model: "m", startedAtNs: process.hrtime.bigint() }
    );
    expect(out.response).toBe("because of Rayleigh scattering");
    expect(out.done).toBe(true);
    expect(out.prompt_eval_count).toBe(7);
    expect(out.eval_count).toBe(4);
    expect(out.load_duration).toBe(0);
  });
});

describe("ollama-compat: /api/generate streaming NDJSON transform", () => {
  it("re-emits content deltas under the `response` field", async () => {
    const body = sseBody([
      JSON.stringify({ choices: [{ delta: { content: "Because " } }] }),
      JSON.stringify({ choices: [{ delta: { content: "of physics" }, finish_reason: "stop" }], usage: { prompt_tokens: 2, completion_tokens: 3 } }),
      "[DONE]",
    ]);
    const transform = createOllamaGenerateStreamTransform({ model: "m", startedAtNs: process.hrtime.bigint(), promptText: "why" });
    const lines = await collectNdjson(body.pipeThrough(transform));
    expect(lines[0]).toMatchObject({ response: "Because ", done: false });
    expect(lines[1]).toMatchObject({ response: "of physics", done: false });
    expect(lines[2]).toMatchObject({ done: true, prompt_eval_count: 2, eval_count: 3 });
  });
});

describe("ollama-compat: /api/embed response translate", () => {
  it("maps OpenAI embeddings data[] into Ollama embeddings[][]", () => {
    const out = openAIEmbeddingJsonToOllama(
      { model: "m", data: [{ embedding: [0.1, 0.2] }, { embedding: [0.3, 0.4] }], usage: { prompt_tokens: 5 } },
      { model: "m", startedAtNs: process.hrtime.bigint() }
    );
    expect(out.embeddings).toEqual([[0.1, 0.2], [0.3, 0.4]]);
    expect(out.prompt_eval_count).toBe(5);
    expect(out.load_duration).toBe(0);
  });
});

describe("ollama-compat: /api/show response builder", () => {
  it("maps known capabilities and leaves local-file fields empty", () => {
    const out = buildOllamaShowResponse({ owned_by: "cc", capabilities: { vision: true, tools: true }, context_length: 200000 });
    expect(out.capabilities).toEqual(["completion", "vision", "tools"]);
    expect(out.details.family).toBe("cc");
    expect(out.parameters).toBe("");
    expect(out.license).toBe("");
    expect(out.model_info["9router.context_length"]).toBe(200000);
  });

  it("defaults to just completion when no capabilities are known", () => {
    const out = buildOllamaShowResponse({ owned_by: "x" });
    expect(out.capabilities).toEqual(["completion"]);
  });
});

describe("ollama-compat: unsupported model-management endpoints", () => {
  it("returns a clear reason string per action", () => {
    expect(buildNotImplementedMessage("pull").error).toMatch(/pull is not supported/);
    expect(buildNotImplementedMessage("delete").error).toMatch(/delete is not supported/);
  });
});
