import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  reorderFailingModelsToEnd,
  planComboReorders,
  runComboAutoReorderSweep,
  groupFailingModelsByCombo,
  restoreModelNow,
  suppressComboModelReorder,
  isComboModelReorderSuppressed,
  resetComboModelReorderSuppression,
} from "@9router/combo-auto-reorder";

describe("reorderFailingModelsToEnd", () => {
  it("moves the failing model to the end, matching the user's worked example", () => {
    const models = [
      "groq/llama-3.3-70b-versatile",
      "mistral/mistral-large-latest",
      "mistral/mistral-medium-latest",
      "cohere/command-a-03-2025",
      "kc/deepseek/deepseek-chat",
      "groq/qwen/qwen3-32b",
      "cf/@cf/mistralai/mistral-small-3.1-24b-instruct",
    ];
    const next = reorderFailingModelsToEnd(models, new Set(["groq/llama-3.3-70b-versatile"]));
    expect(next).toEqual([
      "mistral/mistral-large-latest",
      "mistral/mistral-medium-latest",
      "cohere/command-a-03-2025",
      "kc/deepseek/deepseek-chat",
      "groq/qwen/qwen3-32b",
      "cf/@cf/mistralai/mistral-small-3.1-24b-instruct",
      "groq/llama-3.3-70b-versatile",
    ]);
  });

  it("moves multiple failing models to the end, preserving relative order of both groups", () => {
    const models = ["a", "b", "c", "d"];
    const next = reorderFailingModelsToEnd(models, new Set(["a", "c"]));
    expect(next).toEqual(["b", "d", "a", "c"]);
  });

  it("returns the same array reference when no model is failing (no-op write avoidance)", () => {
    const models = ["a", "b", "c"];
    const next = reorderFailingModelsToEnd(models, new Set());
    expect(next).toBe(models);
  });

  it("returns the same array reference when the failing model isn't in this combo", () => {
    const models = ["a", "b", "c"];
    const next = reorderFailingModelsToEnd(models, new Set(["z"]));
    expect(next).toBe(models);
  });

  it("returns the same array reference when every model is already failing (order already \"correct\")", () => {
    const models = ["a", "b"];
    const next = reorderFailingModelsToEnd(models, new Set(["a", "b"]));
    expect(next).toBe(models);
  });

  it("returns the same array reference when the failing model is already at the end", () => {
    const models = ["a", "b", "c"];
    const next = reorderFailingModelsToEnd(models, new Set(["c"]));
    expect(next).toBe(models);
  });

  it("is a no-op for a single-model combo", () => {
    const models = ["only-one"];
    const next = reorderFailingModelsToEnd(models, new Set(["only-one"]));
    expect(next).toBe(models);
  });
});

describe("planComboReorders", () => {
  const combos = [
    { id: "1", name: "9r-combo-n8n-v2.2", updatedAt: "t1", models: ["groq/a", "mistral/b", "cohere/c"] },
    { id: "2", name: "9r-combo-other", updatedAt: "t2", models: ["openai/x", "openai/y"] },
  ];

  it("plans a reorder only for the combo whose model breached the threshold", () => {
    const failCounts = [
      { comboName: "9r-combo-n8n-v2.2", provider: "groq", model: "a", count: 12 },
      { comboName: "9r-combo-n8n-v2.2", provider: "mistral", model: "b", count: 3 }, // below threshold
    ];
    const plans = planComboReorders(combos, failCounts, 10);
    expect(plans).toEqual([
      { id: "1", name: "9r-combo-n8n-v2.2", updatedAt: "t1", models: ["mistral/b", "cohere/c", "groq/a"] },
    ]);
  });

  it("treats count exactly at threshold as failing (>=, not >)", () => {
    const failCounts = [{ comboName: "9r-combo-other", provider: "openai", model: "x", count: 10 }];
    const plans = planComboReorders(combos, failCounts, 10);
    expect(plans).toEqual([
      { id: "2", name: "9r-combo-other", updatedAt: "t2", models: ["openai/y", "openai/x"] },
    ]);
  });

  it("scopes fail counts per combo — a model failing in one combo doesn't affect another", () => {
    const failCounts = [{ comboName: "some-unrelated-combo", provider: "groq", model: "a", count: 99 }];
    const plans = planComboReorders(combos, failCounts, 10);
    expect(plans).toEqual([]);
  });

  it("returns no plans when nothing breaches the threshold", () => {
    const failCounts = [{ comboName: "9r-combo-n8n-v2.2", provider: "groq", model: "a", count: 5 }];
    expect(planComboReorders(combos, failCounts, 10)).toEqual([]);
  });

  it("returns no plans for an empty/invalid threshold", () => {
    const failCounts = [{ comboName: "9r-combo-n8n-v2.2", provider: "groq", model: "a", count: 99 }];
    expect(planComboReorders(combos, failCounts, 0)).toEqual([]);
    expect(planComboReorders(combos, failCounts, NaN)).toEqual([]);
  });
});

describe("runComboAutoReorderSweep", () => {
  function makeDeps(overrides = {}) {
    return {
      getSettings: vi.fn().mockResolvedValue({
        comboAutoReorderEnabled: true,
        comboAutoReorderFailThreshold: 10,
        comboAutoReorderWindowMs: 3600000,
      }),
      getRecentModelFailCounts: vi.fn().mockResolvedValue([
        { comboName: "9r-combo-n8n-v2.2", provider: "groq", model: "a", count: 12 },
      ]),
      getCombos: vi.fn().mockResolvedValue([
        { id: "1", name: "9r-combo-n8n-v2.2", updatedAt: "t1", models: ["groq/a", "mistral/b"] },
      ]),
      updateCombo: vi.fn().mockResolvedValue({ id: "1", name: "9r-combo-n8n-v2.2", models: ["mistral/b", "groq/a"] }),
      resetComboRotation: vi.fn(),
      ...overrides,
    };
  }

  it("no-ops entirely when the feature is disabled in settings", async () => {
    const deps = makeDeps({ getSettings: vi.fn().mockResolvedValue({ comboAutoReorderEnabled: false }) });
    const result = await runComboAutoReorderSweep(deps);
    expect(result).toEqual({ checked: 0, reordered: [], skipped: [] });
    expect(deps.getRecentModelFailCounts).not.toHaveBeenCalled();
    expect(deps.updateCombo).not.toHaveBeenCalled();
  });

  it("reorders a breaching combo and resets its rotation state", async () => {
    const deps = makeDeps();
    const result = await runComboAutoReorderSweep(deps);

    expect(deps.updateCombo).toHaveBeenCalledWith(
      "1",
      { models: ["mistral/b", "groq/a"] },
      { expectedUpdatedAt: "t1" }
    );
    expect(deps.resetComboRotation).toHaveBeenCalledWith("9r-combo-n8n-v2.2");
    expect(result).toEqual({ checked: 1, reordered: ["9r-combo-n8n-v2.2"], skipped: [] });
  });

  it("skips (fail-open) a combo whose write conflicts with a concurrent manual edit, without throwing", async () => {
    const deps = makeDeps({
      updateCombo: vi.fn().mockRejectedValue(new Error("Combo 1 was modified concurrently; aborting stale write")),
    });
    const result = await runComboAutoReorderSweep(deps);

    expect(result.reordered).toEqual([]);
    expect(result.skipped).toEqual(["9r-combo-n8n-v2.2"]);
    expect(deps.resetComboRotation).not.toHaveBeenCalled();
  });

  it("falls back to default threshold/window when settings values are missing", async () => {
    const deps = makeDeps({
      getSettings: vi.fn().mockResolvedValue({ comboAutoReorderEnabled: true }),
    });
    await runComboAutoReorderSweep(deps);
    expect(deps.getRecentModelFailCounts).toHaveBeenCalledWith(60 * 60 * 1000);
  });

  it("skips a combo whose only failing model is currently suppressed (manual restore in effect)", async () => {
    const deps = makeDeps({ isSuppressed: (comboName, modelStr) => comboName === "9r-combo-n8n-v2.2" && modelStr === "groq/a" });
    const result = await runComboAutoReorderSweep(deps);
    expect(deps.updateCombo).not.toHaveBeenCalled();
    expect(result).toEqual({ checked: 1, reordered: [], skipped: [] });
  });
});

describe("promote-back over multiple sweep ticks (no stored original position needed)", () => {
  // Demonstrates the plan.md claim: re-running planComboReorders each tick against the
  // *current* combo.models + *current* rolling fail counts naturally promotes a
  // recovered model back ahead of any still-failing ones — no separate "undo" logic or
  // persisted original-index bookkeeping required.
  it("moves a recovered model back toward the front once it drops out of the failing set", () => {
    const threshold = 10;
    let combo = { id: "1", name: "c", updatedAt: "t0", models: ["p/A", "p/B", "p/C", "p/D"] };

    // Tick 1: A fails.
    let plans = planComboReorders([combo], [{ comboName: "c", provider: "p", model: "A", count: 12 }], threshold);
    combo = { ...combo, models: plans[0].models, updatedAt: "t1" };
    expect(combo.models).toEqual(["p/B", "p/C", "p/D", "p/A"]);

    // Tick 2: A still fails, C also starts failing.
    plans = planComboReorders(
      [combo],
      [
        { comboName: "c", provider: "p", model: "A", count: 12 },
        { comboName: "c", provider: "p", model: "C", count: 11 },
      ],
      threshold
    );
    combo = { ...combo, models: plans[0].models, updatedAt: "t2" };
    expect(combo.models).toEqual(["p/B", "p/D", "p/C", "p/A"]);

    // Tick 3: A recovers (aged out of the rolling window), C still fails.
    plans = planComboReorders([combo], [{ comboName: "c", provider: "p", model: "C", count: 11 }], threshold);
    combo = { ...combo, models: plans[0].models, updatedAt: "t3" };
    // A moves back ahead of C (still failing) without ever having its original index 0 stored anywhere.
    expect(combo.models).toEqual(["p/B", "p/D", "p/A", "p/C"]);

    // Tick 4: everything recovered — no more plans, order stays exactly as-is.
    plans = planComboReorders([combo], [], threshold);
    expect(plans).toEqual([]);
  });
});

describe("groupFailingModelsByCombo", () => {
  it("excludes a pair the caller marks as suppressed, even though it's over threshold", () => {
    const failCounts = [{ comboName: "c", provider: "groq", model: "a", count: 99 }];
    const grouped = groupFailingModelsByCombo(failCounts, 10, (comboName, modelStr) => comboName === "c" && modelStr === "groq/a");
    expect(grouped.size).toBe(0);
  });

  it("includes the pair when no suppression predicate is given", () => {
    const failCounts = [{ comboName: "c", provider: "groq", model: "a", count: 99 }];
    const grouped = groupFailingModelsByCombo(failCounts, 10);
    expect(grouped.get("c")).toEqual(new Set(["groq/a"]));
  });
});

describe("demotionSuppression store", () => {
  beforeEach(() => {
    resetComboModelReorderSuppression();
  });

  it("suppresses exactly the (combo, model) pair marked, not the whole combo", () => {
    suppressComboModelReorder("c", "groq/a", 60000);
    expect(isComboModelReorderSuppressed("c", "groq/a")).toBe(true);
    expect(isComboModelReorderSuppressed("c", "groq/b")).toBe(false);
    expect(isComboModelReorderSuppressed("other-combo", "groq/a")).toBe(false);
  });

  it("expires after the TTL elapses", () => {
    vi.useFakeTimers();
    suppressComboModelReorder("c", "groq/a", 1000);
    expect(isComboModelReorderSuppressed("c", "groq/a")).toBe(true);
    vi.advanceTimersByTime(1001);
    expect(isComboModelReorderSuppressed("c", "groq/a")).toBe(false);
    vi.useRealTimers();
  });
});

describe("restoreModelNow", () => {
  function makeDeps(overrides = {}) {
    return {
      getSettings: vi.fn().mockResolvedValue({ comboAutoReorderFailThreshold: 10, comboAutoReorderWindowMs: 3600000 }),
      getComboByName: vi.fn().mockResolvedValue({ id: "1", name: "c", updatedAt: "t1", models: ["B", "C", "groq/a"] }),
      updateCombo: vi.fn().mockResolvedValue({ id: "1", name: "c", models: ["groq/a", "B", "C"] }),
      resetComboRotation: vi.fn(),
      suppressComboModelReorder: vi.fn(),
      ...overrides,
    };
  }

  it("suppresses the pair and moves it back into the healthy group immediately", async () => {
    const deps = makeDeps();
    const result = await restoreModelNow(deps, { comboName: "c", provider: "groq", model: "a" });

    expect(deps.suppressComboModelReorder).toHaveBeenCalledWith("c", "groq/a", 3600000);
    expect(deps.updateCombo).toHaveBeenCalledWith(
      "1",
      { models: ["groq/a", "B", "C"] },
      { expectedUpdatedAt: "t1" }
    );
    expect(deps.resetComboRotation).toHaveBeenCalledWith("c");
    expect(result).toEqual({ restored: true });
  });

  it("errors when the model isn't declared in that combo", async () => {
    const deps = makeDeps({ getComboByName: vi.fn().mockResolvedValue({ id: "1", name: "c", updatedAt: "t1", models: ["B", "C"] }) });
    const result = await restoreModelNow(deps, { comboName: "c", provider: "groq", model: "a" });
    expect(result.restored).toBe(false);
    expect(deps.updateCombo).not.toHaveBeenCalled();
  });

  it("errors when the combo doesn't exist", async () => {
    const deps = makeDeps({ getComboByName: vi.fn().mockResolvedValue(null) });
    const result = await restoreModelNow(deps, { comboName: "missing", provider: "groq", model: "a" });
    expect(result.restored).toBe(false);
    expect(result.reason).toMatch(/not found/);
  });

  it("reports a conflict instead of throwing when the write races a concurrent edit", async () => {
    const deps = makeDeps({ updateCombo: vi.fn().mockRejectedValue(new Error("Combo 1 was modified concurrently; aborting stale write")) });
    const result = await restoreModelNow(deps, { comboName: "c", provider: "groq", model: "a" });
    expect(result.restored).toBe(false);
    expect(result.reason).toMatch(/concurrently/);
  });

  it("is a no-op (still reports restored) when the model is already first", async () => {
    const deps = makeDeps({
      getComboByName: vi.fn().mockResolvedValue({ id: "1", name: "c", updatedAt: "t1", models: ["groq/a", "B", "C"] }),
    });
    const result = await restoreModelNow(deps, { comboName: "c", provider: "groq", model: "a" });
    expect(deps.updateCombo).not.toHaveBeenCalled();
    expect(result).toEqual({ restored: true });
  });
});
