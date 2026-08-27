# src/sse

Bridges Next.js API routes to the provider-agnostic `open-sse/` engine: resolves model/combo →
picks a credential (account) → calls the shared `open-sse/handlers/*Core.js` → on failure, cycles
to the next account/model. Not an engine itself — no translation/provider logic here, that's
`open-sse/`'s job (see `open-sse/AGENTS.md`).

## Directory map

- `handlers/chat.js` — chat completions entry (combo loop + account fallback). See below.
- `handlers/imageGeneration.js`, `videoGeneration.js`, `tts.js`, `stt.js`, `embeddings.js`, `search.js`, `fetch.js` — same auth/fallback shape as `chat.js` per modality, each thin-wrapping its `open-sse/handlers/*Core.js` counterpart (`imageGenerationCore.js`, `fetch/index.js`, etc.).
- `services/auth.js` — credential selection (`getProviderCredentials`), account-strategy (fill-first/round-robin), failure bookkeeping (`markAccountUnavailable`, `clearAccountError`), API-key extraction/validation, Discord down/recovery alerts.
- `services/model.js` — `parseModel`/`getModelInfo` wired to localDb (model aliases, combos, user-defined openai/anthropic/embedding provider nodes) on top of `open-sse/services/model.js` core parsing; also merges `@9router/services/model.js` extra-prefix inference.
- `services/tokenRefresh.js` — wraps `open-sse/services/tokenRefresh.js` + `oauthCredentialManager.js` with the local logger and localDb persistence (`updateProviderCredentials`); `checkAndRefreshToken` is the per-request proactive refresh entry, also handles GitHub Copilot token exchange.
- `services/backgroundTokenRefresh.mjs` — interval-based (default 5 min) proactive refresh independent of inbound requests, for OAuth connections expiring within 30 min. Skipped in edge/build/browser runtimes; disable via `DISABLE_BACKGROUND_TOKEN_REFRESH`.
- `utils/logger.js` — local console logger (`debug/info/warn/error`, colored session tags, `maskKey`). Distinct from `open-sse/utils/` loggers passed in as the `log` param.
- `handlers/chat.js.orig`, `services/auth.js.orig` — stray backup files from a past merge-conflict resolution (git-ignored via `*.orig`). Not live code; harmless but a sign these two files are real upstream-merge hotspots (see root `AGENTS.md` fork-sync rule).

## Combo loop & account fallback (concrete)

`handleChat` (`handlers/chat.js:106`) step by step:
1. Parse JSON body, enforce `requireApiKey` (settings), require `model`.
2. `handleBypassRequest` short-circuits naming/warmup probes before spending a rotation slot (`chat.js:162`).
3. `getComboModels(modelStr)` (`services/model.js`) checks if the model name is a combo. If so:
   - strategy = per-combo override (`settings.comboStrategies[name].fallbackStrategy`) else `settings.comboStrategy` else `"fallback"`.
   - `augmentModelsWithCapacityAdapter` (open-sse) may insert extra models when the request needs a capability (e.g. vision) the target lacks.
   - `"fusion"` strategy → `handleFusionChat` (open-sse `services/combo.js`, panel + judge models). Any other strategy → `handleComboChat` (round-robin/sticky/fallback across `augmentedModels`), passed `tierRouting` (cost-aware reorder, `buildTierRoutingConfig`) and `tokenLimitRouting` (drops models whose configured max-input-tokens can't fit the prompt, `buildTokenLimitRoutingConfig`).
   - Both combo entry points take `handleSingleModel: (body, model) => handleSingleModelChat(...)` as the callback that tries one model — **the actual retry/fallback loop lives in `open-sse/services/combo.js`, not here**; this file only supplies the per-model unit of work.
4. If not a combo, single model may still get capacity-adapter-augmented into a mini combo (`chat.js:217`).
5. `handleSingleModelChat` (`chat.js:240`) is the **account fallback loop**: `while (true)` over `getProviderCredentials(provider, excludeConnectionIds, model)`.
   - No credentials at all → 404. All rate-limited (`credentials.allRateLimited`) → 503 with `Retry-After`. Exhausted accounts → last seen error/status.
   - `checkAndRefreshToken` proactively refreshes the token before use; antigravity/gemini-cli get a cold-miss project-ID backfill.
   - Calls `handleChatCore` (`open-sse/handlers/chatCore.js`) with credentials + all engine toggles (rtk/headroom/caveman/ponytail/pxpipe/cmem/privacy) read from `settings`, plus `onCredentialsRefreshed`/`onRequestSuccess` callbacks that persist back to localDb.
   - `result.success` → return response. Otherwise `markAccountUnavailable(...)` (`services/auth.js:219`) decides `shouldFallback` (via `open-sse/services/accountFallback.js` `checkFallbackError`, config-driven `ERROR_RULES` + exponential backoff) — if true, add the connection to `excludeConnectionIds` and `continue` the loop (next account); if false, return the error response as-is (no retry).
   - `getComboModels` is also re-checked *inside* `handleSingleModelChat` (`chat.js:246`) because a combo name can arrive there when `getModelInfo` returns `provider: null` — i.e. combo detection happens twice, in `handleChat` and again in `handleSingleModelChat`.

No circuit breaker beyond per-model-per-account cooldown locks (`modelLock_${model}` in the connection row, set by `markAccountUnavailable`/read by `isModelLockActive`); there's no cap on total accounts tried per request — the `while (true)` loop only exits when `getProviderCredentials` returns null/allRateLimited or a request succeeds.

## Auth services / Discord alert integration

`services/auth.js` owns account selection and failure/recovery bookkeeping:
- `markAccountUnavailable` (auth.js:219) locks the model on the connection, then fires-and-forgets a check via `@9router/provider-alert`: `checkAllAccountsDown` — if every connection for the provider is down and cooldown (`providerAlertCooldown`) elapsed, sends a Discord embed (`formatAlertMessage` + `sendDiscordAlert`) and persists a debounce timestamp into `settings.providerAlertState[providerId]`.
- `clearAccountError` (auth.js:307) clears locks on success, and symmetrically fires `checkRecovery` → `formatRecoveryMessage` → `sendDiscordAlert` when the provider comes back, removing it from `providerAlertState`.
- Both alert paths are best-effort: gated by `providerAlertEnabled`/`providerAlertWebhookUrl`, skip providers in `providerAlertIgnoreProviders`, and swallow all errors (`.catch(() => {})`).

## Pitfalls

| Issue | Where |
|---|---|
| Combo detection runs twice (once in `handleChat`, again in `handleSingleModelChat` when `modelInfo.provider` is null) — keep both branches' combo-handling logic (fusion/strategy/tierRouting/tokenLimitRouting) in sync if you touch one | `chat.js:167-213` and `chat.js:245-293` (near-duplicate code) |
| Leftover debug `console.log("🚀 QuyNH: ...")` statements print raw `modelInfo`/`parsed` on every request | `chat.js:242`, `services/model.js:51` |
| Alert fire-and-forget blocks: `markAccountUnavailable`/`clearAccountError` don't await the Discord webhook call, so a slow/broken webhook never delays the response — but also means failures there are invisible unless you check logs | `services/auth.js:264-293`, `348-369` |
| `*.orig` files exist for exactly `chat.js` and `auth.js` — these two are known upstream-merge-conflict hotspots; per root `AGENTS.md`, prefer keeping upstream's version and moving local customizations into `packages/*` | `handlers/chat.js.orig`, `services/auth.js.orig` |
| All per-modality handlers duplicate the same auth/fallback boilerplate (extract key → check `requireApiKey` → resolve combo → `while` loop over credentials) — no shared base function; changes to the fallback contract must be replicated across all 8 handler files | `handlers/{chat,imageGeneration,videoGeneration,tts,stt,embeddings,search,fetch}.js` |
| `services/model.js` silently swallows a missing `@9router/services/model.js` package (extra provider-prefix inference) via try/catch — only a `console.error`, routing still works without it | `services/model.js:8-15` |
| Background token refresh (`backgroundTokenRefresh.mjs`) and per-request refresh (`tokenRefresh.js checkAndRefreshToken`) use different lead times (30 min vs per-provider `getRefreshLeadMs`) and can race to refresh the same connection; both are fail-open so a race just means a wasted refresh call, not a correctness bug | `services/backgroundTokenRefresh.mjs:9`, `services/tokenRefresh.js:219` |
