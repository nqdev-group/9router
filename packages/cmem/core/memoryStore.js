const CLEANUP_INTERVAL_MS = 86400000; // 24h
let _cleanupTimer = null;

// Code-first schema: these mirror the CREATE TABLE statements below and are the
// single source of truth `ensureColumns()` checks a live table against. Only
// covers additive, nullable-or-defaulted columns — `CREATE TABLE IF NOT EXISTS`
// never retrofits a table that already existed under an older column set, and a
// DB predating a schema change (or one from a fork/older version of this repo)
// would otherwise throw "no such column: X" at query time instead of self-healing.
// Primary keys and original NOT-NULL-without-default columns are intentionally
// excluded — those aren't safely addable via ALTER TABLE on a non-empty table.
const TABLE_COLUMNS = {
  cmem_observations: [
    ["session_id", "TEXT"],
    ["type", "TEXT NOT NULL DEFAULT 'note'"],
    ["title", "TEXT"],
    ["summary", "TEXT"],
    ["facts", "TEXT DEFAULT '[]'"],
    ["concepts", "TEXT DEFAULT '[]'"],
    ["files_read", "TEXT DEFAULT '[]'"],
    ["files_modified", "TEXT DEFAULT '[]'"],
    ["tokens", "INTEGER DEFAULT 0"],
    ["provider", "TEXT"],
  ],
  cmem_sessions: [
    ["project", "TEXT DEFAULT 'default'"],
    ["ended_at_epoch", "INTEGER"],
  ],
  cmem_context_cache: [
    ["context", "TEXT"],
    ["token_count", "INTEGER DEFAULT 0"],
  ],
};

async function ensureColumns(db, table, columns) {
  const rows = await db.all(`PRAGMA table_info(${table})`);
  const existing = new Set(rows.map((r) => r.name));
  for (const [name, type] of columns) {
    if (existing.has(name)) continue;
    try {
      await db.run(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`);
    } catch (e) {
      // Fail-open: an ALTER TABLE that isn't actually safe (e.g. NOT NULL with no
      // default on a non-empty table) shouldn't block startup — log and move on.
      console.warn(`[CMEM] could not add missing column ${table}.${name}: ${e.message}`);
    }
  }
}

export class MemoryStore {
  constructor(db, { retentionDays = 90 } = {}) {
    this.db = db;
    this.retentionDays = retentionDays;
  }

  async init() {
    await this.db.run(`
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
    await ensureColumns(this.db, "cmem_observations", TABLE_COLUMNS.cmem_observations);
    await this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_cmem_obs_session ON cmem_observations(session_id)
    `);
    await this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_cmem_obs_created ON cmem_observations(created_at_epoch)
    `);
    await this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_cmem_obs_type ON cmem_observations(type)
    `);

    await this.db.run(`
      CREATE TABLE IF NOT EXISTS cmem_sessions (
        id TEXT PRIMARY KEY,
        project TEXT DEFAULT 'default',
        started_at_epoch INTEGER NOT NULL,
        ended_at_epoch INTEGER
      )
    `);
    await ensureColumns(this.db, "cmem_sessions", TABLE_COLUMNS.cmem_sessions);

    await this.db.run(`
      CREATE TABLE IF NOT EXISTS cmem_context_cache (
        session_id TEXT,
        context TEXT,
        token_count INTEGER DEFAULT 0,
        created_at_epoch INTEGER NOT NULL
      )
    `);
    await ensureColumns(this.db, "cmem_context_cache", TABLE_COLUMNS.cmem_context_cache);
    await this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_cmem_cache_session ON cmem_context_cache(session_id)
    `);

    await this.db.run(`
      CREATE VIRTUAL TABLE IF NOT EXISTS cmem_observations_fts USING fts5(
        title, content, summary, facts, concepts,
        content='cmem_observations',
        content_rowid='rowid'
      )
    `);

    // cmem_observations_fts is an external-content table — SQLite never
    // auto-populates it, the app must keep it in sync itself. These triggers cover
    // every write path: INSERT OR REPLACE (the only write saveObservation does) is
    // implemented by SQLite as delete-then-insert on conflict, so both fire — no
    // separate AFTER UPDATE trigger is needed since this table is never plain-UPDATEd.
    //
    // Self-heal for rows written before this fix existed: check sqlite_master for
    // the trigger *before* creating it — its absence means this is the first init()
    // since upgrading (or a brand new DB), so backfill once via the FTS5 'rebuild'
    // command. A plain COUNT(*) comparison between the two tables doesn't work here
    // — on an external-content table it mirrors the content table's row count
    // regardless of whether the index was ever actually built, so it can't detect
    // this gap.
    const triggerExisted = await this.db.get(
      `SELECT 1 FROM sqlite_master WHERE type='trigger' AND name='cmem_observations_ai'`
    );
    await this.db.run(`
      CREATE TRIGGER IF NOT EXISTS cmem_observations_ai AFTER INSERT ON cmem_observations BEGIN
        INSERT INTO cmem_observations_fts(rowid, title, content, summary, facts, concepts)
        VALUES (new.rowid, new.title, new.content, new.summary, new.facts, new.concepts);
      END
    `);
    await this.db.run(`
      CREATE TRIGGER IF NOT EXISTS cmem_observations_ad AFTER DELETE ON cmem_observations BEGIN
        INSERT INTO cmem_observations_fts(cmem_observations_fts, rowid, title, content, summary, facts, concepts)
        VALUES('delete', old.rowid, old.title, old.content, old.summary, old.facts, old.concepts);
      END
    `);
    if (!triggerExisted) {
      await this.db.run(`INSERT INTO cmem_observations_fts(cmem_observations_fts) VALUES('rebuild')`);
    }

    // Run cleanup on init + start periodic cleanup (process-wide singleton timer)
    await this.cleanup();
    if (!_cleanupTimer) {
      _cleanupTimer = setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
    }
  }

  static stopCleanupTimer() {
    if (_cleanupTimer) {
      clearInterval(_cleanupTimer);
      _cleanupTimer = null;
    }
  }

  async cleanup() {
    if (!this.retentionDays) return;
    const cutoff = Date.now() - this.retentionDays * 86400000;
    await this.db.run(`DELETE FROM cmem_observations WHERE created_at_epoch < ?`, [cutoff]);
  }

  async saveObservation(obs) {
    await this.db.run(
      `INSERT OR REPLACE INTO cmem_observations
       (id, session_id, type, title, content, summary, facts, concepts, files_read, files_modified, tokens, provider, created_at_epoch)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        obs.id, obs.sessionId || null, obs.type, obs.title || "",
        obs.content, obs.summary || null,
        JSON.stringify(obs.facts || []),
        JSON.stringify(obs.concepts || []),
        JSON.stringify(obs.filesRead || []),
        JSON.stringify(obs.filesModified || []),
        obs.tokens || 0,
        obs.provider || null,
        obs.createdAt || Date.now(),
      ]
    );
    return obs.id;
  }

  async getObservations(ids) {
    if (!ids || ids.length === 0) return [];
    const placeholders = ids.map(() => "?").join(",");
    const rows = await this.db.all(
      `SELECT rowid, * FROM cmem_observations WHERE id IN (${placeholders}) ORDER BY created_at_epoch DESC`,
      ids
    );
    return rows.map(this._rowToObs);
  }

  async search(query, { limit = 20, type, offset = 0 } = {}) {
    if (!query || query.trim() === "") {
      let sql = `SELECT rowid, * FROM cmem_observations WHERE 1=1`;
      const params = [];
      if (type) { sql += ` AND type = ?`; params.push(type); }
      sql += ` ORDER BY created_at_epoch DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);
      const rows = await this.db.all(sql, params);
      const countRow = await this.db.get(`SELECT COUNT(*) as total FROM cmem_observations`);
      return { observations: rows.map(this._rowToObs), total: countRow?.total || 0 };
    }

    const sanitized = query.replace(/['"]/g, "").trim();
    if (!sanitized) return { observations: [], total: 0 };

    // Bind as a quoted FTS5 phrase, not a bare query — a bare query still parses
    // punctuation (",", ":", "(", ")", "-", "*", "^") as FTS5 query-syntax operators,
    // which throws "fts5: syntax error near ..." on ordinary user text containing
    // them. Quoting makes the whole string a literal phrase match instead.
    const ftsQuery = `"${sanitized.replace(/"/g, '""')}"`;

    let sql = `SELECT o.rowid, o.* FROM cmem_observations_fts f JOIN cmem_observations o ON o.rowid = f.rowid WHERE cmem_observations_fts MATCH ?`;
    const params = [ftsQuery];
    if (type) { sql += ` AND o.type = ?`; params.push(type); }
    sql += ` ORDER BY rank LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    const rows = await this.db.all(sql, params);
    const countRow = await this.db.get(
      `SELECT COUNT(*) as total FROM cmem_observations_fts WHERE cmem_observations_fts MATCH ?`,
      [ftsQuery]
    );
    return { observations: rows.map(this._rowToObs), total: countRow?.total || 0 };
  }

  async getTimeline(query, { limit = 10 } = {}) {
    const obsResult = await this.search(query, { limit: 50 });
    const obs = obsResult.observations;
    if (obs.length === 0) return [];

    const sessionIds = [...new Set(obs.filter(o => o.sessionId).map(o => o.sessionId))];
    const sessionMap = {};
    if (sessionIds.length > 0) {
      const placeholders = sessionIds.map(() => "?").join(",");
      const sessions = await this.db.all(
        `SELECT * FROM cmem_sessions WHERE id IN (${placeholders})`,
        sessionIds
      );
      for (const s of sessions) sessionMap[s.id] = s;
    }

    const timeline = [];
    for (const o of obs.slice(0, limit)) {
      timeline.push({
        id: o.id,
        title: o.title,
        type: o.type,
        sessionId: o.sessionId,
        sessionTitle: sessionMap[o.sessionId]?.project || null,
        createdAt: o.createdAt,
        tokens: o.tokens,
        snippet: (o.summary || o.content || "").slice(0, 200),
      });
    }
    return timeline;
  }

  async deleteObservation(id) {
    await this.db.run(`DELETE FROM cmem_observations WHERE id = ?`, [id]);
  }

  async clearAllObservations() {
    await this.db.run(`DELETE FROM cmem_observations`);
    await this.db.run(`DELETE FROM cmem_sessions`);
    await this.db.run(`DELETE FROM cmem_context_cache`);
  }

  async getStats() {
    const total = await this.db.get(`SELECT COUNT(*) as count FROM cmem_observations`);
    const tokens = await this.db.get(`SELECT COALESCE(SUM(tokens),0) as total FROM cmem_observations`);
    const byType = await this.db.all(
      `SELECT type, COUNT(*) as count FROM cmem_observations GROUP BY type ORDER BY count DESC`
    );
    return {
      totalObservations: total?.count || 0,
      totalTokens: tokens?.total || 0,
      byType: byType || [],
    };
  }

  _rowToObs(row) {
    if (!row) return null;
    return {
      id: row.id,
      sessionId: row.session_id,
      type: row.type,
      title: row.title,
      content: row.content,
      summary: row.summary,
      facts: safeJson(row.facts, []),
      concepts: safeJson(row.concepts, []),
      filesRead: safeJson(row.files_read, []),
      filesModified: safeJson(row.files_modified, []),
      tokens: row.tokens || 0,
      provider: row.provider,
      createdAt: row.created_at_epoch,
    };
  }
}

function safeJson(val, fallback) {
  if (!val) return fallback;
  try { return JSON.parse(typeof val === "string" ? val : JSON.stringify(val)); }
  catch { return fallback; }
}
