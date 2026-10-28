import fs from "node:fs";
import path from "node:path";
import { ERROR_LOG_DB_FILE } from "./paths.js";
import { initSchema } from "./schema.js";

// Mirrors src/lib/db/driver.js's fallback-chain + hot-reload-safe singleton, but
// targets a separate SQLite file (ERROR_LOG_DB_FILE) with its own global slot —
// this DB is intentionally isolated from the app DB (data.sqlite) to keep the
// write-heavy error-log path from contending with app query load.
if (!global._errorLogDbAdapter) global._errorLogDbAdapter = { instance: null, initPromise: null, logged: false };
const state = global._errorLogDbAdapter;

async function tryBunSqlite() {
  if (!process.versions.bun) return null;
  try {
    const { createBunSqliteAdapter } = await import("../db/adapters/bunSqliteAdapter.js");
    return await createBunSqliteAdapter(ERROR_LOG_DB_FILE);
  } catch (e) {
    console.warn(`[ErrorLogDB] bun:sqlite unavailable: ${e.message}`);
    return null;
  }
}

async function tryBetterSqlite() {
  if (process.versions.bun) return null;
  const [nodeMajor] = process.versions.node.split(".").map(Number);
  if (nodeMajor >= 24) return null;
  try {
    const { createBetterSqliteAdapter } = await import("../db/adapters/betterSqliteAdapter.js");
    return createBetterSqliteAdapter(ERROR_LOG_DB_FILE);
  } catch (e) {
    console.warn(`[ErrorLogDB] better-sqlite3 unavailable: ${e.message}`);
    return null;
  }
}

async function tryNodeSqlite() {
  if (process.versions.bun) return null;
  const [maj, min] = process.versions.node.split(".").map(Number);
  if (maj < 22 || (maj === 22 && min < 5)) return null;
  try {
    const { createNodeSqliteAdapter } = await import("../db/adapters/nodeSqliteAdapter.js");
    return await createNodeSqliteAdapter(ERROR_LOG_DB_FILE);
  } catch (e) {
    console.warn(`[ErrorLogDB] node:sqlite unavailable: ${e.message}`);
    return null;
  }
}

async function trySqlJs() {
  try {
    const { createSqlJsAdapter } = await import("../db/adapters/sqljsAdapter.js");
    return await createSqlJsAdapter(ERROR_LOG_DB_FILE);
  } catch (e) {
    console.warn(`[ErrorLogDB] sql.js unavailable: ${e.message}`);
    return null;
  }
}

async function initAdapter() {
  fs.mkdirSync(path.dirname(ERROR_LOG_DB_FILE), { recursive: true });

  let adapter = await tryBunSqlite();
  if (!adapter) adapter = await tryBetterSqlite();
  if (!adapter) adapter = await tryNodeSqlite();
  if (!adapter) adapter = await trySqlJs();
  if (!adapter) throw new Error("[ErrorLogDB] No SQLite driver available (bun/better/node/sql.js all failed)");

  if (!state.logged) {
    console.log(`[ErrorLogDB] Driver: ${adapter.driver} | file: ${ERROR_LOG_DB_FILE}`);
    state.logged = true;
  }

  await initSchema(adapter);
  return adapter;
}

export async function getErrorLogAdapter() {
  if (state.instance) return state.instance;
  if (!state.initPromise) state.initPromise = initAdapter().then((a) => { state.instance = a; return a; });
  return state.initPromise;
}
