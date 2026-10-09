import { describe, expect, it } from "vitest";

import REGISTRY from "../../open-sse/providers/registry/index.js";
import { PROVIDERS, PROVIDER_MODELS, PROVIDER_MEDIA } from "../../open-sse/providers/index.js";

describe("Vilao AI provider", () => {
  const vilao = REGISTRY.find((e) => e.id === "vilao");

  it("is registered as an OpenAI-compatible apikey provider", () => {
    expect(vilao).toBeDefined();
    expect(vilao.category).toBe("apikey");
    expect(vilao.authType).toBe("apikey");
    expect(vilao.transport.baseUrl).toBe("https://api.vilao.ai/v1/chat/completions");
    expect(vilao.alias).toBe("vilao");
  });

  it("enables dynamic model discovery and passthrough (marketplace catalog depends on the key's subscriptions)", () => {
    expect(vilao.passthroughModels).toBe(true);
    expect(vilao.modelsFetcher).toMatchObject({
      url: "https://api.vilao.ai/v1/models",
      type: "openai",
    });
  });

  it("builds into the runtime PROVIDERS map with the openai format default", () => {
    expect(PROVIDERS.vilao).toBeDefined();
    expect(PROVIDERS.vilao.format).toBe("openai");
    expect(PROVIDERS.vilao.baseUrl).toBe("https://api.vilao.ai/v1/chat/completions");
    expect(PROVIDERS.vilao.validateUrl).toBe("https://api.vilao.ai/v1/models");
  });

  it("exposes seed models for the marketplace catalog", () => {
    const ids = (PROVIDER_MODELS.vilao || []).map((m) => m.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(ids).toContain("gpt-4o");
    expect(ids).toContain("claude-sonnet-4.6");
  });

  it("exposes embeddings via a dedicated endpoint", () => {
    expect(PROVIDER_MEDIA.vilao?.embeddingConfig?.baseUrl).toBe("https://api.vilao.ai/v1/embeddings");
  });

  it("keeps every registry id unique after adding vilao", () => {
    const ids = REGISTRY.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
