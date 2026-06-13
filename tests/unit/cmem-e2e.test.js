import { describe, it, expect } from "vitest";
import { CmemEngine } from "../../packages/cmem/core/index.js";

/**
 * E2E smoke test for CMEM capture→store→inject cycle
 * Uses a real CmemEngine with mock DB.
 *
 * Real E2E (with next dev running):
 *   curl -X POST http://localhost:20128/v1/chat/completions \
 *     -H "Content-Type: application/json" \
 *     -d '{"model":"kr/claude-sonnet-4.5","messages":[{"role":"user","content":"hi"}],"stream":false}'
 *
 * Then check observations:
 *   curl http://localhost:20128/api/settings/cmem
 *   curl http://localhost:20128/api/settings/cmem/observations
 *
 * Run: cd tests && npx vitest run unit/cmem-e2e.test.js --config vitest.config.js
 */
function createMockDb() {
  const store = new Map();
  let rowIdCounter = 0;
  return {
    async run(sql, params = []) {
      if (sql.includes("CREATE TABLE") || sql.includes("CREATE INDEX") || sql.includes("CREATE VIRTUAL TABLE")) return;
      if (sql.includes("DELETE")) return;
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

describe("CMEM E2E: capture → store → inject", () => {
  it("captures observation, stores it, and injects context on next request", async () => {
    const db = createMockDb();
    const engine = new CmemEngine({ enabled: true, config: { tokenBudget: 4000 }, db });
    await engine.init();

    // 1. Capture: process user message and tool results
    const obs = await engine.captureObservation({
      messages: [
        { role: "user", content: "implement the auth module using JWT tokens" },
        { role: "tool", content: "file: src/auth.js\nfunction login() { ... }" },
      ],
      provider: "openai",
      response: { content: "Auth module implemented successfully" },
    });
    expect(obs).not.toBeNull();
    expect(obs.id).toBeTruthy();
    expect(obs.tokens).toBeGreaterThan(0);

    // 2. Verify stored
    const stats = await engine.getStats();
    expect(stats.totalObservations).toBe(1);
    expect(stats.observationsCaptured).toBe(1);

    // 3. Inject context for new query
    const result = await engine.injectContext(
      { messages: [{ role: "user", content: "continue with auth" }] },
      "openai"
    );
    expect(result).not.toBeNull();
    expect(result.messages[0].role).toBe("system");
    expect(result.messages[0].content).toContain("CMEM Memory Context");

    // 4. Verify stats updated
    const updatedStats = await engine.getStats();
    expect(updatedStats.contextInjections).toBe(1);
  });
});
