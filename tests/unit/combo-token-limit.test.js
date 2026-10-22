import { describe, it, expect, vi, beforeEach } from "vitest";

import { handleComboChat, resetComboRotation } from "../../open-sse/services/combo.js";

const log = { info: () => {}, warn: () => {}, debug: () => {} };

function okResponse(content) {
  const json = { choices: [{ message: { role: "assistant", content } }] };
  const make = () => ({ ok: true, status: 200, clone: make, json: async () => json });
  return make();
}

describe("combo token-limit bypass", () => {
  beforeEach(() => {
    resetComboRotation();
  });

  it("bypasses a model whose limit is smaller than the prompt", async () => {
    const handleSingleModel = vi.fn(async () => okResponse("ok"));
    await handleComboChat({
      body: { messages: [{ role: "user", content: "hi" }] },
      models: ["small/model-a", "big/model-b"],
      handleSingleModel,
      log,
      autoSwitch: false,
      tokenLimitRouting: {
        enabled: true,
        promptTokens: 5000,
        getMaxInputTokens: (m) => ({ "small/model-a": 100, "big/model-b": 100000 }[m] ?? null),
      },
    });

    expect(handleSingleModel).toHaveBeenCalledTimes(1);
    expect(handleSingleModel.mock.calls[0][1]).toBe("big/model-b");
  });

  it("fails open: tries all models unchanged when every model would be bypassed", async () => {
    const handleSingleModel = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 500, statusText: "err", clone() { return this; }, json: async () => ({}) })
      .mockResolvedValueOnce(okResponse("ok"));

    await handleComboChat({
      body: { messages: [{ role: "user", content: "hi" }] },
      models: ["small/model-a", "small/model-c"],
      handleSingleModel,
      log,
      autoSwitch: false,
      tokenLimitRouting: {
        enabled: true,
        promptTokens: 999999,
        getMaxInputTokens: () => 100, // every model is under the prompt size
      },
    });

    // Both models still get tried in original order — filter fell back to the
    // unfiltered list instead of leaving an empty combo.
    expect(handleSingleModel).toHaveBeenCalledTimes(2);
    expect(handleSingleModel.mock.calls[0][1]).toBe("small/model-a");
    expect(handleSingleModel.mock.calls[1][1]).toBe("small/model-c");
  });

  it("is a no-op when tokenLimitRouting is not provided", async () => {
    const handleSingleModel = vi.fn(async () => okResponse("ok"));
    await handleComboChat({
      body: { messages: [{ role: "user", content: "hi" }] },
      models: ["a/x", "b/y"],
      handleSingleModel,
      log,
      autoSwitch: false,
    });

    expect(handleSingleModel).toHaveBeenCalledTimes(1);
    expect(handleSingleModel.mock.calls[0][1]).toBe("a/x");
  });

  it("runs before tier-routing reorder, so the filtered set is what gets cost-sorted", async () => {
    const handleSingleModel = vi.fn(async () => okResponse("ok"));
    await handleComboChat({
      body: { messages: [{ role: "user", content: "hi" }] },
      models: ["expensive/big", "cheap/small"],
      handleSingleModel,
      log,
      autoSwitch: false,
      tokenLimitRouting: {
        enabled: true,
        promptTokens: 5000,
        // cheap/small can't fit the prompt — must be bypassed even though tier-routing
        // would otherwise prefer it for being cheaper.
        getMaxInputTokens: (m) => ({ "expensive/big": 100000, "cheap/small": 100 }[m] ?? null),
      },
      tierRouting: {
        enabled: true,
        mode: "cheapest-first",
        getPricing: (m) => ({ "expensive/big": { input: 10, output: 10 }, "cheap/small": { input: 0.1, output: 0.1 } }[m] ?? null),
      },
    });

    expect(handleSingleModel).toHaveBeenCalledTimes(1);
    expect(handleSingleModel.mock.calls[0][1]).toBe("expensive/big");
  });
});
