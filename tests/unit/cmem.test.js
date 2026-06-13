import { describe, it, expect, vi, beforeEach } from "vitest";
import { CmemEngine } from "../../packages/cmem/core/index.js";
import { MemoryStore } from "../../packages/cmem/core/memoryStore.js";
import { Summarizer } from "../../packages/cmem/core/summarizer.js";
import { ContextBuilder } from "../../packages/cmem/core/contextBuilder.js";
import { TokenBudget } from "../../packages/cmem/core/tokenBudget.js";
import { resolveCmemConfig, MIN_TOKEN_BUDGET, MAX_TOKEN_BUDGET } from "../../packages/cmem/core/configResolver.js";
import { Observer } from "../../packages/cmem/capture/observer.js";
import { OBSERVATION_TYPES } from "../../packages/cmem/capture/types.js";
import { Injector } from "../../packages/cmem/injection/injector.js";
import { injectOpenAI } from "../../packages/cmem/injection/formatters/openai.js";
import { injectClaude } from "../../packages/cmem/injection/formatters/claude.js";
import { injectGemini } from "../../packages/cmem/injection/formatters/gemini.js";
import { hashContent, hashObject } from "../../packages/cmem/utils/hash.js";
import { estimateTokens, estimateTokensFromMessages } from "../../packages/cmem/utils/tokens.js";
import { DEFAULT_CMEM_CONFIG } from "../../packages/cmem/config/defaults.js";
import { VALID_CMEM_MODE_KEYS, CMEM_MODES } from "../../packages/cmem/config/modes.js";

function createMockDb() {
  const store = new Map();
  let rowIdCounter = 0;
  return {
    async run(sql, params = []) {
      if (sql.includes("CREATE TABLE") || sql.includes("CREATE INDEX") || sql.includes("CREATE VIRTUAL TABLE")) return;
      if (sql.includes("DELETE")) {
        const keysToDelete = [];
        if (sql.includes("WHERE id = ?")) {
          for (const [key, val] of store) {
            if (val.id === params[0]) keysToDelete.push(key);
          }
        } else if (sql.includes("WHERE created_at_epoch < ?")) {
          const cutoff = params[0];
          for (const [key, val] of store) {
            if (val.created_at_epoch < cutoff) keysToDelete.push(key);
          }
        }
        for (const key of keysToDelete) store.delete(key);
        return;
      }
      if (sql.includes("INSERT OR REPLACE")) {
        const rowid = ++rowIdCounter;
        const columns = [
          "id", "session_id", "type", "title", "content", "summary",
          "facts", "concepts", "files_read", "files_modified", "tokens", "provider", "created_at_epoch"
        ];
        const row = { rowid };
        columns.forEach((col, i) => { row[col] = params[i]; });
        store.set(rowid, row);
        return;
      }
    },
    async get(sql, params = []) {
      if (sql.includes("COUNT(")) {
        let count = 0;
        for (const [, row] of store) {
          if (sql.includes("cmem_observations")) count++;
        }
        return sql.includes("as total") ? { total: count } : { count };
      }
      if (sql.includes("SUM(tokens)")) {
        let total = 0;
        for (const [, row] of store) { total += (row.tokens || 0); }
        return { total };
      }
      return null;
    },
    async all(sql, params = []) {
      const results = [];
      if (sql.includes("FROM cmem_observations")) {
        for (const [, row] of store) {
          if (params.length > 0 && sql.includes("WHERE")) {
            if (sql.includes("AND type = ?") && row.type !== params[1]) continue;
          }
          results.push({ ...row });
        }
        results.sort((a, b) => (b.created_at_epoch || 0) - (a.created_at_epoch || 0));
      }
      if (sql.includes("FROM cmem_sessions")) return [];
      if (sql.includes("GROUP BY type")) {
        const typeMap = {};
        for (const [, row] of store) {
          typeMap[row.type] = (typeMap[row.type] || 0) + 1;
        }
        return Object.entries(typeMap).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
      }
      return results;
    },
    _store: store,
  };
}

// ===== Hash =====
describe("hashContent", () => {
  it("returns '0' for null/undefined/empty", () => {
    expect(hashContent(null)).toBe("0");
    expect(hashContent(undefined)).toBe("0");
    expect(hashContent("")).toBe("0");
  });

  it("returns deterministic hash", () => {
    const h1 = hashContent("hello world");
    const h2 = hashContent("hello world");
    expect(h1).toBe(h2);
    expect(typeof h1).toBe("string");
  });

  it("returns different hashes for different inputs", () => {
    expect(hashContent("aaa")).not.toBe(hashContent("bbb"));
  });
});

describe("hashObject", () => {
  it("returns deterministic hash for same object", () => {
    const obj = { a: 1, b: [2, 3] };
    expect(hashObject(obj)).toBe(hashObject({ a: 1, b: [2, 3] }));
  });
});

// ===== Tokens =====
describe("estimateTokens", () => {
  it("returns 0 for null/empty", () => {
    expect(estimateTokens(null)).toBe(0);
    expect(estimateTokens("")).toBe(0);
  });

  it("estimates ~1 token per 4 chars", () => {
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("abcdefgh")).toBe(2);
  });

  it("rounds up", () => {
    expect(estimateTokens("abcde")).toBe(2);
  });
});

describe("estimateTokensFromMessages", () => {
  it("returns 0 for non-array", () => {
    expect(estimateTokensFromMessages(null)).toBe(0);
    expect(estimateTokensFromMessages("string")).toBe(0);
  });

  it("counts string content tokens + role overhead", () => {
    const msgs = [{ role: "user", content: "hello" }];
    const tokens = estimateTokensFromMessages(msgs);
    expect(tokens).toBeGreaterThan(0);
    expect(tokens).toBe(estimateTokens("hello") + 4);
  });

  it("counts array content tokens", () => {
    const msgs = [{ role: "user", content: [{ type: "text", text: "hello" }, { type: "image", url: "x" }] }];
    const tokens = estimateTokensFromMessages(msgs);
    expect(tokens).toBe(estimateTokens("hello") + 4);
  });
});

// ===== TokenBudget =====
describe("TokenBudget", () => {
  it("starts with 0 used", () => {
    const b = new TokenBudget(1000);
    expect(b.used).toBe(0);
    expect(b.remaining()).toBe(1000);
  });

  it("canFit returns true when within budget", () => {
    const b = new TokenBudget(100);
    expect(b.canFit(50)).toBe(true);
    b.consume(60);
    expect(b.canFit(50)).toBe(false);
  });

  it("consume adds to used", () => {
    const b = new TokenBudget(100);
    b.consume(30);
    b.consume(20);
    expect(b.used).toBe(50);
  });

  it("reset clears used", () => {
    const b = new TokenBudget(100);
    b.consume(80);
    b.reset();
    expect(b.used).toBe(0);
    expect(b.remaining()).toBe(100);
  });
});

// ===== Config Resolver =====
describe("resolveCmemConfig", () => {
  it("returns defaults when null/undefined", () => {
    expect(resolveCmemConfig(null)).toEqual(DEFAULT_CMEM_CONFIG);
    expect(resolveCmemConfig(undefined)).toEqual(DEFAULT_CMEM_CONFIG);
  });

  it("merges with defaults", () => {
    const result = resolveCmemConfig({ tokenBudget: 8000 });
    expect(result.tokenBudget).toBe(8000);
    expect(result.mode).toBe(DEFAULT_CMEM_CONFIG.mode);
  });

  it("clamps tokenBudget below MIN", () => {
    const result = resolveCmemConfig({ tokenBudget: 100 });
    expect(result.tokenBudget).toBe(MIN_TOKEN_BUDGET);
  });

  it("clamps tokenBudget above MAX", () => {
    const result = resolveCmemConfig({ tokenBudget: 99999 });
    expect(result.tokenBudget).toBe(MAX_TOKEN_BUDGET);
  });

  it("rejects invalid mode", () => {
    const result = resolveCmemConfig({ mode: "invalid" });
    expect(result.mode).toBe(DEFAULT_CMEM_CONFIG.mode);
  });

  it("rejects invalid historyDepth", () => {
    const result = resolveCmemConfig({ historyDepth: "invalid" });
    expect(result.historyDepth).toBe(DEFAULT_CMEM_CONFIG.historyDepth);
  });

  it("rejects invalid searchMode", () => {
    const result = resolveCmemConfig({ searchMode: "invalid" });
    expect(result.searchMode).toBe(DEFAULT_CMEM_CONFIG.searchMode);
  });

  it("clamps maxObservations below 1", () => {
    const result = resolveCmemConfig({ maxObservations: 0 });
    expect(result.maxObservations).toBe(1);
  });

  it("clamps maxObservations above 100", () => {
    const result = resolveCmemConfig({ maxObservations: 200 });
    expect(result.maxObservations).toBe(100);
  });
});

// ===== Observer =====
describe("Observer", () => {
  it("returns null when no messages and no response", () => {
    const obs = new Observer();
    expect(obs.observe({})).toBeNull();
  });

  it("observes a user message", () => {
    const obs = new Observer();
    const result = obs.observe({
      messages: [{ role: "user", content: "implement the auth module" }],
      provider: "openai",
    });
    expect(result).not.toBeNull();
    expect(result.type).toBe(OBSERVATION_TYPES.IMPLEMENTATION);
    expect(result.title).toContain("implement");
    expect(result.provider).toBe("openai");
    expect(result.id).toBeTruthy();
    expect(result.tokens).toBeGreaterThan(0);
  });

  it("classifies bugfix messages", () => {
    const obs = new Observer();
    const result = obs.observe({
      messages: [{ role: "user", content: "fix the crash bug in login" }],
    });
    expect(result.type).toBe(OBSERVATION_TYPES.BUGFIX);
  });

  it("classifies decision messages", () => {
    const obs = new Observer();
    const result = obs.observe({
      messages: [{ role: "user", content: "I decide to use PostgreSQL over SQLite" }],
    });
    expect(result.type).toBe(OBSERVATION_TYPES.DECISION);
  });

  it("classifies exploration messages", () => {
    const obs = new Observer();
    const result = obs.observe({
      messages: [{ role: "user", content: "search the codebase for auth patterns" }],
    });
    expect(result.type).toBe(OBSERVATION_TYPES.EXPLORATION);
  });

  it("classifies question messages", () => {
    const obs = new Observer();
    const result = obs.observe({
      messages: [{ role: "user", content: "what is the auth flow?" }],
    });
    expect(result.type).toBe(OBSERVATION_TYPES.QUESTION);
  });

  it("strips <private> tags", () => {
    const obs = new Observer({ excludePrivateContent: true });
    const result = obs.observe({
      messages: [{ role: "user", content: "fix the bug <private>secret password: abc123</private> here" }],
    });
    expect(result.content).not.toContain("secret password");
    expect(result.content).toContain("fix the bug");
  });

  it("does not strip private tags when disabled", () => {
    const obs = new Observer({ excludePrivateContent: false });
    const result = obs.observe({
      messages: [{ role: "user", content: "fix the bug <private>secret password: abc123</private> here" }],
    });
    expect(result.content).toContain("secret password");
  });

  it("includes tool results in content", () => {
    const obs = new Observer();
    const result = obs.observe({
      messages: [
        { role: "user", content: "show me the auth module" },
        { role: "tool", content: "function auth() { ... }" },
      ],
    });
    expect(result.content).toContain("function auth");
  });

  it("handles array-type content in messages", () => {
    const obs = new Observer();
    const result = obs.observe({
      messages: [{ role: "user", content: [{ type: "text", text: "implement X" }] }],
    });
    expect(result).not.toBeNull();
    expect(result.content).toContain("implement X");
  });

  it("extract query from response", () => {
    const obs = new Observer();
    const result = obs.observe({
      messages: [{ role: "user", content: "hello" }],
      response: "world",
    });
    expect(result.content).toContain("[response] world");
  });
});

// ===== Summarizer =====
describe("Summarizer", () => {
  it("returns null for null observation", async () => {
    const s = new Summarizer();
    expect(await s.summarize(null)).toBeNull();
  });

  it("returns null for observation without content", async () => {
    const s = new Summarizer();
    expect(await s.summarize({})).toBeNull();
  });

  it("uses simple summary when content is short (<100 tokens)", async () => {
    const s = new Summarizer();
    const result = await s.summarize({ content: "short text" });
    expect(result).not.toBeNull();
    expect(result.summary).toBeTruthy();
    expect(Array.isArray(result.facts)).toBe(true);
    expect(Array.isArray(result.concepts)).toBe(true);
  });

  it("uses simple summary when no endpoint configured", async () => {
    const s = new Summarizer({});
    const longContent = "word ".repeat(500);
    const result = await s.summarize({ content: longContent });
    expect(result).not.toBeNull();
    expect(result.summary).toBeTruthy();
  });

  it("extracts concepts from content", async () => {
    const s = new Summarizer();
    const result = await s.summarize({
      content: "implement the authentication module using JWT tokens for session management",
    });
    expect(result.concepts.length).toBeGreaterThan(0);
  });
});

// ===== Injector =====
describe("Injector", () => {
  it("returns null when no body or context", () => {
    const inj = new Injector();
    expect(inj.inject(null, "ctx", "openai")).toBeNull();
    expect(inj.inject({ messages: [] }, null, "openai")).toBeNull();
  });

  it("uses registered formatter", () => {
    const inj = new Injector();
    const mockFmt = vi.fn((b, c) => ({ ...b, _injected: c }));
    inj.registerFormatter("test", mockFmt);
    const body = { messages: [] };
    const result = inj.inject(body, "context", "test");
    expect(mockFmt).toHaveBeenCalledWith(body, "context");
    expect(result._injected).toBe("context");
  });

  it("falls back to default inject for unknown format", () => {
    const inj = new Injector();
    const body = { messages: [{ role: "user", content: "hi" }] };
    const result = inj.inject(body, "context", "unknown");
    expect(result).not.toBeNull();
    expect(result.messages[0].role).toBe("system");
    expect(result.messages[0].content).toContain("CMEM Memory Context");
  });
});

// ===== OpenAI Formatter =====
describe("injectOpenAI", () => {
  it("adds system message after existing system message", () => {
    const body = { messages: [{ role: "system", content: "You are helpful." }, { role: "user", content: "hi" }] };
    const result = injectOpenAI(body, "memory ctx");
    expect(result.messages.length).toBe(3);
    expect(result.messages[1].role).toBe("system");
    expect(result.messages[1].content).toContain("memory ctx");
  });

  it("prepends system message when none exists", () => {
    const body = { messages: [{ role: "user", content: "hi" }] };
    const result = injectOpenAI(body, "memory ctx");
    expect(result.messages[0].role).toBe("system");
    expect(result.messages[0].content).toContain("CMEM Memory Context");
  });

  it("handles input array (Responses API)", () => {
    const body = { input: [{ role: "user", content: "hi" }] };
    const result = injectOpenAI(body, "memory ctx");
    expect(result.input[0].role).toBe("system");
  });

  it("returns body unchanged when no messages", () => {
    const body = { model: "gpt-4" };
    expect(injectOpenAI(body, "ctx")).toEqual(body);
  });
});

// ===== Claude Formatter =====
describe("injectClaude", () => {
  it("appends to string system", () => {
    const body = { system: "You are Claude.", messages: [{ role: "user", content: "hi" }] };
    const result = injectClaude(body, "memory ctx");
    expect(result.system).toContain("memory ctx");
    expect(result.system).toContain("You are Claude.");
  });

  it("appends to array system", () => {
    const body = { system: [{ type: "text", text: "base" }], messages: [{ role: "user", content: "hi" }] };
    const result = injectClaude(body, "memory ctx");
    expect(Array.isArray(result.system)).toBe(true);
    expect(result.system.length).toBe(2);
  });

  it("wraps object system in array", () => {
    const body = { system: { type: "text", text: "base" }, messages: [{ role: "user", content: "hi" }] };
    const result = injectClaude(body, "memory ctx");
    expect(Array.isArray(result.system)).toBe(true);
  });

  it("creates system when missing", () => {
    const body = { messages: [{ role: "user", content: "hi" }] };
    const result = injectClaude(body, "memory ctx");
    expect(Array.isArray(result.system)).toBe(true);
  });
});

// ===== Gemini Formatter =====
describe("injectGemini", () => {
  it("adds to existing system_instruction", () => {
    const body = { system_instruction: { parts: [{ text: "base" }] }, contents: [{ role: "user", parts: [{ text: "hi" }] }] };
    const result = injectGemini(body, "memory ctx");
    expect(result.system_instruction.parts.length).toBe(2);
    expect(result.system_instruction.parts[1].text).toContain("memory ctx");
  });

  it("creates system_instruction when missing", () => {
    const body = { contents: [{ role: "user", parts: [{ text: "hi" }] }] };
    const result = injectGemini(body, "memory ctx");
    expect(result.system_instruction.parts[0].text).toContain("CMEM Memory Context");
  });
});

// ===== MemoryStore =====
describe("MemoryStore", () => {
  let db;
  let store;

  beforeEach(() => {
    db = createMockDb();
    store = new MemoryStore(db, { retentionDays: 90 });
  });

  it("init creates tables without error", async () => {
    await expect(store.init()).resolves.not.toThrow();
  });

  it("saveObservation and getObservations", async () => {
    await store.init();
    const obs = {
      id: "test-1",
      type: "note",
      title: "Test Note",
      content: "Some content here",
      tokens: 10,
      provider: "openai",
      createdAt: Date.now(),
    };
    await store.saveObservation(obs);
    const result = await store.getObservations(["test-1"]);
    expect(result.length).toBe(1);
    expect(result[0].id).toBe("test-1");
    expect(result[0].title).toBe("Test Note");
  });

  it("search returns all when empty query", async () => {
    await store.init();
    await store.saveObservation({ id: "s1", type: "note", content: "hello", createdAt: Date.now() });
    const result = await store.search("");
    expect(result.observations.length).toBe(1);
    expect(result.total).toBe(1);
  });

  it("deleteObservation removes obs", async () => {
    await store.init();
    await store.saveObservation({ id: "del-1", type: "note", content: "delete me", createdAt: Date.now() });
    await store.deleteObservation("del-1");
    const result = await store.getObservations(["del-1"]);
    expect(result.length).toBe(0);
  });

  it("getStats returns counts", async () => {
    await store.init();
    await store.saveObservation({ id: "stat-1", type: "note", content: "a", tokens: 10, createdAt: Date.now() });
    await store.saveObservation({ id: "stat-2", type: "bugfix", content: "b", tokens: 20, createdAt: Date.now() });
    const stats = await store.getStats();
    expect(stats.totalObservations).toBe(2);
    expect(stats.totalTokens).toBe(30);
    expect(stats.byType.length).toBe(2);
  });

  it("getObservations returns empty for empty ids", async () => {
    expect(await store.getObservations([])).toEqual([]);
    expect(await store.getObservations(null)).toEqual([]);
  });

  it("cleanup removes old observations", async () => {
    await store.init();
    const oldTime = Date.now() - 100 * 86400000;
    await store.saveObservation({ id: "old-1", type: "note", content: "old", createdAt: oldTime });
    await store.saveObservation({ id: "new-1", type: "note", content: "new", createdAt: Date.now() });
    await store.cleanup();
    const stats = await store.getStats();
    expect(stats.totalObservations).toBe(1);
  });

  it("getTimeline returns timeline entries", async () => {
    await store.init();
    await store.saveObservation({ id: "tl-1", type: "note", title: "Timeline Note", content: "content", tokens: 5, createdAt: Date.now() });
    const timeline = await store.getTimeline("");
    expect(timeline.length).toBe(1);
    expect(timeline[0].title).toBe("Timeline Note");
  });
});

// ===== ContextBuilder =====
describe("ContextBuilder", () => {
  let db;
  let store;

  beforeEach(async () => {
    db = createMockDb();
    store = new MemoryStore(db, { retentionDays: 90 });
    await store.init();
  });

  it("builds context with recent section", async () => {
    await store.saveObservation({ id: "ctx-1", type: "note", title: "Note", content: "Important finding about auth", tokens: 50, createdAt: Date.now() });
    const builder = new ContextBuilder(store);
    const result = await builder.buildContext({ tokenBudget: 4000, sections: ["recent"] });
    expect(result.context).toBeTruthy();
    expect(result.totalTokens).toBeGreaterThan(0);
  });

  it("respects token budget", async () => {
    for (let i = 0; i < 10; i++) {
      await store.saveObservation({ id: `big-${i}`, type: "note", title: `Big ${i}`, content: "x".repeat(2000), tokens: 500, createdAt: Date.now() + i });
    }
    const builder = new ContextBuilder(store);
    const result = await builder.buildContext({ tokenBudget: 600, sections: ["recent"] });
    expect(result.totalTokens).toBeLessThanOrEqual(600);
  });

  it("returns empty context when store is empty", async () => {
    const builder = new ContextBuilder(store);
    const result = await builder.buildContext({ tokenBudget: 4000, sections: ["recent"] });
    expect(result.context).toBe("");
    expect(result.totalTokens).toBe(0);
  });

  it("deduplicates observations from recent + relevant", async () => {
    await store.saveObservation({ id: "dedup-1", type: "note", title: "Auth", content: "auth module implementation", tokens: 50, createdAt: Date.now() });
    const builder = new ContextBuilder(store);
    const result = await builder.buildContext({ query: "auth", tokenBudget: 4000, sections: ["recent", "relevant"] });
    const ids = result.parts.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ===== CmemEngine =====
describe("CmemEngine", () => {
  it("disabled engine returns null for all operations", async () => {
    const engine = new CmemEngine({ enabled: false });
    expect(await engine.captureObservation({})).toBeNull();
    expect(await engine.injectContext({}, "openai")).toBeNull();
    expect(await engine.search("q")).toEqual({ observations: [], total: 0 });
    expect(await engine.getTimeline("q")).toEqual([]);
    expect(await engine.getObservations(["x"])).toEqual([]);
  });

  it("engine without db captures nothing", async () => {
    const engine = new CmemEngine({ enabled: true, config: {} });
    expect(await engine.captureObservation({})).toBeNull();
    expect(await engine.injectContext({}, "openai")).toBeNull();
  });

  it("engine with db captures observation", async () => {
    const db = createMockDb();
    const engine = new CmemEngine({ enabled: true, config: {}, db });
    await engine.init();
    const obs = await engine.captureObservation({
      messages: [{ role: "user", content: "implement the auth module" }],
      provider: "openai",
    });
    expect(obs).not.toBeNull();
    expect(obs.id).toBeTruthy();
    expect(obs.type).toBe(OBSERVATION_TYPES.IMPLEMENTATION);
  });

  it("injectContext returns null when no context in store", async () => {
    const db = createMockDb();
    const engine = new CmemEngine({ enabled: true, config: {}, db });
    await engine.init();
    const body = { messages: [{ role: "user", content: "hi" }] };
    const result = await engine.injectContext(body, "openai");
    expect(result).toBeNull();
  });

  it("injectContext returns null when body is null", async () => {
    const db = createMockDb();
    const engine = new CmemEngine({ enabled: true, config: {}, db });
    await engine.init();
    expect(await engine.injectContext(null, "openai")).toBeNull();
  });

  it("injectContext injects when observations exist", async () => {
    const db = createMockDb();
    const engine = new CmemEngine({ enabled: true, config: {}, db });
    await engine.init();
    await engine.captureObservation({
      messages: [{ role: "user", content: "implement the auth module with JWT tokens" }],
      provider: "openai",
    });
    const body = { messages: [{ role: "user", content: "continue working on auth" }] };
    const result = await engine.injectContext(body, "openai");
    expect(result).not.toBeNull();
    expect(result.messages[0].role).toBe("system");
  });

  it("getStats returns combined stats", async () => {
    const db = createMockDb();
    const engine = new CmemEngine({ enabled: true, config: {}, db });
    await engine.init();
    await engine.captureObservation({
      messages: [{ role: "user", content: "test observation for stats" }],
      provider: "openai",
    });
    const stats = await engine.getStats();
    expect(stats.observationsCaptured).toBe(1);
    expect(stats.contextInjections).toBe(0);
  });

  it("updateConfig merges new config", () => {
    const engine = new CmemEngine({ enabled: true, config: { tokenBudget: 2000 } });
    engine.updateConfig({ tokenBudget: 8000 });
    expect(engine.config.tokenBudget).toBe(8000);
  });

  it("deleteObservation works", async () => {
    const db = createMockDb();
    const engine = new CmemEngine({ enabled: true, config: {}, db });
    await engine.init();
    await engine.captureObservation({
      messages: [{ role: "user", content: "observation to delete" }],
      provider: "openai",
    });
    await engine.deleteObservation("some-id");
  });

  it("formats registered for all target formats", () => {
    const engine = new CmemEngine({ enabled: true });
    const formats = ["openai", "openai-responses", "claude", "gemini", "gemini-cli", "kiro", "cursor", "antigravity"];
    for (const fmt of formats) {
      expect(engine.injector.formatters[fmt]).toBeDefined();
    }
  });
});

// ===== Modes =====
describe("CMEM modes", () => {
  it("has all expected mode keys", () => {
    expect(VALID_CMEM_MODE_KEYS).toContain("code");
    expect(VALID_CMEM_MODE_KEYS).toContain("code--zh");
    expect(VALID_CMEM_MODE_KEYS).toContain("code--ja");
    expect(VALID_CMEM_MODE_KEYS).toContain("code--es");
    expect(VALID_CMEM_MODE_KEYS).toContain("code--ko");
    expect(VALID_CMEM_MODE_KEYS).toContain("code--fr");
  });

  it("each mode has label and description", () => {
    for (const [key, mode] of Object.entries(CMEM_MODES)) {
      expect(mode.label).toBeTruthy();
      expect(mode.description).toBeTruthy();
    }
  });
});
