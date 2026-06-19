import { describe, it, expect } from "vitest";
import { CmemEngine } from "../../packages/cmem/core/index.js";

function createMockDb() {
  const store = new Map();
  let rowIdCounter = 0;
  return {
    async run(sql, params = []) {
      if (sql.includes("CREATE TABLE") || sql.includes("CREATE INDEX") || sql.includes("CREATE VIRTUAL TABLE")) return;
      if (sql.includes("DELETE")) {
        if (sql.includes("WHERE id = ?")) {
          const idIdx = sql.includes("AND") ? 1 : 0;
          for (const [key, val] of store) { if (val.id === params[idIdx]) store.delete(key); }
        } else if (sql.includes("WHERE created_at_epoch < ?")) {
          const cutoff = params[0];
          for (const [key, val] of store) { if (val.created_at_epoch < cutoff) store.delete(key); }
        }
        return;
      }
      if (sql.includes("INSERT OR REPLACE")) {
        const rowid = ++rowIdCounter;
        const columns = ["id","session_id","type","title","content","summary","facts","concepts","files_read","files_modified","tokens","provider","created_at_epoch"];
        const row = { rowid };
        columns.forEach((col, i) => { row[col] = params[i]; });
        store.set(rowid, row);
      }
    },
    async get(sql) {
      if (sql.includes("COUNT(")) {
        let count = 0;
        for (const [,] of store) count++;
        return sql.includes("as total") ? { total: count } : { count };
      }
      if (sql.includes("SUM(tokens)")) {
        let total = 0;
        for (const [, row] of store) total += (row.tokens || 0);
        return { total };
      }
      return null;
    },
    async all(sql) {
      const results = [];
      if (sql.includes("FROM cmem_observations")) {
        for (const [, row] of store) results.push({ ...row });
        results.sort((a, b) => (b.created_at_epoch || 0) - (a.created_at_epoch || 0));
      }
      if (sql.includes("GROUP BY type")) {
        const typeMap = {};
        for (const [, row] of store) typeMap[row.type] = (typeMap[row.type] || 0) + 1;
        return Object.entries(typeMap).map(([type, count]) => ({ type, count }));
      }
      return results;
    },
  };
}

describe("CMEM E2E: capture → store → inject (multi-provider)", () => {
  it("captures across providers and injects context when switching", async () => {
    const db = createMockDb();
    const engine = new CmemEngine({ enabled: true, config: { tokenBudget: 4000 }, db });
    await engine.init();

    // Simulate 3 requests across different providers (combo fallback scenario)

    // 1. Provider A (Claude Code) handles auth module
    await engine.captureObservation({
      messages: [
        { role: "user", content: "implement the auth module using JWT tokens with refresh rotation" },
        { role: "assistant", content: "Here's the auth module implementation..." },
      ],
      model: "claude-opus-4-6",
      provider: "claude-code",
      response: { content: "Auth module created" },
    });

    // 2. Provider B (GLM) handles database integration
    await engine.captureObservation({
      messages: [
        { role: "user", content: "add PostgreSQL integration with connection pooling" },
        { role: "assistant", content: "Using pg-pool for connection management..." },
      ],
      model: "glm-5.1",
      provider: "glm",
      response: { content: "DB layer done" },
    });

    // 3. Provider C (Kiro Free) handles API endpoints
    await engine.captureObservation({
      messages: [
        { role: "user", content: "create REST API endpoints for the auth module: login, register, refresh" },
        { role: "assistant", content: "Endpoints created with JWT middleware..." },
      ],
      model: "claude-sonnet-4.5",
      provider: "kiro",
      response: { content: "API routes done" },
    });

    // Verify all 3 captured
    let stats = await engine.getStats();
    expect(stats.totalObservations).toBe(3);
    expect(stats.observationsCaptured).toBe(3);

    // 4. New request comes in on provider D (OpenCode Free) — should get context from all 3
    const body = {
      messages: [
        { role: "system", content: "You are a coding assistant." },
        { role: "user", content: "continue adding error handling middleware to the auth routes" },
      ],
    };
    const result = await engine.injectContext(body, "openai");

    expect(result).not.toBeNull();
    // Should inject CMEM system message with context from all providers
    expect(result.messages.length).toBeGreaterThan(2); // system + cmem system + user
    const cmemMsg = result.messages.find(m => m.role === "system" && m.content.includes("CMEM"));
    expect(cmemMsg).toBeTruthy();
    expect(cmemMsg.content).toContain("auth");
    expect(cmemMsg.content).toContain("PostgreSQL");

    // Verify injection stats
    stats = await engine.getStats();
    expect(stats.contextInjections).toBe(1);
    expect(stats.totalInjectionTokens).toBeGreaterThan(0);
  });

  it("survives format translation: capture OpenAI format, inject Claude format", async () => {
    const db = createMockDb();
    const engine = new CmemEngine({ enabled: true, config: { tokenBudget: 4000 }, db });
    await engine.init();

    await engine.captureObservation({
      messages: [
        { role: "user", content: "implement caching layer using Redis with TTL" },
      ],
      model: "gpt-4",
      provider: "openai",
      response: { content: "Redis cache layer implemented" },
    });

    // Inject in Claude format
    const claudeBody = {
      system: "You are Claude.",
      messages: [
        { role: "user", content: "now add cache invalidation on write" },
      ],
    };
    const result = await engine.injectContext(claudeBody, "claude");
    expect(result).not.toBeNull();
    // Claude format inject: should append CMEM context to system string
    expect(result.system).toBeTruthy();
    expect(result.system).toContain("CMEM Memory Context");
    // Content from the captured observation should be present
    expect(result.system).toContain("Redis");
  });

  it("preserves context across provider switches with budget constraints", async () => {
    const db = createMockDb();
    const engine = new CmemEngine({ enabled: true, config: { tokenBudget: 2000, maxObservations: 5 }, db });
    await engine.init();

    // Seed 6 observations (1 more than maxObservations)
    for (let i = 0; i < 6; i++) {
      await engine.captureObservation({
        messages: [{ role: "user", content: `request number ${i} about feature ${i}` }],
        model: `model-${i % 3}`,
        provider: `provider-${i % 3}`,
        response: { content: `response ${i}` },
      });
    }

    // New provider (provider-0 again, after switching away and back)
    const body = { messages: [{ role: "user", content: "continue feature-5" }] };
    const result = await engine.injectContext(body, "openai");
    expect(result).not.toBeNull();

    // Should contain context from previous observations (within budget)
    const cmemMsg = result.messages.find(m => m.role === "system" && m.content.includes("CMEM"));
    expect(cmemMsg).toBeTruthy();
    // Content should reference relevant features
    expect(cmemMsg.content.length).toBeGreaterThan(50);
  });
});
