import { getErrorLogAdapter } from "./driver.js";

const RETENTION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days — decided 2026-09-22, see plan
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h, same cadence as CMEM's retention sweep
let cleanupTimerStarted = false;

function startCleanupTimer() {
  if (cleanupTimerStarted) return;
  cleanupTimerStarted = true;
  const timer = setInterval(() => { cleanupOldErrorLogs().catch(() => {}); }, CLEANUP_INTERVAL_MS);
  if (typeof timer.unref === "function") timer.unref();
}

/** Account-level error — from src/sse/services/auth.js markAccountUnavailable(). Fail-open: never throws. */
export async function logAccountError({ provider, connectionId, model, errorCode }) {
  try {
    const db = await getErrorLogAdapter();
    startCleanupTimer();
    await db.run(
      `INSERT INTO error_log (provider, connection_id, model, error_code, created_at_epoch) VALUES (?, ?, ?, ?, ?)`,
      [provider || "unknown", connectionId || null, model || null, errorCode != null ? String(errorCode) : null, Date.now()]
    );
  } catch (e) {
    console.warn(`[ErrorLogDB] logAccountError failed: ${e.message}`);
  }
}

/** Model-level error, scoped per-combo — from open-sse/services/combo.js's markComboModelFailed call sites. Fail-open: never throws. */
export async function logModelError({ provider, model, comboName, errorCode }) {
  try {
    const db = await getErrorLogAdapter();
    startCleanupTimer();
    await db.run(
      `INSERT INTO error_log (provider, model, combo_name, error_code, created_at_epoch) VALUES (?, ?, ?, ?, ?)`,
      [provider || "unknown", model || null, comboName || null, errorCode != null ? String(errorCode) : null, Date.now()]
    );
  } catch (e) {
    console.warn(`[ErrorLogDB] logModelError failed: ${e.message}`);
  }
}

/** Hourly error-frequency buckets for account-level errors, last 7 days. */
export async function getAccountErrorFrequency() {
  const db = await getErrorLogAdapter();
  const since = Date.now() - RETENTION_MS;
  return db.all(
    `SELECT strftime('%Y-%m-%dT%H:00:00Z', created_at_epoch / 1000, 'unixepoch') as bucket,
            provider, connection_id as connectionId, COUNT(*) as count
     FROM error_log
     WHERE connection_id IS NOT NULL AND created_at_epoch >= ?
     GROUP BY bucket, provider, connection_id
     ORDER BY bucket ASC`,
    [since]
  );
}

/** Hourly error-frequency buckets for model-level errors (per combo), last 7 days. */
export async function getModelErrorFrequency() {
  const db = await getErrorLogAdapter();
  const since = Date.now() - RETENTION_MS;
  return db.all(
    `SELECT strftime('%Y-%m-%dT%H:00:00Z', created_at_epoch / 1000, 'unixepoch') as bucket,
            provider, model, combo_name as comboName, COUNT(*) as count
     FROM error_log
     WHERE combo_name IS NOT NULL AND created_at_epoch >= ?
     GROUP BY bucket, provider, model, combo_name
     ORDER BY bucket ASC`,
    [since]
  );
}

/** Distinct (provider, model, comboName) triples currently failing within the retention window — for the model-error list + "which combos use this model" UI. */
export async function getFailingModels() {
  const db = await getErrorLogAdapter();
  const since = Date.now() - RETENTION_MS;
  return db.all(
    `SELECT provider, model, combo_name as comboName, COUNT(*) as count, MAX(created_at_epoch) as lastErrorAt
     FROM error_log
     WHERE combo_name IS NOT NULL AND created_at_epoch >= ?
     GROUP BY provider, model, combo_name
     ORDER BY count DESC`,
    [since]
  );
}

export async function cleanupOldErrorLogs() {
  const db = await getErrorLogAdapter();
  const cutoff = Date.now() - RETENTION_MS;
  await db.run(`DELETE FROM error_log WHERE created_at_epoch < ?`, [cutoff]);
}

// Cap the number of chart lines so a provider with many failing accounts/models
// doesn't render an unreadable chart — the full breakdown is still available via
// getAccountErrorFrequency()/getFailingModels() for a table view if needed later.
const MAX_CHART_SERIES = 8;

function pivotToChartSeries(rows, keyFn, labelFn) {
  const buckets = [...new Set(rows.map((r) => r.bucket))].sort();
  const bucketIndex = new Map(buckets.map((b, i) => [b, i]));

  const seriesMap = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!seriesMap.has(key)) {
      seriesMap.set(key, { key, label: labelFn(row), counts: new Array(buckets.length).fill(0), total: 0 });
    }
    const s = seriesMap.get(key);
    s.counts[bucketIndex.get(row.bucket)] += row.count;
    s.total += row.count;
  }

  const series = [...seriesMap.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, MAX_CHART_SERIES)
    .map(({ key, label, counts }) => ({ key, label, counts }));

  return { buckets, series };
}

/** Chart-ready {buckets, series} for the account-error chart — one series per (provider, connectionId), capped to the top offenders. */
export async function getAccountErrorChartData() {
  const rows = await getAccountErrorFrequency();
  return pivotToChartSeries(
    rows,
    (r) => `${r.provider}::${r.connectionId}`,
    (r) => `${r.provider} / ${String(r.connectionId).slice(0, 8)}`
  );
}

/** Chart-ready {buckets, series} for the model-error chart — one series per (comboName, provider, model), capped to the top offenders. */
export async function getModelErrorChartData() {
  const rows = await getModelErrorFrequency();
  return pivotToChartSeries(
    rows,
    (r) => `${r.comboName}::${r.provider}/${r.model}`,
    (r) => `${r.comboName}: ${r.provider}/${r.model}`
  );
}
