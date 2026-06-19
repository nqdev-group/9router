import { getAdapter } from "../driver.js";

export async function initCmemTables() {
  const db = await getAdapter();
  await db.run(`
    CREATE TABLE IF NOT EXISTS cmem_observations (
      id TEXT PRIMARY KEY,
      session_id TEXT,
      type TEXT NOT NULL DEFAULT 'note',
      title TEXT,
      content TEXT NOT NULL,
      summary TEXT,
      facts TEXT DEFAULT '[]',
      concepts TEXT DEFAULT '[]',
      files_read TEXT DEFAULT '[]',
      files_modified TEXT DEFAULT '[]',
      tokens INTEGER DEFAULT 0,
      provider TEXT,
      created_at_epoch INTEGER NOT NULL
    )
  `);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_cmem_obs_session ON cmem_observations(session_id)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_cmem_obs_created ON cmem_observations(created_at_epoch)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_cmem_obs_type ON cmem_observations(type)`);

  await db.run(`
    CREATE TABLE IF NOT EXISTS cmem_sessions (
      id TEXT PRIMARY KEY,
      project TEXT DEFAULT 'default',
      started_at_epoch INTEGER NOT NULL,
      ended_at_epoch INTEGER
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS cmem_context_cache (
      session_id TEXT,
      context TEXT,
      token_count INTEGER DEFAULT 0,
      created_at_epoch INTEGER NOT NULL
    )
  `);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_cmem_cache_session ON cmem_context_cache(session_id)`);

  try {
    await db.run(`
      CREATE VIRTUAL TABLE IF NOT EXISTS cmem_observations_fts USING fts5(
        title, content, summary, facts, concepts,
        content='cmem_observations',
        content_rowid='rowid'
      )
    `);
  } catch (e) {
    console.warn("[CMEM] FTS5 unavailable (may not be supported by this SQLite build):", e.message);
  }
}
