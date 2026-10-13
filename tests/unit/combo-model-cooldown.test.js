import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { handleComboChat, resetComboRotation } from "../../open-sse/services/combo.js";
import { resetComboCooldown } from "@9router/model-combo-cooldown";

const log = { info: () => {}, warn: () => {}, debug: () => {} };

function okResponse(content) {
  const json = { choices: [{ message: { role: "assistant", content } }] };
  const make = () => ({ ok: true, status: 200, clone: make, json: async () => json });
  return make();
}

function failResponse(status = 500) {
  const make = () => ({ ok: false, status, statusText: "err", clone: make, json: async () => ({}) });
  return make();
}

describe("combo model cooldown", () => {
  beforeEach(() => {
    resetComboRotation();
    resetComboCooldown();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("skips a model in the SAME combo after it fails", async () => {
    const failThenOk = vi.fn()
      .mockResolvedValueOnce(failResponse(500))
      .mockResolvedValueOnce(okResponse("ok"));

    await handleComboChat({
      body: { messages: [{ role: "user", content: "hi" }] },
      models: ["openai/gpt-4o", "anthropic/claude"],
      handleSingleModel: failThenOk,
      log,
      autoSwitch: false,
      comboName: "comboA",
      modelCooldown: { enabled: true },
    });
    expect(failThenOk).toHaveBeenCalledTimes(2);

    // Second request to the SAME combo: the failed model must be skipped entirely.
    const secondCall = vi.fn(async () => okResponse("ok"));
    await handleComboChat({
      body: { messages: [{ role: "user", content: "hi again" }] },
      models: ["openai/gpt-4o", "anthropic/claude"],
      handleSingleModel: secondCall,
      log,
      autoSwitch: false,
      comboName: "comboA",
      modelCooldown: { enabled: true },
    });

    expect(secondCall).toHaveBeenCalledTimes(1);
    expect(secondCall.mock.calls[0][1]).toBe("anthropic/claude");
  });

  it("does NOT skip the same model in a DIFFERENT combo", async () => {
    const failThenOk = vi.fn()
      .mockResolvedValueOnce(failResponse(500))
      .mockResolvedValueOnce(okResponse("ok"));

    await handleComboChat({
      body: { messages: [{ role: "user", content: "hi" }] },
      models: ["openai/gpt-4o", "anthropic/claude"],
      handleSingleModel: failThenOk,
      log,
      autoSwitch: false,
      comboName: "comboA",
      modelCooldown: { enabled: true },
    });

    const otherCombo = vi.fn(async () => okResponse("ok"));
    await handleComboChat({
      body: { messages: [{ role: "user", content: "hi" }] },
      models: ["openai/gpt-4o", "anthropic/claude"],
      handleSingleModel: otherCombo,
      log,
      autoSwitch: false,
      comboName: "comboB",
      modelCooldown: { enabled: true },
    });

    expect(otherCombo).toHaveBeenCalledTimes(1);
    expect(otherCombo.mock.calls[0][1]).toBe("openai/gpt-4o");
  });

  it("re-tries the model once the cooldown TTL expires", async () => {
    vi.useFakeTimers();

    const failThenOk = vi.fn()
      .mockResolvedValueOnce(failResponse(500))
      .mockResolvedValueOnce(okResponse("ok"));

    await handleComboChat({
      body: { messages: [{ role: "user", content: "hi" }] },
      models: ["openai/gpt-4o", "anthropic/claude"],
      handleSingleModel: failThenOk,
      log,
      autoSwitch: false,
      comboName: "comboA",
      modelCooldown: { enabled: true, ttlMs: 1000 },
    });

    vi.advanceTimersByTime(1001);

    const afterExpiry = vi.fn(async () => okResponse("ok"));
    await handleComboChat({
      body: { messages: [{ role: "user", content: "hi" }] },
      models: ["openai/gpt-4o", "anthropic/claude"],
      handleSingleModel: afterExpiry,
      log,
      autoSwitch: false,
      comboName: "comboA",
      modelCooldown: { enabled: true, ttlMs: 1000 },
    });

    expect(afterExpiry).toHaveBeenCalledTimes(1);
    expect(afterExpiry.mock.calls[0][1]).toBe("openai/gpt-4o");
  });

  it("fails open: tries every model when all of them are cooling down", async () => {
    const bothFail = vi.fn()
      .mockResolvedValueOnce(failResponse(500))
      .mockResolvedValueOnce(failResponse(500));

    await handleComboChat({
      body: { messages: [{ role: "user", content: "hi" }] },
      models: ["openai/gpt-4o", "anthropic/claude"],
      handleSingleModel: bothFail,
      log,
      autoSwitch: false,
      comboName: "comboA",
      modelCooldown: { enabled: true },
    });
    expect(bothFail).toHaveBeenCalledTimes(2);

    // Both models are now cooling down in comboA — fail-open must still try both.
    const secondRound = vi.fn(async () => okResponse("ok"));
    await handleComboChat({
      body: { messages: [{ role: "user", content: "hi" }] },
      models: ["openai/gpt-4o", "anthropic/claude"],
      handleSingleModel: secondRound,
      log,
      autoSwitch: false,
      comboName: "comboA",
      modelCooldown: { enabled: true },
    });

    expect(secondRound).toHaveBeenCalledTimes(1);
    expect(secondRound.mock.calls[0][1]).toBe("openai/gpt-4o");
  });

  it("is a no-op when modelCooldown is not provided", async () => {
    const failThenOk = vi.fn()
      .mockResolvedValueOnce(failResponse(500))
      .mockResolvedValueOnce(okResponse("ok"));

    await handleComboChat({
      body: { messages: [{ role: "user", content: "hi" }] },
      models: ["openai/gpt-4o", "anthropic/claude"],
      handleSingleModel: failThenOk,
      log,
      autoSwitch: false,
      comboName: "comboA",
    });

    const secondCall = vi.fn(async () => okResponse("ok"));
    await handleComboChat({
      body: { messages: [{ role: "user", content: "hi" }] },
      models: ["openai/gpt-4o", "anthropic/claude"],
      handleSingleModel: secondCall,
      log,
      autoSwitch: false,
      comboName: "comboA",
    });

    // No cooldown config passed -> nothing was ever marked -> model tried again.
    expect(secondCall.mock.calls[0][1]).toBe("openai/gpt-4o");
  });
});
