import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  markComboModelFailed,
  isComboModelSkipped,
  filterSkippedComboModels,
  listActiveCooldowns,
  resetComboCooldown,
} from "@9router/model-combo-cooldown";

describe("model-combo-cooldown", () => {
  beforeEach(() => {
    resetComboCooldown();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("skips a model only within the combo it failed in", () => {
    markComboModelFailed("comboA", "openai/gpt-4o");

    expect(isComboModelSkipped("comboA", "openai/gpt-4o")).toBe(true);
    expect(isComboModelSkipped("comboB", "openai/gpt-4o")).toBe(false);
  });

  it("filters the failed model out of a combo's model list", () => {
    markComboModelFailed("comboA", "openai/gpt-4o");

    const filtered = filterSkippedComboModels("comboA", ["openai/gpt-4o", "anthropic/claude"]);
    expect(filtered).toEqual(["anthropic/claude"]);
  });

  it("fails open: returns the original list unchanged when filtering would empty it", () => {
    markComboModelFailed("comboA", "openai/gpt-4o");
    markComboModelFailed("comboA", "anthropic/claude");

    const filtered = filterSkippedComboModels("comboA", ["openai/gpt-4o", "anthropic/claude"]);
    expect(filtered).toEqual(["openai/gpt-4o", "anthropic/claude"]);
  });

  it("expires the cooldown after the TTL elapses", () => {
    vi.useFakeTimers();
    markComboModelFailed("comboA", "openai/gpt-4o", 5 * 60 * 1000);

    expect(isComboModelSkipped("comboA", "openai/gpt-4o")).toBe(true);

    vi.advanceTimersByTime(5 * 60 * 1000 + 1);

    expect(isComboModelSkipped("comboA", "openai/gpt-4o")).toBe(false);
  });

  it("does not skip a model that was never marked failed", () => {
    expect(isComboModelSkipped("comboA", "openai/gpt-4o")).toBe(false);
  });

  it("lists active cooldowns across combos, for dashboard display", () => {
    markComboModelFailed("comboA", "openai/gpt-4o");
    markComboModelFailed("comboB", "anthropic/claude");

    const active = listActiveCooldowns();
    expect(active).toHaveLength(2);
    expect(active).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ comboName: "comboA", model: "openai/gpt-4o" }),
        expect.objectContaining({ comboName: "comboB", model: "anthropic/claude" }),
      ])
    );
  });

  it("excludes expired entries from listActiveCooldowns", () => {
    vi.useFakeTimers();
    markComboModelFailed("comboA", "openai/gpt-4o", 1000);

    vi.advanceTimersByTime(1001);

    expect(listActiveCooldowns()).toEqual([]);
  });
});
