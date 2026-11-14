// BeatAPI custom provider (packages/providers/registry/beatapi.js) — registry shape, the
// "beatapi" suggested-models filter, pricing block and usage handler.
import { describe, it, expect, vi, beforeEach } from "vitest";

const proxyAwareFetch = vi.fn();
vi.mock("open-sse/utils/proxyFetch.js", () => ({ proxyAwareFetch: (...a) => proxyAwareFetch(...a) }));

import registry from "@9router/providers/registry/index.js";
import { FILTERS } from "@9router/providers/suggested-models/filters.js";
import { PROVIDER_PRICING } from "@9router/providers/pricing.js";
import { USAGE_HANDLERS } from "@9router/providers/usage/index.js";
import { getBeatApiUsage } from "@9router/providers/usage/beatapi.js";

const FREE_IDS = ["glm-5.3-flash-free", "deepseek-v4.1-flash-free", "hy4-free"];

describe("beatapi registry", () => {
  const beatapi = registry.find((p) => p.id === "beatapi");

  it("is registered exactly once with an apikey/llm config", () => {
    expect(beatapi).toBeTruthy();
    expect(registry.filter((p) => p.id === "beatapi")).toHaveLength(1);
    expect(beatapi.authType).toBe("apikey");
    expect(beatapi.serviceKinds).toEqual(["llm"]);
    expect(beatapi.transport.baseUrl).toBe("https://api.beatapi.io/v1/chat/completions");
    expect(beatapi.display.notice.signupUrl).toBe("https://beatapi.io/sign-in");
  });

  it("seeds the 3 free models and has pricing for each", () => {
    expect(beatapi.models.map((m) => m.id)).toEqual(FREE_IDS);
    for (const id of FREE_IDS) expect(PROVIDER_PRICING.beatapi[id]).toMatchObject({ input: 0, output: 0 });
  });

  it("points modelsFetcher at a filter that exists", () => {
    expect(FILTERS[beatapi.transport.modelsFetcher.type]).toBeTypeOf("function");
  });
});

describe("FILTERS.beatapi", () => {
  const inner = [
    { id: "hy4-free", family: "free", endpoints: ["openai"] },
    { id: "glm-5.3", endpoints: ["openai"], context_length: 1000000 },
    { id: "anthropic-only", endpoints: ["anthropic"] },
    { id: "no-endpoints-field" },
  ];

  it("unwraps the route's single-element wrapper of the { object, data } catalog", () => {
    const out = FILTERS.beatapi([{ object: "list", data: inner }]);
    expect(out.map((m) => m.id)).toEqual(["glm-5.3", "hy4-free", "no-endpoints-field"]);
    expect(out.find((m) => m.id === "glm-5.3").contextLength).toBe(1000000);
  });

  it("accepts an already-unwrapped array", () => {
    expect(FILTERS.beatapi(inner).map((m) => m.id)).toContain("hy4-free");
  });

  it("returns [] for empty / non-array input", () => {
    expect(FILTERS.beatapi(undefined)).toEqual([]);
    expect(FILTERS.beatapi([])).toEqual([]);
  });
});

describe("beatapi usage handler", () => {
  beforeEach(() => proxyAwareFetch.mockReset());

  it("is wired into USAGE_HANDLERS", () => {
    expect(USAGE_HANDLERS.beatapi).toBeTypeOf("function");
  });

  it("asks for a key when none is given (no network call)", async () => {
    const r = await getBeatApiUsage(null);
    expect(r.message).toMatch(/API key not available/);
    expect(proxyAwareFetch).not.toHaveBeenCalled();
  });

  it("maps credit_balance to a non-resetting credit pot and sends a Bearer header", async () => {
    proxyAwareFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ credit_balance: 1.25 }) });
    const r = await getBeatApiUsage("  sk-test  ");
    expect(proxyAwareFetch.mock.calls[0][1].headers.Authorization).toBe("Bearer sk-test");
    expect(r.quotas["Credit balance (USD)"]).toMatchObject({ total: 1.25, unlimited: true, remainingPercentage: 100 });
  });

  it("treats a zero balance as empty, not as an error", async () => {
    proxyAwareFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ credit_balance: 0 }) });
    const r = await getBeatApiUsage("k");
    expect(r.quotas["Credit balance (USD)"]).toMatchObject({ total: 0, unlimited: false, remainingPercentage: 0 });
  });

  it("reports auth failure on 401 and a message on a malformed body", async () => {
    proxyAwareFetch.mockResolvedValue({ ok: false, status: 401, text: async () => "" });
    expect((await getBeatApiUsage("bad")).message).toMatch(/authentication failed/);
    proxyAwareFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    expect((await getBeatApiUsage("k")).message).toMatch(/missing credit_balance/);
  });
});
