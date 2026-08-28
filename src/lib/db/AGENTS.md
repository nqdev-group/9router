# src/lib/db

SQLite persistence layer: driver abstraction, versioned + additive schema sync, and one repo file per table/domain. Everything else in the app reaches the DB only through `getAdapter()` or the repo functions re-exported from `index.js`.

## Directory map

- `driver.js` — `getAdapter()` / `getAdapterSync()`. Picks a SQLite backend, runs `migrate.js` once, caches the instance on `global._dbAdapter` (survives Next.js dev hot-reload).
- `adapters/` — one file per backend, each returning the same sync API: `bunSqliteAdapter.js`, `betterSqliteAdapter.js`, `nodeSqliteAdapter.js`, `sqljsAdapter.js`.
- `schema.js` — `TABLES` (declarative column/index map, the source of truth for additive sync), `SCHEMA_VERSION` (bump on any table/column/index change), `PRAGMA_SQL`, `buildCreateTableSql()`.
- `migrations/001-initial.js` + `migrations/index.js` — versioned migration chain (`MIGRATIONS`, `latestVersion()`). Only file(s) here for destructive changes (drop/rename/type-change).
- `migrate.js` — `runMigrationOnce(adapter)`: bootstraps `_meta`, runs versioned migrations, runs additive sync from `TABLES`, one-time legacy `db.json`/`usage.json`/etc. import, pre-schema-change backup.
- `helpers/` — `jsonCol.js` (`parseJson`/`stringifyJson` for `data TEXT` columns), `kvStore.js` (`makeKv(scope)` factory over the generic `kv` table), `metaStore.js` (async + `*Sync` accessors for `_meta`).
- `repos/` — one file per table/domain (see table below). Plain async exported functions, no classes.
- `backup.js` — `makeBackupDir`, `backupFile`, `backupDbLite` (ATTACH-based, excludes `requestDetails`), `pruneOldBackups` (keeps 3 newest).
- `paths.js` — `DATA_FILE`, `DB_DIR`, `BACKUPS_DIR`, `LEGACY_FILES`, `ensureDirs()`.
- `version.js` — app version / timestamp slug helpers used by `backup.js`.
- `index.js` — public barrel: re-exports every repo function, plus `exportDb()`/`importDb()` (full-DB JSON snapshot) and `initDb()`.
- `repos/settingsRepo.js.orig` — stray uncommitted backup of an older `settingsRepo.js` (missing many current `DEFAULT_SETTINGS` keys). Not imported anywhere; dead file, don't treat as a reference.

## Repos (`repos/`)

| File | Table(s) | Owns |
|---|---|---|
| `settingsRepo.js` | `settings` (1 row, id=1) | App settings blob, `DEFAULT_SETTINGS` + `mergeWithDefaults` back-compat |
| `connectionsRepo.js` | `providerConnections` | Provider OAuth/API-key accounts, priority-based reorder, dedup-on-create |
| `nodesRepo.js` | `providerNodes` | Custom provider "node" definitions |
| `proxyPoolsRepo.js` | `proxyPools` | Outbound proxy pools |
| `apiKeysRepo.js` | `apiKeys` | Dashboard/API bearer keys, `validateApiKey` |
| `combosRepo.js` | `combos` | Model-combo (fallback chain) definitions |
| `aliasRepo.js` | `kv` (scopes `modelAliases`/`customModels`/`mitmAlias`) | Model alias + custom model + mitm-tool mapping CRUD |
| `pricingRepo.js` | `kv` (scope `pricing`) | User-overridden per-model pricing |
| `modelsDevPricingRepo.js` | `kv` (scope `modelsDevPricing` + related) | Cached models.dev pricing snapshot/map |
| `modelTokenLimitsRepo.js` | `kv` (scope `modelTokenLimits`, via `makeKv`) | User max-input-token overrides per provider/model, 5s in-memory cache |
| `disabledModelsRepo.js` | `kv` (scope `disabledModels`) | Per-provider disabled model id lists |
| `usageRepo.js` | `usageHistory`, `usageDaily` | Request logging, stats/chart aggregation, token-saver stats, `statsEmitter` (SSE-like live feed) |
| `requestDetailsRepo.js` | `requestDetails` | Full request/response detail log (header sanitization, pruned, excluded from backups) |
| `cmemRepo.js` | `cmem_observations`, `cmem_sessions`, `cmem_context_cache` (+ FTS5 virtual table) | CMEM engine tables — **not** in `schema.js TABLES`; created lazily via `initCmemTables()` |

## Adapter API surface

Every adapter in `adapters/` returns the identical **synchronous** shape (only construction is async):
```js
{ driver: "better-sqlite3"|"node:sqlite"|"bun:sqlite"|"sql.js",
  run(sql, params) -> {changes, lastInsertRowid},
  get(sql, params) -> row|undefined,
  all(sql, params) -> row[],
  exec(sql),
  transaction(fn) -> fn's return value,
  checkpoint(), close(), raw }
```
`run`/`get`/`all`/`exec`/`transaction` are all synchronous calls even though repos `await` the `getAdapter()` promise around them — only the adapter *acquisition* is async, not each query.

## Driver selection (`driver.js`)

`initAdapter()` tries, in order, stopping at the first success: `tryBunSqlite` (only if `process.versions.bun`) → `tryBetterSqlite` (skipped under Bun) → `tryNodeSqlite` (skipped under Bun, requires Node ≥22.5, dynamic `import("node:sqlite")`) → `trySqlJs` (always available, pure-WASM fallback). Each `tryX` wraps its dynamic import in try/catch and returns `null` on any failure (missing native binding, wrong runtime, etc.) rather than throwing — `initAdapter` only throws if all four fail. Result is memoized on `global._dbAdapter.instance`; `getAdapterSync()` throws if called before the first `await getAdapter()`.

## Conventions

- Repos never construct SQL by hand from user objects — structured columns (id, provider, isActive, timestamps) map 1:1 to real columns; everything else is serialized into a single `data TEXT` JSON column via `stringifyJson`/`parseJson` (see `connectionsRepo.js` `rowToConn`/`connToRow`).
- Multi-statement writes that must be atomic use `db.transaction(() => { ... })` (read-modify-write, e.g. `settingsRepo.updateSettings`, `connectionsRepo.createProviderConnection`).
- Generic per-key JSON storage (aliases, pricing, disabled models, token limits) goes through `helpers/kvStore.js`'s `makeKv(scope)` rather than a bespoke table.
- Consumers should import from the barrel `src/lib/db/index.js` (or the app's legacy shims `src/lib/localDb.js`, `src/lib/usageDb.js`, `src/lib/requestDetailsDb.js`, `src/lib/disabledModelsDb.js`), not reach into `repos/*` directly from outside `src/lib/db/`.
- Per `AGENTS.md` (root): `src/lib/` is one of the few places new logic is allowed to grow directly (infra glue: DB driver, adapters) — new tables/repos belong here, not in `packages/`.

## How to add a new table/repo

1. Add the table to `TABLES` in `schema.js` (columns + optional `indexes`/`primaryKey`) — this alone makes `syncSchemaFromTables()` create it (and add missing columns) on next boot for *existing* DBs, additive only.
2. For a destructive change (drop/rename/retype an existing column), instead add a new `migrations/00N-name.js` (`{ version, name, up(db) }`) and register it in `migrations/index.js`'s `MIGRATIONS` array — bump `SCHEMA_VERSION` in `schema.js` too, so a pre-change backup is taken.
3. Create `repos/newRepo.js`: plain `export async function` per operation, `const db = await getAdapter();` first line, follow the row<->object mapping pattern in `connectionsRepo.js` (`rowToConn`/`connToRow`) if the table mixes structured + JSON-blob columns.
4. Re-export the new functions from `index.js`'s barrel.
5. If the feature needs its own self-contained tables outside the shared migration pipeline (rare — see `cmemRepo.js`), define DDL inline with `CREATE TABLE IF NOT EXISTS` and call the init function lazily from the feature's entry point instead of adding to `schema.js`.

## Pitfalls

| Issue | Detail |
|---|---|
| sql.js persistence is debounced | `sqljsAdapter.js` writes are in-memory; disk flush is `setTimeout(..., 100)` debounced (`scheduleSave`). A crash within that 100ms window loses the last write(s). `close()`/`beforeExit`/`SIGINT`/`SIGTERM` force a flush if `dirty`, but uncaught crashes bypass that. |
| `better-sqlite3` is optional | In `optionalDependencies` — `npm install` must not fail without it. Never assume it's present; `driver.js` already handles the fallback, don't add code elsewhere that hard-imports it. |
| `node:sqlite` needs Node ≥22.5 | Checked via `process.versions.node` major/minor before the dynamic import; also skipped entirely under Bun. |
| CMEM tables bypass the shared schema | `cmem_*` tables aren't in `schema.js TABLES` or the migration chain — `initCmemTables()` is called lazily from the API route (`src/app/api/settings/cmem/route.js`), so a fresh DB has no `cmem_*` tables until that route runs once. FTS5 virtual table creation is wrapped in try/catch (older SQLite builds may lack FTS5). |
| `settingsRepo.js.orig` is dead | Stray `.orig` file with a stale `DEFAULT_SETTINGS`; not imported by `index.js` or anything else — don't edit it thinking it's live. |
| Backups exclude `requestDetails` | `backup.js`'s `BACKUP_EXCLUDE_TABLES` skips the (large, prunable) request-log table so schema-change backups stay small; there is no automated restore, only manual file copy. |
| WAL checkpoint timers | `better-sqlite3`/`node:sqlite`/`bun:sqlite` adapters each set an unref'd `setInterval` to truncate the WAL every 60s — don't add a second one per adapter instance. |
