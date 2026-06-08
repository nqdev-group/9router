# Cloud Sync

## Giới thiệu

Cloud sync cho phép đồng bộ cấu hình 9Router (providers, combos, aliases, keys) giữa nhiều devices thông qua cloud service tại `https://9router.com`.

## Kiến trúc

```
src/
├── lib/
│   ├── initCloudSync.js           # Khởi tạo cloud sync
│   └── oneproxySync.js            # OneProxy sync (circuit breaker)
├── shared/
│   └── services/
│       ├── bootstrap               # Khởi tạo watchdog
│       ├── initializeCloudSync.js  # Cloud sync initialization
│       └── cloudSyncScheduler.js   # Periodic sync scheduler
└── app/api/
    ├── cloud/                      # Cloud-facing helpers
    └── sync/                       # Sync control routes
```

## Cấu hình

```bash
# Environment variables
BASE_URL=http://localhost:20128    # Server-side base URL (preferred)
CLOUD_URL=https://9router.com      # Cloud sync endpoint (preferred)
NEXT_PUBLIC_BASE_URL=http://localhost:20128  # UI base URL
NEXT_PUBLIC_CLOUD_URL=https://9router.com    # UI cloud URL
```

## Lifecycle

```
Enable Cloud Sync:
1. POST /api/sync/cloud { action: "enable" }
2. set cloudEnabled=true trong settings
3. POST /sync/{machineId} → push providers/aliases/combos/keys
4. GET /{machineId}/v1/verify → verify cloud endpoint
5. Return success

Periodic Sync:
1. CloudSyncScheduler chạy định kỳ (khi cloudEnabled)
2. POST /sync/{machineId} → sync data
3. Update local tokens/status với remote data

Disable Cloud Sync:
1. POST /api/sync/cloud { action: "disable" }
2. set cloudEnabled=false
3. DELETE /sync/{machineId}
4. Restore local ANTHROPIC_BASE_URL (nếu cần)
```

## Degradation Handling

- Sync errors được surface nhưng local runtime continues
- Timeout + fail-fast behavior (tránh UI hanging khi cloud DNS/network unavailable)
- Circuit breaker cho OneProxy sync

## Sync Data

Các dữ liệu được sync:

```js
{
  machineId: "...",
  providers: [...],     // Provider connections (masked secrets)
  combos: [...],        // Model combos
  aliases: {...},       // Model aliases
  keys: [...],          // API keys
  settings: {...}       // Settings
}
```
