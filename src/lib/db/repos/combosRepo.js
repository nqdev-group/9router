import { v4 as uuidv4 } from "uuid";
import { getAdapter } from "../driver.js";
import { parseJson, stringifyJson } from "../helpers/jsonCol.js";

// updatedAt doubles as the optimistic-concurrency version compared in updateCombo()
// below — plain `Date.now()` only has millisecond resolution, and better-sqlite3 is
// fast enough that two writes in the same process can land in the same millisecond
// (observed in tests/unit/combos-repo-concurrency.test.js), which would silently
// defeat the conflict check. This guarantees a strictly increasing value per process.
let lastTimestampMs = 0;
function nextTimestamp() {
  let now = Date.now();
  if (now <= lastTimestampMs) now = lastTimestampMs + 1;
  lastTimestampMs = now;
  return new Date(now).toISOString();
}

function rowToCombo(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    models: parseJson(row.models, []),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getCombos() {
  const db = await getAdapter();
  const rows = db.all(`SELECT * FROM combos ORDER BY createdAt ASC`);
  return rows.map(rowToCombo);
}

export async function getComboById(id) {
  const db = await getAdapter();
  const row = db.get(`SELECT * FROM combos WHERE id = ?`, [id]);
  return rowToCombo(row);
}

export async function getComboByName(name) {
  const db = await getAdapter();
  const row = db.get(`SELECT * FROM combos WHERE name = ?`, [name]);
  return rowToCombo(row);
}

export async function createCombo(data) {
  const db = await getAdapter();
  const now = nextTimestamp();
  const combo = {
    id: uuidv4(),
    name: data.name,
    kind: data.kind || null,
    models: data.models || [],
    createdAt: now,
    updatedAt: now,
  };
  db.run(
    `INSERT INTO combos(id, name, kind, models, createdAt, updatedAt) VALUES(?, ?, ?, ?, ?, ?)`,
    [combo.id, combo.name, combo.kind, stringifyJson(combo.models), combo.createdAt, combo.updatedAt]
  );
  return combo;
}

// Thrown by updateCombo() when opts.expectedUpdatedAt is passed and no longer matches
// the row's current updatedAt — i.e. someone else (manual UI edit, another background
// job) wrote to this combo after the caller read it. Lets a caller doing a
// read-then-compute-then-write cycle (e.g. packages/combo-auto-reorder's sweep) detect
// and skip a stale write instead of silently clobbering the concurrent change — the
// transaction below only protects the DB row itself, not this kind of logical race.
export class ComboUpdateConflictError extends Error {
  constructor(id) {
    super(`Combo ${id} was modified concurrently; aborting stale write`);
    this.name = "ComboUpdateConflictError";
    this.comboId = id;
  }
}

export async function updateCombo(id, data, { expectedUpdatedAt } = {}) {
  const db = await getAdapter();
  let result = null;
  let conflict = false;
  db.transaction(() => {
    const row = db.get(`SELECT * FROM combos WHERE id = ?`, [id]);
    if (!row) return;
    if (expectedUpdatedAt && row.updatedAt !== expectedUpdatedAt) {
      conflict = true;
      return;
    }
    const merged = { ...rowToCombo(row), ...data, updatedAt: nextTimestamp() };
    db.run(
      `UPDATE combos SET name = ?, kind = ?, models = ?, updatedAt = ? WHERE id = ?`,
      [merged.name, merged.kind, stringifyJson(merged.models || []), merged.updatedAt, id]
    );
    result = merged;
  });
  if (conflict) throw new ComboUpdateConflictError(id);
  return result;
}

export async function deleteCombo(id) {
  const db = await getAdapter();
  const res = db.run(`DELETE FROM combos WHERE id = ?`, [id]);
  return (res?.changes ?? 0) > 0;
}
