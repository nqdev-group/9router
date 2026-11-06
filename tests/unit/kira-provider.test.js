// Kira AI custom provider (packages/providers/registry/kiraai.js) — registry shape, free seeds with $0
// prices, and consistency with the companion handlers (usage, image/tts/video).
import { describe, it, expect } from "vitest";

import registry from "@9router/providers/registry/index.js";
import { PROVIDER_PRICING } from "@9router/providers/pricing.js";
import { USAGE_HANDLERS } from "@9router/providers/usage/index.js";
import { getImageAdapter } from "open-sse/handlers/imageProviders/index.js";
import { getTtsAdapter } from "open-sse/handlers/ttsProviders/index.js";

const kira = registry.find((p) => p.id === "kiraai");
const FREE_IDS = ["stealth/crouton-alpha", "longcat-2.5-free"];

describe("kira registry", () => {
  it("is registered exactly once with an apikey config covering llm/image/video/tts", () => {
    expect(kira).toBeTruthy();
    expect(registry.filter((p) => p.id === "kiraai")).toHaveLength(1);
    expect(kira.authType).toBe("apikey");
    expect(kira.serviceKinds).toEqual(["llm", "image", "video", "tts"]);
    expect(kira.transport.baseUrl).toBe("https://kiraai.vn/api/v1/chat/completions");
    expect(kira.display.notice.apiKeyUrl).toBe("https://kiraai.vn/developer/");
  });

  it("uses the standard openai models fetcher on the public catalog", () => {
    expect(kira.transport.modelsFetcher).toEqual({ url: "https://kiraai.vn/api/v1/models", type: "openai" });
  });

  it("seeds the free models first, tags them '(Miễn phí)' and prices them at $0", () => {
    const tagged = kira.models.filter((m) => /Miễn phí/.test(m.name)).map((m) => m.id);
    expect(tagged).toEqual(FREE_IDS);
    for (const id of FREE_IDS) expect(PROVIDER_PRICING.kiraai[id]).toMatchObject({ input: 0, output: 0 });
  });

  it("does not tag priced models as free (kira-mini-1.0 is is_free:false)", () => {
    expect(kira.models.find((m) => m.id === "kira-mini-1.0").name).not.toMatch(/Miễn phí/);
    expect(PROVIDER_PRICING.kiraai["kira-mini-1.0"].input).toBeGreaterThan(0);
  });

  it("has unique model ids", () => {
    const ids = kira.models.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("kira companion pieces", () => {
  it("enables usage and has a usage handler wired", () => {
    expect(kira.features).toMatchObject({ usage: true, usageApikey: true });
    expect(USAGE_HANDLERS.kiraai).toBeTypeOf("function");
  });

  it("image handler targets the registry's imageConfig url", () => {
    expect(getImageAdapter("kiraai").buildUrl()).toBe(kira.imageConfig.baseUrl);
  });

  it("tts handler exists and the registry's voices are all mapped", () => {
    expect(getTtsAdapter("kiraai").synthesize).toBeTypeOf("function");
    expect(kira.ttsConfig.baseUrl).toBe("https://kiraai.vn/api/v1/audio/speech");
    expect(kira.ttsConfig.voices.map((v) => v.id)).toEqual(["alloy", "echo", "fable", "onyx", "nova", "shimmer"]);
  });
});
