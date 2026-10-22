// Schema for the standalone error-log DB (error-log.sqlite) — deliberately not
// part of src/lib/db/migrate.js, which owns the app DB's schema only.
//
// One row per failed request. `connectionId` set (account-level, from auth.js) or
// `comboName`+`model` set (model-level, from combo.js) — never both at once, since
// account errors and model errors answer different questions (see
// plans/2026-09-22-provider-model-error-stats-planning.md).
export async function initSchema(db) {
  await db.run(`
    CREATE TABLE IF NOT EXISTS error_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL,
      connection_id TEXT,
      model TEXT,
      combo_name TEXT,
      error_code TEXT,
      created_at_epoch INTEGER NOT NULL
    )
  `);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_error_log_account ON error_log(connection_id, created_at_epoch)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_error_log_model ON error_log(combo_name, model, created_at_epoch)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_error_log_created ON error_log(created_at_epoch)`);
}
