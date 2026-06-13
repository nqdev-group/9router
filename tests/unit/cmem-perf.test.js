import { describe, it, expect, vi } from "vitest";
import { CmemEngine } from "../../packages/cmem/core/index.js";

const NUM_OBSERVATIONS = 100;
const ITERATIONS = 50;
const MAX_MEDIAN_MS = 5;
const MAX_P99_MS = 15;

function createMockDb() {
  const store = new Map();
  let rowIdCounter = 1;
  return {
    run(sql, params = []) {
      if (sql.includes("CREATE TABLE") || sql.includes("CREATE INDEX") || sql.includes("CREATE VIRTUAL TABLE")) return;
      if (sql.includes("INSERT")) {
        const columns = ["id", "session_id", "type", "title", "content", "summary", "facts", "concepts", "files_read", "files_modified", "tokens", "provider", "created_at_epoch"];
        const row = { rowid: rowIdCounter++ };
        columns.forEach((col, i) => { row[col] = params[i]; });
        store.set(row.id, row);
        return;
      }
    },
    get(sql, params = []) {
      if (sql.includes("COUNT")) {
        return { "COUNT(*)": store.size };
      }
      return null;
    },
    all(sql, params = []) {
      if (sql.includes("observation") || sql.includes("cmem")) {
        const rows = [];
        for (const [id, row] of store) {
          rows.push({
            id,
            type: row.type,
            content: row.content || "",
            summary: row.summary || "",
            facts: row.facts || "[]",
            concepts: row.concepts || "[]",
            tokens: row.tokens || 0,
            created_at_epoch: row.created_at_epoch || 0,
            files_read: row.files_read || "[]",
            files_modified: row.files_modified || "[]",
          });
        }
        return rows;
      }
      return [];
    },
    close() {},
  };
}

function seedObservations(db, count) {
  for (let i = 0; i < count; i++) {
    const id = `perf-${i}`;
    const type = ["note", "error", "preference", "project", "code"][i % 5];
    db.run("INSERT", [
      id, `session-${Math.floor(i / 10)}`, type, `Observation ${i}`,
      `This is observation ${i} with some meaningful content for context injection benchmark testing.`,
      `Summary of observation ${i}.`,
      JSON.stringify([`fact-${i}`]), JSON.stringify([`concept-${i % 10}`]),
      JSON.stringify([`file-${i}.js`]), JSON.stringify([]), 50 + (i % 20), "test", Date.now()
    ]);
  }
}

describe("CMEM injection performance", () => {
  it("injectContext under 5ms median", async () => {
    const db = createMockDb();
    seedObservations(db, NUM_OBSERVATIONS);

    const engine = new CmemEngine({ db, enabled: true, config: { mode: "full", tokenBudget: 500, searchMode: "fts", historyDepth: "30d" } });
    await engine.init();

    const latencies = [];
    for (let i = 0; i < ITERATIONS; i++) {
      const body = {
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: `How do I implement feature ${i}?` },
        ],
      };
      const start = performance.now();
      await engine.injectContext(body, "openai");
      const elapsed = performance.now() - start;
      latencies.push(elapsed);
    }

    latencies.sort((a, b) => a - b);
    const median = latencies[Math.floor(latencies.length / 2)];
    const p99 = latencies[Math.floor(latencies.length * 0.99)];

    expect(median).toBeLessThan(MAX_MEDIAN_MS);
    expect(p99).toBeLessThan(MAX_P99_MS);
  });

  it("injectContext under 5ms median (claude format)", async () => {
    const db = createMockDb();
    seedObservations(db, NUM_OBSERVATIONS);

    const engine = new CmemEngine({ db, enabled: true, config: { mode: "full", tokenBudget: 500, searchMode: "fts", historyDepth: "30d" } });
    await engine.init();

    const latencies = [];
    for (let i = 0; i < ITERATIONS; i++) {
      const body = {
        model: "claude-sonnet-4",
        messages: [
          { role: "system", content: "You are Claude." },
          { role: "user", content: `How do I debug ${i}?` },
        ],
      };
      const start = performance.now();
      await engine.injectContext(body, "claude");
      const elapsed = performance.now() - start;
      latencies.push(elapsed);
    }

    latencies.sort((a, b) => a - b);
    const median = latencies[Math.floor(latencies.length / 2)];
    expect(median).toBeLessThan(MAX_MEDIAN_MS);
  });
});
