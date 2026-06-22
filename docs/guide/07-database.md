# Database Layer

## Architecture

Database layer nằm trong `src/lib/db/` với driver chain tự động:

```
src/lib/db/
├── index.js              # Public API barrel + export/import
├── driver.js             # Adapter chain loader
├── paths.js              # File path constants
├── schema.js             # Declarative schema definition
├── version.js            # App version helpers
├── migrate.js            # Migration runner
├── backup.js             # Backup/restore
├── adapters/             # 4 driver implementations
│   ├── bunSqliteAdapter.js
│   ├── betterSqliteAdapter.js
│   ├── nodeSqliteAdapter.js
│   └── sqljsAdapter.js
├── helpers/              # Utility helpers
│   ├── jsonCol.js        # JSON serialization
│   ├── kvStore.js        # Key-value store
│   └── metaStore.js      # Metadata store
├── migrations/           # Versioned migrations
│   ├── 001-initial.js
│   ├── 002-add-rtk-columns.js
│   ├── 003-proxy-registry.js
│   └── 004-add-caveman-mem-columns.js
└── repos/                # 12 repository modules
    ├── settingsRepo.js
    ├── connectionsRepo.js
    ├── nodesRepo.js
    ├── proxyPoolsRepo.js
    ├── apiKeysRepo.js
    ├── combosRepo.js
    ├── aliasRepo.js
    ├── pricingRepo.js
    ├── disabledModelsRepo.js
    ├── proxiesRepo.js
    ├── requestDetailsRepo.js
    └── usageRepo.js
```

## Driver Chain

Priority tự động chọn driver khả dụng:

| Priority | Runtime | Driver | File |
|----------|---------|--------|------|
| 1 | Bun | `bun:sqlite` | `adapters/bunSqliteAdapter.js` |
| 1 | Node | `better-sqlite3` | `adapters/betterSqliteAdapter.js` |
| 2 | Node ≥22.5 | `node:sqlite` | `adapters/nodeSqliteAdapter.js` |
| Last | Both | `sql.js` (WASM) | `adapters/sqljsAdapter.js` |

Mỗi adapter export `create*Adapter(filePath)` trả về `{ driver, exec, get, all, run, transaction }`.

## Schema

**File**: `src/lib/db/schema.js`

Main tables:

```sql
-- Metadata store
CREATE TABLE _meta (key TEXT PRIMARY KEY, value TEXT);

-- Settings (single row, id=1)
CREATE TABLE settings (id INTEGER PRIMARY KEY, data TEXT);

-- Provider connections
CREATE TABLE providerConnections (
  id TEXT PRIMARY KEY, provider TEXT, authType TEXT, name TEXT,
  email TEXT, priority INTEGER, isActive INTEGER, data TEXT,
  createdAt TEXT, updatedAt TEXT
);

-- Provider nodes
CREATE TABLE providerNodes (
  id TEXT PRIMARY KEY, type TEXT, name TEXT, data TEXT,
  createdAt TEXT, updatedAt TEXT
);

-- Proxy pools
CREATE TABLE proxyPools (
  id TEXT PRIMARY KEY, isActive INTEGER, testStatus TEXT,
  data TEXT, createdAt TEXT, updatedAt TEXT
);

-- API keys
CREATE TABLE apiKeys (
  id TEXT PRIMARY KEY, key TEXT UNIQUE, name TEXT,
  machineId TEXT, isActive INTEGER, createdAt TEXT
);

-- Combos
CREATE TABLE combos (
  id TEXT PRIMARY KEY, name TEXT UNIQUE, kind TEXT,
  models TEXT, createdAt TEXT, updatedAt TEXT
);

-- Key-value store (scoped)
CREATE TABLE kv (scope TEXT, key TEXT, value TEXT, PRIMARY KEY(scope, key));

-- Usage tracking
CREATE TABLE usageHistory (/* ... */);
CREATE TABLE usageDaily (/* ... */);
CREATE TABLE requestDetails (/* ... */);
```

## File Paths

```js
DB_DIR = DATA_DIR + "/db"
DATA_FILE = DB_DIR + "/data.sqlite"
BACKUPS_DIR = DB_DIR + "/backups"
```

DATA_DIR mặc định:
- Windows: `%APPDATA%/9router`
- POSIX: `~/.9router`
- Override: `DATA_DIR` env var

## Migration Runner

**File**: `src/lib/db/migrate.js`

Migration flow trên mỗi `initAdapter()`:

1. **Versioned migrations**: Chạy lần lượt `MIGRATIONS` theo thứ tự
2. **Additive schema sync**: Tự động thêm tables/columns/indexes còn thiếu
3. **Legacy JSON import** (một lần):
   - Chỉ khi DB mới (empty `_meta`)
   - Legacy JSON files tồn tại
   - Chưa có `.migrated-from-json` marker
4. **App version upgrade backup**: Khi `appVersion` thay đổi

### Migration Files

| # | File | Mô tả |
|---|------|-------|
| 1 | `001-initial.js` | Tạo tất cả tables từ schema |
| 2 | `002-add-rtk-columns.js` | Thêm RTK columns vào usageHistory |
| 3 | `003-proxy-registry.js` | Tạo proxy_registry + proxy_assignments |
| 4 | `004-add-caveman-mem-columns.js` | Thêm caveman + mem columns vào usageHistory |

## Repositories

| Repo | Functions | Mô tả |
|------|-----------|-------|
| `settingsRepo.js` | `getSettings`, `updateSettings`, `isCloudEnabled`, `getCloudUrl`, `exportSettings` | Deep merge với defaults |
| `connectionsRepo.js` | CRUD + dedup (by email cho OAuth, by name cho API key) | Atomic merge, cleanup |
| `nodesRepo.js` | CRUD | Provider nodes |
| `proxyPoolsRepo.js` | CRUD | Proxy pools |
| `apiKeysRepo.js` | CRUD + `validateApiKey` | Client API keys |
| `combosRepo.js` | CRUD + `getComboByName` | Model combos |
| `aliasRepo.js` | Model aliases, custom models, mitm alias (dùng kv table) | |
| `pricingRepo.js` | Override pricing (kv scope `pricing`) | |
| `disabledModelsRepo.js` | Per-provider disabled model lists | |
| `proxiesRepo.js` | Proxy registry CRUD + assignment | Assign/release proxy per provider |
| `requestDetailsRepo.js` | Save/query debug request details | |
| `usageRepo.js` | **Largest (873 lines)** | In-memory pending state, daily aggregation, chart data, token reports, rate limiting detection |

## Export/Import

```js
exportDb() → Full DB as JSON
importDb(payload) → Full DB import (trong transaction, wipe + insert)
```
