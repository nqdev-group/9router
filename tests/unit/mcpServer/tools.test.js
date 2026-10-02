import { describe, it, expect, vi } from "vitest";

const handleImageGenerationMock = vi.fn(async () =>
  Response.json({ data: [{ b64_json: "aW1hZ2ViYXNlNjQ=" }] }),
);
vi.mock("@/sse/handlers/imageGeneration.js", () => ({
  handleImageGeneration: (...args) => handleImageGenerationMock(...args),
}));

const handleVideoCreateMock = vi.fn(async () => Response.json({ id: "job-1", status: "queued" }, { status: 202 }));
vi.mock("@/sse/handlers/videoGeneration.js", () => ({
  handleVideoCreate: (...args) => handleVideoCreateMock(...args),
}));

const handleTtsMock = vi.fn(async () => Response.json({ audio: "YXVkaW9iYXNlNjQ=", format: "mp3" }));
vi.mock("@/sse/handlers/tts.js", () => ({
  handleTts: (...args) => handleTtsMock(...args),
}));

const handleSttMock = vi.fn(async () => Response.json({ text: "transcribed text" }));
vi.mock("@/sse/handlers/stt.js", () => ({
  handleStt: (...args) => handleSttMock(...args),
}));

const handleEmbeddingsMock = vi.fn(async () => Response.json({ data: [{ embedding: [0.1, 0.2] }] }));
vi.mock("@/sse/handlers/embeddings.js", () => ({
  handleEmbeddings: (...args) => handleEmbeddingsMock(...args),
}));

const handleSearchMock = vi.fn(async () => Response.json({ results: [{ title: "hit" }] }));
vi.mock("@/sse/handlers/search.js", () => ({
  handleSearch: (...args) => handleSearchMock(...args),
}));

const handleFetchMock = vi.fn(async () => Response.json({ content: "# extracted markdown" }));
vi.mock("@/sse/handlers/fetch.js", () => ({
  handleFetch: (...args) => handleFetchMock(...args),
}));

const getUsageStatsMock = vi.fn(async (period) => ({ view: "summary", period, totalRequests: 42 }));
const getUsageHistoryMock = vi.fn(async (filter) => [{ provider: filter.provider || "any", cost: 0.01 }]);
const getChartDataMock = vi.fn(async (period) => ({ view: "chart", period, buckets: [] }));
vi.mock("@/lib/usageDb.js", () => ({
  getUsageStats: (...args) => getUsageStatsMock(...args),
  getUsageHistory: (...args) => getUsageHistoryMock(...args),
  getChartData: (...args) => getChartDataMock(...args),
}));

const getProviderConnectionsMock = vi.fn(async () => [
  { id: "c1", provider: "openai", displayName: "acc-1", isActive: 1, testStatus: "active" },
  { id: "c2", provider: "openai", displayName: "acc-2", isActive: 0, errorCode: 401, lastError: "bad key" },
  { id: "c3", provider: "anthropic", displayName: "acc-3", isActive: 1, testStatus: "active" },
]);
vi.mock("@/lib/localDb", () => ({
  getProviderConnections: (...args) => getProviderConnectionsMock(...args),
}));

const { generateImageTool } = await import("../../../packages/mcpServer/lib/tools/generateImage.js");
const { generateVideoTool } = await import("../../../packages/mcpServer/lib/tools/generateVideo.js");
const { textToSpeechTool } = await import("../../../packages/mcpServer/lib/tools/textToSpeech.js");
const { speechToTextTool } = await import("../../../packages/mcpServer/lib/tools/speechToText.js");
const { createEmbeddingsTool } = await import("../../../packages/mcpServer/lib/tools/createEmbeddings.js");
const { webSearchTool } = await import("../../../packages/mcpServer/lib/tools/webSearch.js");
const { webFetchTool } = await import("../../../packages/mcpServer/lib/tools/webFetch.js");
const { getUsageStatsTool } = await import("../../../packages/mcpServer/lib/tools/getUsageStats.js");
const { checkProviderHealthTool } = await import("../../../packages/mcpServer/lib/tools/checkProviderHealth.js");

const authInfo = { token: "sk-test", clientId: "test", scopes: [] };

describe("generate_image tool", () => {
  it("requests b64_json and returns an MCP image content block", async () => {
    const result = await generateImageTool.handler(
      { model: "openai/gpt-image-1", prompt: "a cat" },
      { authInfo },
    );
    const [, opts] = handleImageGenerationMock.mock.calls[0];
    expect(result.content[0]).toEqual({ type: "image", data: "aW1hZ2ViYXNlNjQ=", mimeType: "image/png" });
    const forwardedBody = await handleImageGenerationMock.mock.calls[0][0].json();
    expect(forwardedBody).toMatchObject({ model: "openai/gpt-image-1", prompt: "a cat", response_format: "b64_json" });
  });
});

describe("generate_video tool", () => {
  it("forwards to handleVideoCreate with the generations action and returns job JSON as text", async () => {
    const result = await generateVideoTool.handler({ prompt: "a dog running" }, { authInfo });
    expect(handleVideoCreateMock).toHaveBeenCalledTimes(1);
    expect(handleVideoCreateMock.mock.calls[0][1]).toBe("generations");
    expect(result.content[0].text).toContain("job-1");
  });
});

describe("text_to_speech tool", () => {
  it("requests json response_format and returns an MCP audio content block", async () => {
    const result = await textToSpeechTool.handler({ model: "openai/alloy", input: "hello" }, { authInfo });
    expect(result.content[0]).toEqual({ type: "audio", data: "YXVkaW9iYXNlNjQ=", mimeType: "audio/mp3" });
    const forwardedUrl = new URL(handleTtsMock.mock.calls[0][0].url);
    expect(forwardedUrl.searchParams.get("response_format")).toBe("json");
  });
});

describe("speech_to_text tool", () => {
  it("builds a multipart request with model + file fields", async () => {
    const result = await speechToTextTool.handler(
      { model: "openai/whisper-1", audio_base64: Buffer.from("fake-audio").toString("base64"), filename: "clip.mp3" },
      { authInfo },
    );
    const forwardedRequest = handleSttMock.mock.calls[0][0];
    const formData = await forwardedRequest.formData();
    expect(formData.get("model")).toBe("openai/whisper-1");
    const file = formData.get("file");
    expect(file.name).toBe("clip.mp3");
    expect(result.content[0].text).toContain("transcribed text");
  });
});

describe("create_embeddings tool", () => {
  it("forwards model/input and returns the raw JSON as text", async () => {
    const result = await createEmbeddingsTool.handler({ model: "openai/text-embedding-3-small", input: "hi" }, { authInfo });
    const forwardedBody = await handleEmbeddingsMock.mock.calls[0][0].json();
    expect(forwardedBody).toEqual({ model: "openai/text-embedding-3-small", input: "hi" });
    expect(result.content[0].text).toContain("0.1");
  });
});

describe("web_search tool", () => {
  it("forwards provider/query fields", async () => {
    const result = await webSearchTool.handler({ provider: "tavily", query: "9router mcp" }, { authInfo });
    const forwardedBody = await handleSearchMock.mock.calls[0][0].json();
    expect(forwardedBody).toMatchObject({ provider: "tavily", query: "9router mcp" });
    expect(result.content[0].text).toContain("hit");
  });
});

describe("web_fetch tool", () => {
  it("forwards provider/url fields", async () => {
    const result = await webFetchTool.handler({ provider: "tavily", url: "https://example.com" }, { authInfo });
    const forwardedBody = await handleFetchMock.mock.calls[0][0].json();
    expect(forwardedBody).toMatchObject({ provider: "tavily", url: "https://example.com" });
    expect(result.content[0].text).toContain("extracted markdown");
  });
});

describe("get_usage_stats tool", () => {
  it("dispatches summary/history/chart views to the right db function", async () => {
    await getUsageStatsTool.handler({ view: "summary", period: "7d" }, {});
    expect(getUsageStatsMock).toHaveBeenCalledWith("7d");

    await getUsageStatsTool.handler({ view: "history", provider: "openai" }, {});
    expect(getUsageHistoryMock).toHaveBeenCalledWith({ provider: "openai", model: undefined, startDate: undefined, endDate: undefined });

    await getUsageStatsTool.handler({ view: "chart" }, {});
    expect(getChartDataMock).toHaveBeenCalledWith("7d");
  });
});

describe("check_provider_health tool", () => {
  it("groups connections by provider and classifies them", async () => {
    const result = await checkProviderHealthTool.handler({}, {});
    const report = JSON.parse(result.content[0].text);
    const openai = report.find((r) => r.provider === "openai");
    const anthropic = report.find((r) => r.provider === "anthropic");
    expect(openai).toMatchObject({ available: 1, permanentlyDown: 1, healthy: true });
    expect(anthropic).toMatchObject({ available: 1, permanentlyDown: 0, healthy: true });
  });

  it("errors when filtering by a provider with no configured accounts", async () => {
    const result = await checkProviderHealthTool.handler({ provider: "does-not-exist" }, {});
    expect(result.isError).toBe(true);
  });
});
