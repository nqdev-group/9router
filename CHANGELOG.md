# v0.5.40 (2026-07-20)

## Features
- **i18n**: add Khmer (km) translations
- **CLI tools**: configure Grok Build subagent models
- **Kimi**: merge OAuth into dual-auth provider, add K3 / K2.7 models
- **Dashboard**: ProviderTopology flow animation

## Fixes
- **DB**: resolve better-sqlite3 parameter binding crash
- **Translator**: pass `service_tier` through OpenAI → Responses conversion
- **Kiro**: map GPT-5.6 reasoning effort fields
- **Kiro**: validate terminal streams before emitting output
- **Kiro**: map GPT reasoning effort fields
- **Codex**: current `client_version` + refresh-aware model sync
- **Alicode-intl**: split into Coding Plan + Model Studio providers
- **Cursor**: HTTP/2 AgentService support + version bump 3.12.17
- **Dashboard**: cut duplicate API/icon spam, lazy-load provider assets


# v0.5.35 (2026-07-16)

## Features
- **xAI**: Grok Imagine video generation (`/v1/videos`) + CLI
- **CLI tools**: Grok Build setup — choose separate main/general-purpose/explore/plan models and preserve each model's context window
- **GitHub Copilot**: route Claude models through Copilot's native `/v1/messages`
- **Kiro**: add GPT-5.6 model family (#2596)
- **RTK**: `X-9Router-Token-Saver` header to bypass token savers per request
- **Providers**: quota visibility settings
- **Translator**: drop temperature for all Claude models
- **i18n**: Thai (th) + Persian (fa) translations / README

## Fixes
- **Providers**: bulk-add API keys no longer overwrite existing keys (gap-fill `Key N`)
- **Anthropic**: lowercase `anthropic-version` header to prevent duplication on `/v1/messages`
- **Alicode-intl**: use DashScope compatible-mode endpoint so standard keys work
- **Grok CLI**: align Grok Build with current subscription protocol (#2590)
- **Grok CLI**: surface `expiresAt` so proactive token refresh fires (#2546)
- **Kiro**: improve direct session cache reuse
- **Models**: populate capabilities for live-catalog LLM models
- **Models**: list compatible provider models in `/v1/models`
- **Thinking**: send explicit `thinking:{type:adaptive}` alongside `output_config.effort`
- **Translator**: strip `client_metadata` when converting openai-responses → openai

## Improvements
- **Perf**: skip inactive background services on startup

## Docs
- README: Persian YouTube tutorial

# v0.5.30 (2026-07-10)

## Features
- **Perplexity**: add Agent API provider (#2492)
- **Grok CLI**: add Grok CLI / Grok Build provider with OAuth device-code flow (#2502)
- **Featherless**: add OpenAI-compatible provider presets
- **SearXNG**: configure endpoint via SEARXNG_URL env (#2499)
- **Providers**: add max thinking level for gpt-5.6-sol (#2500)
- **Headroom**: add extras detection and install UI (#2403)
- **Headroom**: activate/uninstall extras + fix interpreter detection
- **PXPipe**: PXPIPE token saver — multimodal prompt compression (#2465)
- **Proxy-Pools**: auto-rotate strategy for no-auth providers (#2409)

## Fixes
- **Cloudflare-AI**: support accountId in bulk key import (#2449)
- **DB**: backup on schema change, MCP child cleanup, codex models, usage providers OOM
- **Codex**: avoid bare-email OAuth dedup (#2477)
- **CLI**: allow staged app bundle builds (#2479)
- **Headroom**: compress Kiro conversation state (#2488)
- **Gemini-CLI**: raise output floor for thinking and add validated toolConfig (#2486)
- **GitHub**: label Copilot profiles by account identity (#2498)
- **OpenAI-to-Claude**: unwrap bare {function:{…}} tools without parent type (#2473)
- **Translator**: clamp thinking effort max->xhigh for OpenAI format (#2466)
- **RTK/find**: detect and group Windows backslash-style find output (#2448)
- **Codex**: handle fast tier and capacity SSE (#2452)
- **Volcengine-ark**: clamp Kimi max_tokens to 32768 endpoint cap
- **Antigravity**: align provider fingerprint with IDE Desktop 2.1.1 (#2389)
- **Pricing**: update Claude/Codex model rates and add new models

## Improvements
- **i18n(zh-CN)**: complete Chinese translations for all UI strings (#2436)
- **API**: caching for tunnel and version status endpoints
- **Perf**: faster dev startup and lighter bundle

# v0.5.20 (2026-07-07)

## Features
- **Thinking**: per-model thinking level picker on provider page — appends `(level)` suffix to copied model names for forced reasoning effort across all formats (openai, claude, gemini, deepseek, kimi, qwen, zai, minimax, hunyuan, step)
- **RTK**: add JS-native git-log filter (#2423)
- **Caveman**: add targeted upstream-aligned style rules (#2424)
- **i18n**: add Farsi (fa) language support (#2385)

## Fixes
- **Thinking**: strip `(level)` suffix from upstream `body.model` so providers no longer reject requests
- **Translator**: preserve developer instructions in openai-responses conversion (#2434)
- **count_tokens**: count structured Anthropic blocks (#2419)
- **Volcengine-ark**: clamp GLM-5 max_tokens to model output ceiling (#2428)
- **Kimi**: normalize reasoning_effort to backend enum (#2427)
- **Claude**: reconcile max_tokens vs thinking budget and lift per-model ceiling (#2381)
- **Kiro**: deliver system prompt natively, add Opus 4.5/4.7/4.8, tolerate dash version ids (#2366)
- **Headroom**: proxy dashboard through app (#2372)
- **MITM**: recover from stale lock file on server start

# v0.5.18 (2026-07-03)

## Features
- **Usage**: track cached tokens + correct input/output/cache cost (#2209) — hodtien
- **Codex**: show reset credit expiry details (#2290) — Rafli Ahmad Zulfikar
- **NVIDIA**: add new models and capabilities — decolua
- **ClinePass**: add provider support — sternelee

## Fixes
- **Usage**: dedupe streaming request-details log entries — Qin Li
- **Claude**: drop foreign thinking signatures in passthrough — decolua
- Prevent non-SSE stream pipe crash and cross-IdP account overwrites (#2244) — KunN-21
- **Kiro**: route IdC auth to regional CodeWhisperer surface (#2297) — Volodymyr Saakian
- **Kiro**: add Claude Sonnet 5 model support (#2264) — Edison42
- **Xiaomi-tokenplan**: region selector, key validation, multi-connection (#2251) — MiQieR
- **Translator**: strict Anthropic content block compliance (#2225) — Sahrul Ramadhan Hardiansyah
- **Kimchi**: strip reasoning_content echo to bound multi-turn input tokens — KunN-21
- **Kimchi**: bump User-Agent to kimchi/0.1.40 (#2256) — Ansh7473
- **Codebuddy-cn**: strip empty tool_calls arrays to preserve reasoning — zmf
- **Antigravity**: preserve Claude tool delta index (#2223) — Sutarto Jordan Chrisfivo
- **MITM**: generate root CA on server startup (#2228) — Sutarto Jordan Chrisfivo

# v0.5.15 (2026-06-29)

## Features
- Add Kimchi OAuth provider — Nant361
- Refine Qwen vision/video + thinking model patterns — decolua
- Opt-in Codex auto-ping quota keep-alive — Emirhan

## Fixes
- **Responses**: handle response.done terminal events (#2142) — rifuki
- **Headroom**: skip unsafe responses tool history (#2132) — Sutarto Jordan Chrisfivo
- **Translator**: map mid-conversation system message to user (claude→openai) — decolua
- **Gemini**: normalize contents to prevent 400 invalid_argument (#2192) — warelik
- **Gemini**: backfill thoughtSignature + suppress stream done sentinel — WARELIK
- **Alicode**: preserve cache_control for DashScope providers (#2069) — Rex
- **Antigravity**: strip deprecated/readOnly/writeOnly from tool schemas — iletai, Yudhistira-Official
- **CodeBuddy CN**: show bonus packs as one-time, not monthly-replenishing — whale9820
- **Kiro**: strip leaked <thinking> tags from content stream (#2158) — hamsa0x7
- **Tray**: make Windows context menu DPI-aware — Emirhan
- **Kilocode**: expose full gateway catalog in combo model picker — jellylarper
- **OpenCode**: fix Go GLM — decolua

# v0.5.12 (2026-06-26)

## Features
- Add token-saver dashboard page — decolua
- Add bulk delete for provider connections — teddytkz
- Resolve GitHub Copilot model catalog from upstream — caiqinzhou
- Add Venice AI provider — Brokenc0de
- Add Kiro external_idp import for Microsoft SSO (CLIProxyAPI) — Stevanus Pangau
- Overhaul Blackbox provider catalog + WebUI test support — suryacagur

## Fixes
- Provider thinking compatibility (DeepSeek/Gemini) — Mink Nguyen
- Stop double-counting streaming usage at source — decolua
- Usage logging dedupe to reduce stats churn — Mink Nguyen
- Prevent non-JSON SSE lines / duplicate [DONE] from breaking clients (PR #2046) — qianze
- Resolve Gemini TTS models from catalog — nguyenha935
- Support Kiro IDC (organization) token import — quanturbo
- Preserve forced streaming for JSON clients (#2031) — Joseph Yaksich
- Preserve Responses text format (Codex) — tenglong
- Support Gemini native TTS generateContent endpoint — nguyenha935
- Add missing zh-CN endpoint key label (i18n) — weimaozhen
- CodeBuddy: only send reasoning params when client requests reasoning (#2071) — Rex
- CodeBuddy CN: show one-shot bonus packs as expiring, not monthly-replenishing
- Show custom provider models in combo picker — Sapto
- Docker: add docker-compose.yml with headroom enabled by default — nitsuahlabs
- Clarify token diagnostics vs provider billing (headroom, #1998) — Sutarto Jordan Chrisfivo
- Translate openai-responses input through OpenAI for compression (#1998) — Ankit
- Kiro: report 1M context window for claude-opus-4.8 — EdisonPVE
- Avoid stale redirects after auth changes (#2100) — Emirhan
- Mark Claude Opus 4.7 (dashed id) as 1M context — Brokenc0de
- Preserve reasoning effort through Codex translations — ntdung6868
- Token-saver: full width card layout — decolua
- Antigravity: retry transient upstream failures — Sutarto Jordan Chrisfivo
- Param-support: handle strip rules without match/drop (#1960) — Joseph Yaksich
- Translator: resolve custom provider prefix in debug endpoint (#1083) — hamsa0x7

# v0.5.8 (2026-06-21)

## Features
- **Antigravity**: native image generation support (image models tagged kind:image, hiển thị trong media-providers UI)
- **CodeBuddy CN**: API key auth + credit quota tracker
- **CodeBuddy CN**: short model prefix alias "cbcn"

## Fixes
- **MiniMax-M3**: enable vision capability
- **Headroom**: support Docker sidecar proxy
- **Antigravity**: image executor fixes
- **mimo-free**: Chrome User-Agent rotation to bypass anti-abuse gate
- **cloudflare-ai**: flatten content-part arrays to string to avoid oneOf 400 (#1926)
- **Translator**: normalize tools to Anthropic-native shape for non-Anthropic providers
- **CLI**: handle Next.js 16 nested standalone output path (#1940)
- **Codex**: preserve custom tools during request normalization
- **next.config**: add new route for responses endpoint to API

# v0.5.6 (2026-06-20)

## Features
- **Ponytail**: minimalist code generation feature
- **Headroom**: proxy lifecycle management + dashboard UI (one-click start/stop, install detection, status probing, token saver, claude↔openai shape conversion)
- **CodeBuddy CN**: new OAuth provider (copilot.tencent.com) — 15-model catalog, /v2 inference, forced streaming, OpenAI-style reasoning
- **OpenCode-Go**: align models with official endpoints; route Qwen 3.7 MiniMax via /v1/messages, GLM/Kimi/DeepSeek/MiMo via /chat/completions

## Fixes
- **Anthropic-compatible validation**: use POST /v1/messages (GET /models not spec, false "invalid" for valid keys)
- **CLI tools**: tolerate JSONC configs in all 8 settings routes (opencode, openclaw, kilo, droid, cowork, copilot, claude, cline)
- **Gemini/Antigravity**: preserve 'pattern' in tool schema translation (glob/grep)
- **Combo/Fusion**: flatten Anthropic-style tool messages in panel calls (prevent 503)
- **Models**: store provider custom models by provider scope
- **Perplexity**: use /v1/models endpoint for key validation

# v0.5.4 (2026-06-18)

## Fixes
- **Kiro**: honor thinking effort budgets
- **AG/Kiro/Xiaomi**: provider fixes
- **Combo/Fusion**: flatten tool history in panel calls to prevent 503
- **LLM selector**: show custom vision models in selector and model list
- **Image**: prevent compatible nodes from shadowing provider aliases

# v0.5.2 (2026-06-17)

## Features
- **Combo Fusion strategy** — fans the prompt out to all member models in parallel, then a configurable judge model synthesizes one final answer (quorum-grace, anonymized sources, graceful degradation)
- **Per-combo strategy selector** — pick `fallback` / `round-robin` / `fusion` / `capacity` per combo (replaces the old round-robin toggle), with a judge picker for fusion
- **Capacity auto-switch** — reorders models per request so images/PDFs route to capable models first
- **Kiro headless API-key auth** (`ksk_`) + direct `claude↔kiro` route that avoids the lossy OpenAI two-hop pivot
- **Claude auto-ping** — warms the 5h quota window right after reset so a fresh window starts immediately (per-connection toggle)

## Fixes
- **Claude 429**: stop hammering the OAuth usage endpoint — cache resetAt, throttle quota refresh to 3 min, cool down after a 429 (chat unaffected)
- **Usage logs always empty**: missing `await` on `getAdapter()` in `getRecentLogs` made `/api/usage/logs` & `/api/usage/request-logs` return nothing
- **Executors**: strip params unsupported by the provider/model (drops deprecated `temperature` for claude-opus-4 → Anthropic 400)
- **Translator**: derive deterministic tool_call ids for gemini/antigravity → OpenAI so function call/response pair correctly (fixes tool-pairing 400s)
- **Antigravity**: strip `optional` from tool schemas before sending to Gemini
- **Claude-to-OpenAI**: handle OpenAI-format responses in the non-streaming path (e.g. xiaomi-tokenplan)
- **Usage views**: show edited connection names consistently across Providers & Quota Tracker
- **Security**: hardened reverse-proxy local-access trust
- **Security**: SSRF hardening on web fetch

## Internal
- Large **open-sse / translator refactor** (~40 commits): unified provider/model registry (LiteLLM-style `models[]` + `kind` field, 100 co-located registry files), single-sourced media/OAuth/refresh/token URLs, registry-based dispatch for usage & token-refresh, DRY translator concerns (buildUsage, encodeDataUri, finishReasonMap, chunkBuilder, reasoningDelta…), ESM-safe registry init, large-file splits, dead-code removal, and golden/no-regression test gates

# v0.4.80 (2026-06-13)

## Features
- Vercel AI Gateway: support embeddings, images and credit usage (#1183)
- Add MiMo Free no-auth provider (#1789)
- Vertex: support ADC `authorized_user` credential
- Cowork: re-enable Claude Cowork with preset-only stdio MCP
- Codex: bulk add accounts via JSON (#1719)
- Kiro: enable multi-endpoint failover for GenerateAssistantResponse (#1722)

## Fixes
- Security: re-auth on DB export/import + SSRF guard on web fetch
- Auth: real client IP rate-limiting + remote default-password guard
- Cerebras/Mistral: strip unsupported `client_metadata` from downstream requests (#1742)
- SiliconFlow: update baseUrl `.cn` -> `.com` + curate verified model list (#1760)
- Gemini-to-OpenAI: route unsigned thought parts to `reasoning_content` (#1752)
- Claude-to-OpenAI: strip Anthropic billing header from system prompt (#1765)
- Anthropic-compatible: send Bearer auth for third-party gateways (#1795)
- Usage-stats: avoid partial stats on initial SSE race (#1767)
- Proxy: use `export default` in proxy.js for Next.js 16 middleware detection
- Claude passthrough: add body normalization
- GitHub Copilot: refresh missing/expired token on models discovery (#1727) + add mappable gpt-5-mini/gpt-5.4-nano slots for Copilot MITM (#1653)
- Kiro: auto-resolve profileArn to prevent 403 on IDC login, enhance profile ARN resolution, update endpoint to `runtime.us-east-1.kiro.dev` (#1713)
- Tunnel: detect system-installed Tailscale via dual-socket probe (#1723) + non-blocking probes to prevent UI freeze
- CommandCode: force `stream=true` in transformRequest (#1706)
- Qoder: increase timeouts for reasoning models and improve stream handling
- Dashboard: show provider node name instead of connection name in topology (#1770) + show explicit `kind="llm"` combos on combos page (#1684)

## Docs
- README: add Indonesian 9Router tutorial video (#1709)

# v0.4.71 (2026-06-06)

## Features
- Caveman: add wenyan classical Chinese levels and sync upstream prompts; locale-based visibility on endpoint page
- i18n: endpoint exposure notice across multiple languages + Russian README
- Antigravity: add gemini-3.5-flash-extra-low (Low) model
- xiaomi-tokenplan: add Claude-native MiMo V2.5 Pro alias via dedicated executor
- Qoder: fetch latest model + dashboard import-model button (#1642)
- MiniMax: add MiniMax-M3 + update Quota Tracker coding/CN (#1631)

## Fixes
- Codex: harden streaming timeouts (stall/connect raised to 60s, configurable per-provider), accept `response.done` event, and always emit a terminal `response.failed` + `[DONE]` for Responses passthrough when a stream closes, stalls, or aborts before a terminal event — prevents codex clients from hanging (#1648, #1680, #1688, #1618)
- Codex: durable OAuth refresh lifecycle (#1664)
- Tunnel: skip virtual interfaces to prevent false netchange watchdog
- Claude: fix forced tool_choice 400 on cc/ OAuth route (#1592)
- Proxy: raise Next client body limit to 128MB via `NINEROUTER_PROXY_CLIENT_MAX_BODY_SIZE` (#1529, #1572)
- MiniMax: echo `reasoning_content` on follow-up turns to avoid 400 (#1543)
- Kiro: handle 400 on tool-bearing history without client tools; add mappable "auto" model slot; fix binary EventStream crash + add models & TTS tool filtering
- Antigravity: passthrough tab-autocomplete + mark default agent slot mandatory
- Qoder: allow `qmodel_latest` model key (#1638)
- Providers: restore one-connection guard for compatible/embedding nodes
- Model-test: route image/STT probes to their real endpoints, harden STT ping; add opencode-go + xiaomi-tokenplan to connection test (#1576, #1628)

## Improvements
- Dashboard: reorganize menu actions across sidebar/header/profile
- Translator: add data-driven coverage, bug-exposing cases, and real provider smoke tests

# v0.4.66 (2026-05-29)

## Features
- Add Qoder provider: device-flow OAuth, COSY signing, WAF-bypass body encoding, live model catalog, dashboard quota tracker, 11 models (#1372)
- Add new models: Claude Opus 4.8 (Claude Code), GPT 5.4 Mini (Codex)

## Fixes
- DeepSeek thinking mode: echo `reasoning_content` back on follow-up/tool-call turns so OpenCode-free and custom providers no longer 400 with "reasoning_content must be passed back" (#1543)
- Reasoning injector: match deepseek/kimi model ids case-insensitively (covers custom providers using capitalized model names)
- OpenCode suggested-models: include free models without the `-free` suffix, e.g. `big-pickle` (#1535)

## Improvements
- Codex: trim sunset models, keep gpt-5.5 / gpt-5.4 / gpt-5.3-codex family, add gpt-5.4-mini
- volcengine-ark: refresh model list (add DeepSeek-V4-Flash/Pro, drop EOL entries)
- Lower stream stall timeout 35s → 30s for faster hang detection

# v0.4.63 (2026-05-26)

## Fixes
- GitHub Copilot: never route Gemini/Claude models to the `/responses` endpoint; prevents misleading "does not support Responses API" 400s (#1062)
- proxyFetch: restore missing `Readable` import causing runtime `ReferenceError` in DNS-bypass fetch path

## Improvements
- Lower stream stall timeout from 60s → 35s for faster hang detection

# v0.4.62 (2026-05-26)

## Fixes
- Codex: auto-retry when upstream drops mid-stream (no more hangs)
- Codex: fix random 400/404 errors, tool-calling failures, and unstable prompt cache
- MITM: support Antigravity 2.x 
- Sanitize Read tool args to prevent retry loops from non-Anthropic models (#1144)
- Implement json_schema fallback for OpenAI-compatible providers without native Structured Output (#1343)
- Strip empty Read pages argument in OpenAI-to-Claude translator (#1354)
- Forward Gemini output dimensions for embeddings (#1366)
- Resolve setState-in-effect errors in dashboard components (#1362)
- Gemini CLI: reuse stored OAuth project IDs for quota checks and show clearer setup guidance when the project is missing (#1271, #1428)

## Features
- Add Cloudflare Workers proxy deployer and pool integration (#1360)
- Add Deno Deploy relays support and improved proxy pools dashboard layout (#1437)

## Improvements
- Refactor Tunnel into dedicated Cloudflare and Tailscale manager modules
- Refactor tokenRefresh service with in-flight dedup to prevent refresh_token_reused errors

# v0.4.59 (2026-05-21)

## Fixes
- OAuth: fix login flow on Windows

# v0.4.58 (2026-05-21)

## Features
- xAI Grok provider (OAuth, API key, image)
- Provider limits: paginated accounts with page size controls

## Fixes
- Tailscale: fix connection status on Windows (#1300)
- Tunnel: fix false "checking" when tunnel URL is reachable
- Stream: fix pipe errors on client disconnect/abort

# v0.4.55 (2026-05-18)

## Features
- Xiaomi MiMo Token Plan: region selector (Singapore / China / Europe) — keys are cluster-specific
- Antigravity: risk confirmation dialog before first connection
- Gemini CLI: surface upstream retry delay on 429 errors

## Fixes
- MITM: cannot kill process on macOS under sudo (lsof not found in PATH)
- Stream: false-positive stall timeout on Claude reasoning / Kiro responses
- Tunnel: cannot re-enable after disable (stuck state)
- Tunnel: cloudflared error messages now include log tail for easier debugging
- Language switcher: applies selected locale immediately on close (#1234)
- Antigravity OAuth: metadata now matches the official client

## Improvements
- Gemini CLI: bump engine to 0.34.0
- Re-hide `qwen` (OAuth EOL) and `iflow` (not ready) providers

# v0.4.52 (2026-05-17)

## Features
- Add Vercel AI Gateway provider support (#1183)
- rtk: Kiro format tool result compression — handle conversationState.history & currentMessage, preserve error results, ~13.6% savings (#1194)

## Fixes
- openclaw: normalize agent.model object form `{primary, fallbacks}` before .startsWith → fix TypeError & 'not configured' status (#1216)
- Usage Details pagination: stay inside mobile viewport <640px (#1218)
- Fix test model error
- Fix MIMO provider in Codex
- Disable log file creation when using MITM AG

# v0.4.50 (2026-05-16)

## Fixes
- Fix duplicate tray icon on macOS when hiding to tray
- Fix tray not showing in background mode on macOS
- Fix hide to tray broken on Windows/Linux
- Fix Shutdown button in web UI not working

# v0.4.49 (2026-05-16)

## Features
- Add Kiro provider support: full request/response translation, live model listing, reasoning content support
- Add `buildOutput` RTK filter with autodetect for npm/yarn/cargo build logs
- Add MITM warning notification in tray and dashboard

## Improvements
- Add modalities (input/output) to model configuration for OpenCode
- Fix tray hide-to-tray: keep current process alive instead of spawning detached child (fixes macOS NSStatusItem ghost icon)
- Fix tray kill: graceful shutdown with SIGTERM/SIGKILL escalation
- Fix SIGHUP handling so macOS terminal close doesn't kill tray process
- Hide deprecated providers (qwen, iflow, antigravity)
- Update i18n across 32 languages

## Fixes
- Fix model check (test-models) blocked by dashboardGuard: pass machineId-based CLI token in internal self-calls

# v0.4.46 (2026-05-15)

## Breaking Changes
- Tunnel public URL changed — old tunnel links no longer work, please reconnect to get the new URL

# v0.4.44 (2026-05-15)

## Features
- Add Blackbox provider with `bb` alias (#1143)
- Add Xiaomi token plan provider
- Enhance model select modal UX + modal traffic lights (#1111)
- Default Usage dashboard period to Today (#1141)

## Fixes
- Fix Cowork model selection and Windows CLI packaging (#1129)
- Update provider name retrieval for compatibility provider (#1135)
- Update JWT_SECRET handling

# v0.4.41 (2026-05-14)

## Features
- Add jcode CLI tool integration with auto-configuration (#1047)
- Redesign CLI Tools dashboard: grid layout (1/2/3 cols) + dedicated detail page per tool
- Add drag-and-drop reordering for combo models (#1108)
- Add Today period option to Usage & Analytics (#1063)
- Add DeepSeek V4 Pro effort aliases (#950)

## Fixes
- fix(autostart): work on nvm + npm 9/10, actually register with launchctl (#1104, fixes #1082)
- Fix Ollama usage not tracked/shown in UI (#1102)
- fix(opencode): preserve DeepSeek reasoning content (#1099, fixes #1093)
- Fix TUI input lag (replace enquirer with native readline, persistent raw mode)
- fix(ui): show API key row actions on mobile (#1112)

## Improvements
- Sync DeepSeek TUI card style with other CLI tools (badges, layout, manual config modal)
- Add official logos for Amp CLI, jcode, Qwen Code (replace generic icons)
- Resize deepseek-tui icon 1024→128 with padding for visual consistency

# v0.4.39 (2026-05-14)

## Fixes
- fix(docker): restore `/app/server.js` (v0.4.38 regression)

# v0.4.38 (2026-05-13)

## Features
- Add DeepSeek TUI as CLI tool in dashboard (#1088)

## Fixes
- Fix broken Docker image in v0.4.36/v0.4.37 (#1096, #1097)

## Improvements
- Clean Docker tags + clearer pulls badge

# v0.4.37 (2026-05-13)

## Improvements
- Security hardening — upgrade recommended

# v0.4.36 (2026-05-13)

## Features
- Add MiniMax TTS provider support (#1043)
- Docker images now published on both Docker Hub (`decolua/9router`) and GHCR — pull from your preferred registry

## Improvements
- Replace browser confirm dialogs with custom ConfirmModal (#1060)

## Fixes
- Fix Docker `Cannot find module 'next'` error in standalone build
- Restore /app/server.js in Docker standalone build (#1064, #1067)
- Fix CLI TUI menu arrow-key escape sequences leaking (^[[A^[[B)
- Switch macOS/Linux tray to systray2 fork (fixes Kaspersky AV false-positive) (#1080)
- Fix zoom controls contrast in topology view (#1066)
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Generated by [`auto-changelog`](https://github.com/CookPete/auto-changelog).

## [v--output](https://github.com/nqdev-group/9router/compare/v26.4.71...v--output)

### Merged

- QUYIT-564 Enhance RTK engine, integrate Models.dev pricing, and update docs [`#10`](https://github.com/nqdev-group/9router/pull/10)
- Implement Caveman Engine and Token Saver features with dashboard [`#8`](https://github.com/nqdev-group/9router/pull/8)
- Add RTK Engine components and integrate API with dashboard [`#7`](https://github.com/nqdev-group/9router/pull/7)
- [WIP] Fix failing GitHub Actions job 'build-and-push' [`#6`](https://github.com/nqdev-group/9router/pull/6)
- Add MCP server package and implement cost reporting features [`#3`](https://github.com/nqdev-group/9router/pull/3)

### Commits

- Refactor code structure for improved readability and maintainability [`92a9ba1`](https://github.com/nqdev-group/9router/commit/92a9ba143842075a067fab153eab447fb47b4cfa)
- guide [`55cd011`](https://github.com/nqdev-group/9router/commit/55cd0115ec64e097153db487644d62d4ee797725)
- feat: Add RTK Engine components and API integration [`8225311`](https://github.com/nqdev-group/9router/commit/82253118626592f3f6dfb77713724abfe7efa4ec)
- chore: update changelog for release [`2f49ddc`](https://github.com/nqdev-group/9router/commit/2f49ddc3a78a364d74dfbe478e327e6a6c25f286)
- Refactor code structure for improved readability and maintainability [`f289e5d`](https://github.com/nqdev-group/9router/commit/f289e5df9fff5973e693ad75e1015aca511ca5e7)
- feat(token-saver): Implement Token Saver feature with comprehensive stats, charts, and request tracking [`f338be6`](https://github.com/nqdev-group/9router/commit/f338be6eed5b711d15b12c6c83a164b9e16a12ac)
- feat: Integrate Models.dev pricing support with API endpoints and dashboard settings [`de83f75`](https://github.com/nqdev-group/9router/commit/de83f751ef6b76762153533aad111ad42c9146ca)
- feat: Enhance RTK engine and preprocessing for improved input token optimization [`5e0f481`](https://github.com/nqdev-group/9router/commit/5e0f48194db05929d376cad6dd6f54ce64135f06)
- feat: implement cost reporting components including breakdown table, charts, and summary cards [`252d35f`](https://github.com/nqdev-group/9router/commit/252d35fcf129ca26c82efbf42a842adc6015685b)
- feat: Add EditorConfig and models.dev pricing integration plan [`3db0e71`](https://github.com/nqdev-group/9router/commit/3db0e71b1ce071126d7d1fe44f7a384d0ff9aa61)
- feat: Add Token Saver report plan with data collection and API endpoints [`94c830f`](https://github.com/nqdev-group/9router/commit/94c830f5621a170e2680660f955edbbcbb065cbd)
- feat: Implement Caveman components and API for configuration management [`6caa4d2`](https://github.com/nqdev-group/9router/commit/6caa4d25ed1c21f27d1058e09fd49191ac106662)
- docs: add Docker build guide for 9Router [`47420f5`](https://github.com/nqdev-group/9router/commit/47420f5d05e68d74cfbe5fc14cfc7f2aab47f101)
- docs: add CLAUDE.md for project guidance and development commands [`071ec30`](https://github.com/nqdev-group/9router/commit/071ec300f096f0eed877a846b69ce8b47e3902da)
- feat: Add Caveman Engine page and update sidebar navigation [`f42f9b6`](https://github.com/nqdev-group/9router/commit/f42f9b6810710f60f944b462c3e0a76054a5f8f3)
- feat: Add Caveman Engine configuration and dashboard plan [`2ab753d`](https://github.com/nqdev-group/9router/commit/2ab753d8deb2e6ab5de867fae4532ab72efac632)
- Add CodeQL workflow for code analysis [`b9c9479`](https://github.com/nqdev-group/9router/commit/b9c947941d100f6827af90da5e4d9990c2192403)
- feat: add usage analytics cost report implementation plan with detailed component structure and routing [`c2c7574`](https://github.com/nqdev-group/9router/commit/c2c75742a64d884e0c01800dcd4628d06ce80711)
- feat: add MCP server package with essential functionality and configuration [`98ea3ea`](https://github.com/nqdev-group/9router/commit/98ea3ea0a451ebda0574da42a839e3a21b5c2632)
- refactor: replace getProviderNameByAlias with getProviderByAlias for consistency in cost components [`44f977b`](https://github.com/nqdev-group/9router/commit/44f977b698ad14fe5a3cb1461f4275b85532888a)
- feat: add docker-compose configuration for 9Router service [`818aa49`](https://github.com/nqdev-group/9router/commit/818aa492004b104409695e38d811b45551209be0)
- refactor: Enhance documentation for TokenSaverReport and CostReport components; update default period in TokenSaverReport [`39387b5`](https://github.com/nqdev-group/9router/commit/39387b568c7c6eb8aee2816f0b12fdf852615012)
- docs: Update AGENTS.md for clarity and organization of key architecture and commands [`394c20a`](https://github.com/nqdev-group/9router/commit/394c20a2b2ea4a43f0d465462fe6451ee44c64de)
- chore: update jsconfig paths and add utils index file [`c5bee11`](https://github.com/nqdev-group/9router/commit/c5bee114712f11b2e456ddffa215aae23f4bd912)
- chore: update changelog for release [`c4b65b1`](https://github.com/nqdev-group/9router/commit/c4b65b103f1e931367294f35d6fbb58348d97f9a)
- fix: Correct export syntax in TokenSaver components and improve button class formatting in TokenSaverReport [`dce7294`](https://github.com/nqdev-group/9router/commit/dce72947e98afc1fa7aabf95527746aae7a36c89)
- Potential fix for pull request finding [`ab93ca4`](https://github.com/nqdev-group/9router/commit/ab93ca464476fe7fa8b285d959ffae6990bed616)
- fix: Update import paths for components and correct variable reference in StatsCards [`b540755`](https://github.com/nqdev-group/9router/commit/b54075573c185b2c80121897670ddbd974a87c80)
- Potential fix for pull request finding [`e2ccde7`](https://github.com/nqdev-group/9router/commit/e2ccde7f994bfc44f5bbe040ae5ce1e537d624f1)
- Potential fix for pull request finding [`2cbe66c`](https://github.com/nqdev-group/9router/commit/2cbe66cc8593953f8c875a4d82453c009d659388)
- fix: update workflow name and refine Docker image build conditions [`130acac`](https://github.com/nqdev-group/9router/commit/130acacaa14fe462c681b80f18cfe437d30e7749)
- fix(jsconfig): Update path mapping for @9router to include all package files [`ec511af`](https://github.com/nqdev-group/9router/commit/ec511afa02267cac1950741ece6d5ac4ba266a02)
- fix: Await database adapter in Token Saver stats and chart data functions [`9feee1d`](https://github.com/nqdev-group/9router/commit/9feee1dc4150996d762e8573fc28d8512420912b)
- docs: Update AGENTS.md to clarify import aliases and SQLite persistence details [`f446e13`](https://github.com/nqdev-group/9router/commit/f446e13b944afc0ccbe19639cf75c51d69cc07ac)
- Potential fix for pull request finding [`07a714d`](https://github.com/nqdev-group/9router/commit/07a714d3df5ea98dd917d5ea3b2329805953d2c3)
- chore(ci): update .version.txt for build 1.0.3 [`5391ac9`](https://github.com/nqdev-group/9router/commit/5391ac9f59c20f879b91a8770d446b0783f8cc69)
- chore(ci): update .version.txt for build 1.0.2 [`c192263`](https://github.com/nqdev-group/9router/commit/c192263e58529fc0986a6c99dde9852b9c057698)
- Fix JSX syntax error: escape '&gt;' in AdvancedSettings.js line 136 [`ed92135`](https://github.com/nqdev-group/9router/commit/ed921355749fcae8d1e8e87b8ffd3cc9d6e9ff65)
- Initial plan [`8e27678`](https://github.com/nqdev-group/9router/commit/8e27678d1166e28e2f3f7f208589bb46f61360b9)
- Potential fix for pull request finding [`b68ba8e`](https://github.com/nqdev-group/9router/commit/b68ba8e119296d9c25e7eb56a1734dd72075c1f6)
- fix: update workflow name to include [NQDEV] prefix for clarity [`148652b`](https://github.com/nqdev-group/9router/commit/148652b2b0889d00878594461db42bd0faa2bf97)
- chore(ci): update .version.txt for build 1.0.1 [`01fe596`](https://github.com/nqdev-group/9router/commit/01fe596653f4a81644bf987af2d3e827519f2a04)

## v26.4.71 - 2026-06-07

### Merged

- Added a compass.yml file to manage this repository as a Compass component [`#1`](https://github.com/nqdev-group/9router/pull/1)
- fix: add opencode-go and xiaomi-tokenplan cases to connection test route [`#1576`](https://github.com/nqdev-group/9router/pull/1576)
- fix: include free OpenCode models without -free suffix in suggested models [`#1535`](https://github.com/nqdev-group/9router/pull/1535)
- fix: never route GitHub Copilot Gemini/Claude models to /responses (#1062) [`#1536`](https://github.com/nqdev-group/9router/pull/1536)
- fix: implement json_schema fallback for OpenAI-compatible providers [`#1343`](https://github.com/nqdev-group/9router/pull/1343)
- fix: sanitize Read tool args to prevent retry loops from non-Anthropic models [`#1144`](https://github.com/nqdev-group/9router/pull/1144)
- Reuse Gemini CLI project ID for usage [`#1428`](https://github.com/nqdev-group/9router/pull/1428)
- feat(proxy-pools): add support for deno deploy relays and fix layout overflow issues in proxy pools dashboard [`#1437`](https://github.com/nqdev-group/9router/pull/1437)
- feat: Add Cloudflare Workers proxy deployer and pool integration [`#1360`](https://github.com/nqdev-group/9router/pull/1360)
- ﻿fix: strip empty Read pages argument in OpenAI-to-Claude translator [`#1354`](https://github.com/nqdev-group/9router/pull/1354)
- fix [`#1361`](https://github.com/nqdev-group/9router/pull/1361)
- fix(eslint): resolve setState-in-effect errors in dashboard components [`#1362`](https://github.com/nqdev-group/9router/pull/1362)
- fix(embeddings): forward Gemini output dimensions [`#1366`](https://github.com/nqdev-group/9router/pull/1366)
- fix: decode Composer cursor thinking output [`#1310`](https://github.com/nqdev-group/9router/pull/1310)
- fix(lang): emit selected locale on close [`#1234`](https://github.com/nqdev-group/9router/pull/1234)
- fix: enhance stall detection in stream handling for improved disconne… [`#1243`](https://github.com/nqdev-group/9router/pull/1243)
- fix(ui): resolve alias conflict for jina-reader in curl example [`#1241`](https://github.com/nqdev-group/9router/pull/1241)
- Add Vercel AI Gateway provider support [`#1183`](https://github.com/nqdev-group/9router/pull/1183)
- fix: normalize openclaw agent.model object form before .startsWith [`#1216`](https://github.com/nqdev-group/9router/pull/1216)
- feat(rtk): add Kiro format support for tool result compression [`#1194`](https://github.com/nqdev-group/9router/pull/1194)
- fix: keep usage details pagination inside mobile viewport [`#1218`](https://github.com/nqdev-group/9router/pull/1218)
- chore(deps): bump actions/setup-node from 5 to 6 [`#1174`](https://github.com/nqdev-group/9router/pull/1174)
- feat(open-sse): add blackbox provider with bb alias [`#1143`](https://github.com/nqdev-group/9router/pull/1143)
- Fix Cowork model selection and Windows CLI packaging [`#1129`](https://github.com/nqdev-group/9router/pull/1129)
- feat(ui): enhance model select modal UX and modal traffic lights [`#1111`](https://github.com/nqdev-group/9router/pull/1111)
- fix: update provider name retrieval for compatibility provider [`#1135`](https://github.com/nqdev-group/9router/pull/1135)
- feat(usage): đặt mặc định period là Today khi mở dashboard/usage [`#1141`](https://github.com/nqdev-group/9router/pull/1141)
- fix(ui): show API key row actions on mobile [`#1112`](https://github.com/nqdev-group/9router/pull/1112)
- feat: add DeepSeek V4 Pro effort aliases [`#950`](https://github.com/nqdev-group/9router/pull/950)
- feat(usage): add Today period option to Usage & Analytics [`#1063`](https://github.com/nqdev-group/9router/pull/1063)
- Fix issue with Ollama usage not being tracked and shown in 9router UI [`#1102`](https://github.com/nqdev-group/9router/pull/1102)
- fix(autostart): work on nvm + npm 9/10, actually register with launchctl (fixes #1082) [`#1104`](https://github.com/nqdev-group/9router/pull/1104)
- feat: add drag-and-drop reordering for combo models (#1056) [`#1108`](https://github.com/nqdev-group/9router/pull/1108)
- feat: add DeepSeek TUI as CLI tool in dashboard [`#1088`](https://github.com/nqdev-group/9router/pull/1088)
- fix(docker): restore /app/server.js in standalone build (#1064) [`#1067`](https://github.com/nqdev-group/9router/pull/1067)
- feat: add minimax tts support [`#1043`](https://github.com/nqdev-group/9router/pull/1043)
- fix(ui): replace browser confirm dialogs with ConfirmModal component [`#1060`](https://github.com/nqdev-group/9router/pull/1060)
- fix(tray): switch macOS/Linux tray to systray2 fork [`#1080`](https://github.com/nqdev-group/9router/pull/1080)
- Fix zoom controls contrast in topology view [`#1066`](https://github.com/nqdev-group/9router/pull/1066)
- Add OIDC dashboard auth [`#1020`](https://github.com/nqdev-group/9router/pull/1020)
- fix: handle permission denied when creating DATA_DIR [`#1005`](https://github.com/nqdev-group/9router/pull/1005)
- Add linux/arm64 support for docker image [`#979`](https://github.com/nqdev-group/9router/pull/979)
- Add Codex GPT 5.5 image support [`#991`](https://github.com/nqdev-group/9router/pull/991)
- fix: React hooks - variable declaration order and lazy initialization [`#1017`](https://github.com/nqdev-group/9router/pull/1017)
- feat(ui): add Done button to ModelSelectModal in combo creation [`#1031`](https://github.com/nqdev-group/9router/pull/1031)
- feat(mitm): implement dynamic linux cert resolution and NSS db injection [`#1010`](https://github.com/nqdev-group/9router/pull/1010)
- fix: normalize developer role to system for OpenAI-format providers [`#1011`](https://github.com/nqdev-group/9router/pull/1011)
- fix: respect PORT env in internal model-test fetch [`#1014`](https://github.com/nqdev-group/9router/pull/1014)
- fix(security): scope OAuth callback postMessage targets and re-enable TLS verification on DNS-bypass fetch [`#998`](https://github.com/nqdev-group/9router/pull/998)
- fix: improve dropdown text readability in dark theme on usage page [`#997`](https://github.com/nqdev-group/9router/pull/997)
- Update DeepSeek model pricing and add V4 Pro [`#938`](https://github.com/nqdev-group/9router/pull/938)
- fix: prevent cached settings responses [`#951`](https://github.com/nqdev-group/9router/pull/951)
- Add captain-definition for easy deployment on Caprover [`#954`](https://github.com/nqdev-group/9router/pull/954)
- fix: normalize Ollama Local provider input [`#955`](https://github.com/nqdev-group/9router/pull/955)
- docs: fix localized README links [`#956`](https://github.com/nqdev-group/9router/pull/956)
- docs: add Chinese translation of README [`#957`](https://github.com/nqdev-group/9router/pull/957)
- Refactor connection proxy configuration logic [`#970`](https://github.com/nqdev-group/9router/pull/970)
- Add Cloudflare Workers AI image generation [`#973`](https://github.com/nqdev-group/9router/pull/973)
- Fix compatible provider API key setup [`#925`](https://github.com/nqdev-group/9router/pull/925)
- fix(usage): filter totalRequests by selected time period [`#857`](https://github.com/nqdev-group/9router/pull/857)
- feat: add model deselection functionality in ComboFormModal and ComboDetailPage [`#889`](https://github.com/nqdev-group/9router/pull/889)
- feat: add audio input support for Gemini translation [`#913`](https://github.com/nqdev-group/9router/pull/913)
- feat: add support for configurable tunnel transport protocols [`#919`](https://github.com/nqdev-group/9router/pull/919)
- fix: resolve Kiro IDE MITM handler bugs for AWS CodeWhisperer translation [`#921`](https://github.com/nqdev-group/9router/pull/921)
- feat(cli-tools): add browser-local endpoint presets [`#819`](https://github.com/nqdev-group/9router/pull/819)
- fix(v1/models): include alias-backed models in listing [`#730`](https://github.com/nqdev-group/9router/pull/730)
- fix: strip stream_options for qwen non-streaming Claude Code requests (closes #557) [`#663`](https://github.com/nqdev-group/9router/pull/663)
- fix: update Qwen OAuth URLs from chat.qwen.ai to qwen.ai (closes #574) [`#687`](https://github.com/nqdev-group/9router/pull/687)
- fix: improve cloudflared exit code error messages for better debugging (closes #423) [`#659`](https://github.com/nqdev-group/9router/pull/659)
- fix: redirect ~/.9router to DATA_DIR in Docker to persist usage data across updates (closes #585) [`#658`](https://github.com/nqdev-group/9router/pull/658)
- fix: prevent SSE listener leak in console-logs stream [`#751`](https://github.com/nqdev-group/9router/pull/751)
- i18n: improve zh-CN translations [`#755`](https://github.com/nqdev-group/9router/pull/755)
- fix(mitm): gate sudo prompts on server platform [`#822`](https://github.com/nqdev-group/9router/pull/822)
- feat(codex): add review model quota support [`#836`](https://github.com/nqdev-group/9router/pull/836)
- Improve mobile layouts and restore Cloudflare provider [`#840`](https://github.com/nqdev-group/9router/pull/840)
- Add sticky round-robin for combos [`#831`](https://github.com/nqdev-group/9router/pull/831)
- Improve dashboard responsive layouts [`#805`](https://github.com/nqdev-group/9router/pull/805)
- Update providerModels.js [`#818`](https://github.com/nqdev-group/9router/pull/818)
- fix: strip output_config for MiniMax [`#820`](https://github.com/nqdev-group/9router/pull/820)
- Fix quota reset timestamp parsing [`#768`](https://github.com/nqdev-group/9router/pull/768)
- Add provider filter and expiry sorting to quota dashboard [`#769`](https://github.com/nqdev-group/9router/pull/769)
- Add TOOL_HOSTS constant for per-tool DNS mapping and integrate into MitmToolCard component [`#788`](https://github.com/nqdev-group/9router/pull/788)
- fix: granular reasoning_effort handling for Claude models [`#791`](https://github.com/nqdev-group/9router/pull/791)
- feat: add built-in Volcengine Ark provider support [`#741`](https://github.com/nqdev-group/9router/pull/741)
- fix: update Qwen OAuth URLs from chat.qwen.ai to qwen.ai (closes #572) [`#683`](https://github.com/nqdev-group/9router/pull/683)
- fix: force Agent mode in Cursor protobuf when User-Agent contains Claude Code (closes #643) [`#692`](https://github.com/nqdev-group/9router/pull/692)
- fix(github): preserve reasoning_effort for non-Claude models [`#713`](https://github.com/nqdev-group/9router/pull/713)
- fix: add clipboard fallback for navigator.clipboard unavailable contexts (closes #696) [`#699`](https://github.com/nqdev-group/9router/pull/699)
- fix: handle undefined navigator.clipboard with fallback [`#697`](https://github.com/nqdev-group/9router/pull/697)
- fix: keep play_arrow spinning instead of switching to sync/progress_activity [`#715`](https://github.com/nqdev-group/9router/pull/715)
- chore: refresh provider model list [`#723`](https://github.com/nqdev-group/9router/pull/723)
- fix: show quota auth expired message for Kiro social auth accounts (closes #588) [`#620`](https://github.com/nqdev-group/9router/pull/620)
- fix: enable Codex Apply/Reset buttons when CLI is installed (closes #591) [`#606`](https://github.com/nqdev-group/9router/pull/606)
- fix: show manual config option when Claude CLI detection fails (closes #589) [`#602`](https://github.com/nqdev-group/9router/pull/602)
- fix: ensure LocalMutex acquire returns release callback correctly (closes #569) [`#616`](https://github.com/nqdev-group/9router/pull/616)
- fix: add Blackbox AI as a supported provider (closes #599) [`#630`](https://github.com/nqdev-group/9router/pull/630)
- fix: add multi-model support for Factory Droid CLI tool (closes #521) [`#618`](https://github.com/nqdev-group/9router/pull/618)
- fix: show manual config option when OpenClaw detection fails (closes #579) [`#615`](https://github.com/nqdev-group/9router/pull/615)
- fix: strip temperature parameter for gpt-5.4 model (closes #536) [`#612`](https://github.com/nqdev-group/9router/pull/612)
- fix: add GLM-5 and MiniMax-M2.5 models to Kiro provider (closes #580) [`#611`](https://github.com/nqdev-group/9router/pull/611)
- * feat(kiro): wire aws identity center device flow into provider oauth [`#587`](https://github.com/nqdev-group/9router/pull/587)
- fix: add 5s timeout to fetchCompatibleModelIds and skip upstream connections [`#541`](https://github.com/nqdev-group/9router/pull/541)
- fix: only strip reasoning_content when content is non-empty [`#542`](https://github.com/nqdev-group/9router/pull/542)
- fix(security)(app): unauthenticated server shutdown endpoint enables d [`#519`](https://github.com/nqdev-group/9router/pull/519)
- fix: merge consecutive userInputMessages in openai-to-kiro translator (closes #510) [`#524`](https://github.com/nqdev-group/9router/pull/524)
- fix: update Cursor client version to 3.1.0 for Composer 2 compatibility [`#525`](https://github.com/nqdev-group/9router/pull/525)
- fix: strip reasoning_content from non-streaming responses (closes #509) [`#517`](https://github.com/nqdev-group/9router/pull/517)
- fix: make API key optional for ollama-local provider validation (closes #492) [`#493`](https://github.com/nqdev-group/9router/pull/493)
- Cập nhật /v1/models hỗ trợ OpenAI/Anthropic Compatible [`#497`](https://github.com/nqdev-group/9router/pull/497)
- fix(github): sync top-level copilotToken after proactive refresh [`#507`](https://github.com/nqdev-group/9router/pull/507)
- fix: pass isFree prop to ModelRow for custom models (closes #461) [`#480`](https://github.com/nqdev-group/9router/pull/480)
- fix: pass HOME explicitly in sudo inlineCmd so MITM server resolves correct data dir (closes #478) [`#482`](https://github.com/nqdev-group/9router/pull/482)
- fix: skip function_call items with empty/missing name to prevent Codex 400 error (closes #444) [`#487`](https://github.com/nqdev-group/9router/pull/487)
- fix: retry /responses endpoint when GitHub returns model not supported (closes #470) [`#488`](https://github.com/nqdev-group/9router/pull/488)
- fix: use which instead of command -v for openclaw CLI detection (closes #457) [`#489`](https://github.com/nqdev-group/9router/pull/489)
- feat(kilo): fetch free models from Kilo API + Windows build fixes [`#455`](https://github.com/nqdev-group/9router/pull/455)
- fix(claude-to-openai): emit closing &lt;/think&gt; tag instead of empty reasoning_content [`#454`](https://github.com/nqdev-group/9router/pull/454)
- fix: handle anthropic-compatible providers in BaseExecutor [`#428`](https://github.com/nqdev-group/9router/pull/428)
- fix: add missing clientId to github provider config for OAuth token refresh [`#442`](https://github.com/nqdev-group/9router/pull/442)
- feat: add OpenCode provider support [`#387`](https://github.com/nqdev-group/9router/pull/387)
- fix: inject placeholder message when Responses API input[] is empty (closes #389) [`#419`](https://github.com/nqdev-group/9router/pull/419)
- fix: map OpenAI image_url data URLs to Ollama images[] (closes #427) [`#432`](https://github.com/nqdev-group/9router/pull/432)
- fix: strip functionCall/functionResponse id and synthetic thoughtSignature for Vertex AI (closes #388) [`#414`](https://github.com/nqdev-group/9router/pull/414)
- fix: use better-sqlite3 for Cursor auto-import, drop sqlite3 CLI requirement (closes #395) [`#411`](https://github.com/nqdev-group/9router/pull/411)
- fix: add ?alt=sse to Vertex streaming URL (closes #388) [`#409`](https://github.com/nqdev-group/9router/pull/409)
- fix: add deprecation warning for Gemini CLI provider (closes #362) [`#406`](https://github.com/nqdev-group/9router/pull/406)
- fix: sanitize Gemini function names to meet API requirements (closes #369) [`#403`](https://github.com/nqdev-group/9router/pull/403)
- feat: expand OpenAI and Gemini static model lists [`#398`](https://github.com/nqdev-group/9router/pull/398)
- fix: detect Claude format for /v1/messages + sanitize tool descriptions [`#397`](https://github.com/nqdev-group/9router/pull/397)
- fix: clamp Responses API call_id to 64 chars (closes #393) [`#396`](https://github.com/nqdev-group/9router/pull/396)
- fix: support HTTP/HTTPS image URLs in Claude and Gemini translators [`#344`](https://github.com/nqdev-group/9router/pull/344)
- fix: test Codex connection against actual endpoint [`#347`](https://github.com/nqdev-group/9router/pull/347)
- fix: prevent duplicate model aliases on import [`#340`](https://github.com/nqdev-group/9router/pull/340)
- fix: skip disabled providers in combo fallback instead of returning 406 [`#336`](https://github.com/nqdev-group/9router/pull/336)
- Add combo round-robin strategy to distribute load across providers [`#390`](https://github.com/nqdev-group/9router/pull/390)
- fix: normalize finish_reason to 'tool_calls' when tool calls are present [`#379`](https://github.com/nqdev-group/9router/pull/379)
- fix: treat Kiro 400 'improperly formed request' as model-unavailable [`#386`](https://github.com/nqdev-group/9router/pull/386)
- docs: add Japanese README [`#385`](https://github.com/nqdev-group/9router/pull/385)
- fix: combo 503 cooldown wait before fallthrough + 406 on disabled creds [`#382`](https://github.com/nqdev-group/9router/pull/382)
- [fix] fix mitm for docker and enhance dockerfile [`#381`](https://github.com/nqdev-group/9router/pull/381)
- fix: add missing type:string to enum properties in Gemini tool schema translation [`#380`](https://github.com/nqdev-group/9router/pull/380)
- refactor: clean JSON schemas for Gemini function declarations [`#371`](https://github.com/nqdev-group/9router/pull/371)
- fix(cursor): remove sql.js dependency from auto-import route [`#368`](https://github.com/nqdev-group/9router/pull/368)
- fix(ui): restore provider assets and model availability endpoint [`#367`](https://github.com/nqdev-group/9router/pull/367)
- fix(usage): track lifetime request total beyond history cap [`#366`](https://github.com/nqdev-group/9router/pull/366)
- feat: add MiniMax M2.7 model support [`#357`](https://github.com/nqdev-group/9router/pull/357)
- Add optional modelID input for custom API Key Providers testing [`#315`](https://github.com/nqdev-group/9router/pull/315)
- feat: add confbox dependency and refactor TOML parsing in codex settings [`#282`](https://github.com/nqdev-group/9router/pull/282)
- update: claude code (cc) models pricing [`#275`](https://github.com/nqdev-group/9router/pull/275)
- fix(test): support cline and kilocode oauth checks [`#258`](https://github.com/nqdev-group/9router/pull/258)
- fix missing 'node-forge' in package.json [`#251`](https://github.com/nqdev-group/9router/pull/251)
- fix: show API Key Compatible providers in Antigravity CLI Tools model selector [`#241`](https://github.com/nqdev-group/9router/pull/241)
- Fix: Codex image support - convert image_url to input_image format [`#236`](https://github.com/nqdev-group/9router/pull/236)
- fix(auth): wire up dashboard auth guard as Next.js proxy [`#227`](https://github.com/nqdev-group/9router/pull/227)
- feat(gemini): convert OpenAI SSE to Gemini SSE format in /v1beta/models route [`#225`](https://github.com/nqdev-group/9router/pull/225)
- fix(translator): filter nameless hosted tools when converting Responses API to Chat format [`#222`](https://github.com/nqdev-group/9router/pull/222)
- fix: resolve GitHub Copilot 400 error for Claude models in Cursor IDE [`#220`](https://github.com/nqdev-group/9router/pull/220)
- feat: add API key visibility toggle in Endpoint dashboard [`#214`](https://github.com/nqdev-group/9router/pull/214)
- Update README.md [`#212`](https://github.com/nqdev-group/9router/pull/212)
- feat: update provider models(Cursor IDE) with new versions [`#204`](https://github.com/nqdev-group/9router/pull/204)
- feat: add database backup import/export [`#194`](https://github.com/nqdev-group/9router/pull/194)
- Fix: Add missing glm-cn provider definition for Web UI discovery [`#186`](https://github.com/nqdev-group/9router/pull/186)
- Add GitHub Actions workflow for Docker build and push [`#185`](https://github.com/nqdev-group/9router/pull/185)
- feat: implement real project ID fetching for Antigravity [`#170`](https://github.com/nqdev-group/9router/pull/170)
- Update 9router.png [`#168`](https://github.com/nqdev-group/9router/pull/168)
- docs: Add billing clarification to prevent user confusion [`#166`](https://github.com/nqdev-group/9router/pull/166)
- fix: improve cursor auto-import reliability on macOS [`#161`](https://github.com/nqdev-group/9router/pull/161)
- feat: add pause/resume functionality for API keys [`#158`](https://github.com/nqdev-group/9router/pull/158)
- feat: add API endpoint dimension to usage statistics dashboard [`#152`](https://github.com/nqdev-group/9router/pull/152)
- fix: correct token extraction for Claude non-streaming responses [`#131`](https://github.com/nqdev-group/9router/pull/131)
- feat: add Qwen3.5 Coder Model configuration [`#156`](https://github.com/nqdev-group/9router/pull/156)
- feat: Add GPT 5.3 Codex to GitHub Copilot [`#150`](https://github.com/nqdev-group/9router/pull/150)
- feat: Add Claude Sonnet 4.6 to GitHub Copilot [`#149`](https://github.com/nqdev-group/9router/pull/149)
- fix(open-sse): emit [DONE] in passthrough SSE mode [`#142`](https://github.com/nqdev-group/9router/pull/142)
- feat: add /v1/embeddings endpoint (OpenAI-compatible) [`#146`](https://github.com/nqdev-group/9router/pull/146)
- feat: implement lazy loading for UsagePage with suspense fallback [`#136`](https://github.com/nqdev-group/9router/pull/136)
- feat: add GPT 5.3 Codex Spark model to pricing and provider models [`#133`](https://github.com/nqdev-group/9router/pull/133)
- feat: add URL-based tab state persistence in usage page [`#129`](https://github.com/nqdev-group/9router/pull/129)
- feat: enhance disconnect handling and request tracking in chatCore.js [`#126`](https://github.com/nqdev-group/9router/pull/126)
- feat(responses): respect client streaming preference + string input support [`#121`](https://github.com/nqdev-group/9router/pull/121)
- feat(auth): add model-level rate limit locking for multi-bucket providers [`#120`](https://github.com/nqdev-group/9router/pull/120)
- fix(github): Implement dynamic fallback for Codex models requiring /responses endpoint [`#127`](https://github.com/nqdev-group/9router/pull/127)
-  feat(observability): add toggle for request detail recording [`#122`](https://github.com/nqdev-group/9router/pull/122)
- feat: add support for GLM 5 (if) [`#123`](https://github.com/nqdev-group/9router/pull/123)
- Fix/minimax cn cant use in combo [`#107`](https://github.com/nqdev-group/9router/pull/107)
- feat: add GPT 4o to GitHub Copilot provider [`#98`](https://github.com/nqdev-group/9router/pull/98)
- Fix incorrect model ID for Raptor Mini in GitHub provider [`#96`](https://github.com/nqdev-group/9router/pull/96)
- feat: add Claude Opus 4.6 to GitHub Copilot provider [`#97`](https://github.com/nqdev-group/9router/pull/97)
- Fix: incorrect Gemini 3 Flash ID for GitHub provider [`#94`](https://github.com/nqdev-group/9router/pull/94)
- Fix: incorrect Gemini 3 Pro ID for GitHub provider [`#95`](https://github.com/nqdev-group/9router/pull/95)
- Fix: Restore Claude Opus 4.5 entry in provider models [`#92`](https://github.com/nqdev-group/9router/pull/92)
- Add GitHub Actions workflow for Docker build and push [`#91`](https://github.com/nqdev-group/9router/pull/91)
- Add GLM Coding (China) provider with OpenAI-compatible API [`#83`](https://github.com/nqdev-group/9router/pull/83)
- Feature/ai observability dashboard [`#79`](https://github.com/nqdev-group/9router/pull/79)
- fix(dashboard): resolve 'Provider not found' for free providers [`#80`](https://github.com/nqdev-group/9router/pull/80)
- feat(translator): add thinking parameter support in OpenAI → Claude [`#77`](https://github.com/nqdev-group/9router/pull/77)
- feat: add Docker runtime setup and README docs updates [`#67`](https://github.com/nqdev-group/9router/pull/67)
- fix(auth): prevent auto-login after logout [`#68`](https://github.com/nqdev-group/9router/pull/68)
- fix(api-key): auto-validate on save to improve UX [`#65`](https://github.com/nqdev-group/9router/pull/65)
- feat(iflow): add kimi-k2.5 model support [`#64`](https://github.com/nqdev-group/9router/pull/64)
- feat: add provider icons to dashboard [`#41`](https://github.com/nqdev-group/9router/pull/41)
- feat(codex): Cursor compatibility + Next.js 16 proxy migration [`#35`](https://github.com/nqdev-group/9router/pull/35)

### Fixed

- fix(claude): forced tool_choice 400 on cc/ OAuth route [`#1592`](https://github.com/nqdev-group/9router/issues/1592)
- fix(qoder): allow qmodel_latest model key [`#1638`](https://github.com/nqdev-group/9router/issues/1638)
- Merge PR #1628: fix(model-test) route image and STT probes to their real endpoints [`#1628`](https://github.com/nqdev-group/9router/issues/1628)
- fix: strip empty Read pages argument in OpenAI-to-Claude translator (#1354) [`#1278`](https://github.com/nqdev-group/9router/issues/1278)
- fix(oauth): align antigravity OAuth metadata with official client headers [`#1226`](https://github.com/nqdev-group/9router/issues/1226)
- fix(autostart): work on nvm + npm 9/10, actually register with launchctl (fixes #1082) (#1104) [`#1082`](https://github.com/nqdev-group/9router/issues/1082) [`#1082`](https://github.com/nqdev-group/9router/issues/1082)
- fix(docker): restore /app/server.js in standalone build (#1064) (#1067) [`#1064`](https://github.com/nqdev-group/9router/issues/1064)
- fix(tray): switch macOS/Linux tray to systray2 fork (#1080) [`#1079`](https://github.com/nqdev-group/9router/issues/1079)
- # v0.4.30 (2026-05-11) [`#773`](https://github.com/nqdev-group/9router/issues/773)
- fix: normalize developer role to system for OpenAI-format providers (#1011) [`#773`](https://github.com/nqdev-group/9router/issues/773)
- feat: add audio input support for Gemini translation (#913) [`#912`](https://github.com/nqdev-group/9router/issues/912)
- fix: strip stream_options for qwen non-streaming Claude Code requests (closes #557) (#663) [`#557`](https://github.com/nqdev-group/9router/issues/557)
- fix: update Qwen OAuth URLs from chat.qwen.ai to qwen.ai (closes #574) (#687) [`#574`](https://github.com/nqdev-group/9router/issues/574)
- fix: improve cloudflared exit code error messages for better debugging (closes #423) (#659) [`#423`](https://github.com/nqdev-group/9router/issues/423)
- fix: redirect ~/.9router to DATA_DIR in Docker to persist usage data across updates (closes #585) (#658) [`#585`](https://github.com/nqdev-group/9router/issues/585)
- fix(ollama-local): support custom host URL for remote Ollama servers (closes #578) [`#578`](https://github.com/nqdev-group/9router/issues/578)
- fix: update Qwen OAuth URLs from chat.qwen.ai to qwen.ai (closes #572) (#683) [`#572`](https://github.com/nqdev-group/9router/issues/572) [`#598`](https://github.com/nqdev-group/9router/issues/598) [`#578`](https://github.com/nqdev-group/9router/issues/578) [`#681`](https://github.com/nqdev-group/9router/issues/681)
- fix: force Agent mode in Cursor protobuf when User-Agent contains Claude Code (closes #643) (#692) [`#643`](https://github.com/nqdev-group/9router/issues/643)
- fix: add clipboard fallback for navigator.clipboard unavailable contexts (closes #696) (#699) [`#696`](https://github.com/nqdev-group/9router/issues/696)
- fix: auto-build Docker image on tag push (closes #547) [`#547`](https://github.com/nqdev-group/9router/issues/547)
- fix(github): strip thinking/reasoning_effort for Copilot chat completions (closes #623) [`#623`](https://github.com/nqdev-group/9router/issues/623)
- fix: show quota auth expired message for Kiro social auth accounts (closes #588) (#620) [`#588`](https://github.com/nqdev-group/9router/issues/588) [`#521`](https://github.com/nqdev-group/9router/issues/521) [`#588`](https://github.com/nqdev-group/9router/issues/588)
- fix: enable Codex Apply/Reset buttons when CLI is installed (closes #591) (#606) [`#591`](https://github.com/nqdev-group/9router/issues/591)
- fix: show manual config option when Claude CLI detection fails (closes #589) (#602) [`#589`](https://github.com/nqdev-group/9router/issues/589)
- fix: ensure LocalMutex acquire returns release callback correctly (closes #569) (#616) [`#569`](https://github.com/nqdev-group/9router/issues/569)
- fix(codex): await image URL fetches before sending to upstream (closes #575) [`#575`](https://github.com/nqdev-group/9router/issues/575)
- fix: strip enumDescriptions from tool schema in antigravity-to-openai (closes #566) [`#566`](https://github.com/nqdev-group/9router/issues/566)
- fix: add Blackbox AI as a supported provider (closes #599) (#630) [`#599`](https://github.com/nqdev-group/9router/issues/599) [`#521`](https://github.com/nqdev-group/9router/issues/521) [`#599`](https://github.com/nqdev-group/9router/issues/599)
- fix: add multi-model support for Factory Droid CLI tool (closes #521) (#618) [`#521`](https://github.com/nqdev-group/9router/issues/521)
- fix: show manual config option when OpenClaw detection fails (closes #579) (#615) [`#579`](https://github.com/nqdev-group/9router/issues/579)
- fix: strip temperature parameter for gpt-5.4 model (closes #536) (#612) [`#536`](https://github.com/nqdev-group/9router/issues/536)
- fix: add GLM-5 and MiniMax-M2.5 models to Kiro provider (closes #580) (#611) [`#580`](https://github.com/nqdev-group/9router/issues/580)
- fix: merge consecutive userInputMessages in openai-to-kiro translator (closes #510) (#524) [`#510`](https://github.com/nqdev-group/9router/issues/510)
- fix: strip reasoning_content from non-streaming responses (closes #509) (#517) [`#509`](https://github.com/nqdev-group/9router/issues/509)
- fix: make API key optional for ollama-local provider validation (closes #492) (#493) [`#492`](https://github.com/nqdev-group/9router/issues/492)
- fix: pass isFree prop to ModelRow for custom models (closes #461) (#480) [`#461`](https://github.com/nqdev-group/9router/issues/461)
- fix: pass HOME explicitly in sudo inlineCmd so MITM server resolves correct data dir (closes #478) (#482) [`#478`](https://github.com/nqdev-group/9router/issues/478)
- fix: skip function_call items with empty/missing name to prevent Codex 400 error (closes #444) (#487) [`#444`](https://github.com/nqdev-group/9router/issues/444)
- fix: retry /responses endpoint when GitHub returns model not supported (closes #470) (#488) [`#470`](https://github.com/nqdev-group/9router/issues/470)
- fix: use which instead of command -v for openclaw CLI detection (closes #457) (#489) [`#457`](https://github.com/nqdev-group/9router/issues/457)
- fix(gemini): preserve thoughtSignature via tool_call ID smuggling + fix ELOCKED mutex [`#450`](https://github.com/nqdev-group/9router/issues/450)
- feat(claude-code): spoof TLS fingerprint and stabilize headers for Anthropic [`#433`](https://github.com/nqdev-group/9router/issues/433)
- feat: add OpenCode provider support (#387) [`#378`](https://github.com/nqdev-group/9router/issues/378)
- fix: use project-scoped Vertex URL for SA JSON auth and add ?alt=sse for streaming (closes #388) [`#388`](https://github.com/nqdev-group/9router/issues/388)
- fix: inject placeholder message when Responses API input[] is empty (closes #389) (#419) [`#389`](https://github.com/nqdev-group/9router/issues/389)
- fix: map OpenAI image_url data URLs to Ollama images[] (closes #427) (#432) [`#427`](https://github.com/nqdev-group/9router/issues/427)
- fix: strip functionCall/functionResponse id and synthetic thoughtSignature for Vertex AI (closes #388) (#414) [`#388`](https://github.com/nqdev-group/9router/issues/388)
- fix: use better-sqlite3 for Cursor auto-import, drop sqlite3 CLI requirement (closes #395) (#411) [`#395`](https://github.com/nqdev-group/9router/issues/395)
- fix: add ?alt=sse to Vertex streaming URL (closes #388) (#409) [`#388`](https://github.com/nqdev-group/9router/issues/388)
- fix: add deprecation warning for Gemini CLI provider (closes #362) (#406) [`#362`](https://github.com/nqdev-group/9router/issues/362)
- fix: sanitize Gemini function names to meet API requirements (closes #369) (#403) [`#369`](https://github.com/nqdev-group/9router/issues/369)
- feat: expand OpenAI and Gemini static model lists (#398) [`#179`](https://github.com/nqdev-group/9router/issues/179)
- fix: clamp Responses API call_id to 64 chars (closes #393) (#396) [`#393`](https://github.com/nqdev-group/9router/issues/393)
- fix(iflow): inject stream_options for usage data in streaming [`#74`](https://github.com/nqdev-group/9router/issues/74)
- fix(cursor): verify Cursor installation on Linux before auto-import [`#313`](https://github.com/nqdev-group/9router/issues/313)
- fix: skip disabled providers in combo fallback instead of returning 406 (#336) [`#334`](https://github.com/nqdev-group/9router/issues/334)
- fix: externalize better-sqlite3 for Next.js standalone builds [`#243`](https://github.com/nqdev-group/9router/issues/243) [`#184`](https://github.com/nqdev-group/9router/issues/184)
- fix: treat Kiro 400 'improperly formed request' as model-unavailable (#386) [`#384`](https://github.com/nqdev-group/9router/issues/384)
- fix: combo 503 cooldown wait before fallthrough + 406 on disabled creds (#382) [`#335`](https://github.com/nqdev-group/9router/issues/335) [`#334`](https://github.com/nqdev-group/9router/issues/334)
- fix: add missing type:string to enum properties in Gemini tool schema translation (#380) [`#359`](https://github.com/nqdev-group/9router/issues/359)
- fix: externalize better-sqlite3 for Next.js standalone builds [`#243`](https://github.com/nqdev-group/9router/issues/243)
- feat(auth): add model-level rate limit locking for multi-bucket providers (#120) [`#110`](https://github.com/nqdev-group/9router/issues/110)

### Commits

- Feat : Gitbook [`fd92af7`](https://github.com/nqdev-group/9router/commit/fd92af77a068d1778f954c34cf9bf46600c3dfbd)
- Initial commit [`3857598`](https://github.com/nqdev-group/9router/commit/3857598de4ef88bda862314f6cbc89e37280de3e)
- TUI Source [`58788a0`](https://github.com/nqdev-group/9router/commit/58788a0d314a003d16e036a5831960dbca060279)
- Add multi-language support for UI [`11c6b0c`](https://github.com/nqdev-group/9router/commit/11c6b0c42fb2321a3c834a498676c83523d7d3d0)
- feat: enhance translator functionality and UI [`d347de8`](https://github.com/nqdev-group/9router/commit/d347de8092913ea987a663fd7f9db7a01c44bc00)
- feat(proxy): add proxy pool and per-connection binding + strictProxy support [`880f4ec`](https://github.com/nqdev-group/9router/commit/880f4eca910637b144a0f4913de632344fee4162)
- Refactor config [`b0c6b61`](https://github.com/nqdev-group/9router/commit/b0c6b6139851b7327667ef81f9b77d973df7b9c4)
- Fix : Add custom to model selector [`d9dad5b`](https://github.com/nqdev-group/9router/commit/d9dad5bcf3769e74bc872d30561f6f34a52d8cd7)
- refactor: replace better-sqlite3 with lowdb for request details storage [`8c8eeec`](https://github.com/nqdev-group/9router/commit/8c8eeecc7014dede0e35a33326b1b47c55f375dd)
- Feat : Auto restart after crash [`adae260`](https://github.com/nqdev-group/9router/commit/adae2605bf6126122102a0b4a04242c77ebf321d)
- feat(ollama): Enhance Ollama support by adding new models, updating API format handling, and integrating translation functionality. [`83d94da`](https://github.com/nqdev-group/9router/commit/83d94daa82679e614a00d2afb114a1329d5a8386)
- Feat : Add support for the new "alicode-intl" provider [`7582247`](https://github.com/nqdev-group/9router/commit/758224749d023c7d8c481cc7c086f598ff25f7b0)
- feat: Add Google Cloud Vertex AI provider support (vertex, vertex-partner) [`39f651f`](https://github.com/nqdev-group/9router/commit/39f651f5be8fee1ebf72a4f85fb6cbb36112decc)
- Fix MITM window [`62d7e61`](https://github.com/nqdev-group/9router/commit/62d7e61907c816f2cd966f6a09c8367069f64826)
- Fix : MITM [`1dd5d60`](https://github.com/nqdev-group/9router/commit/1dd5d60724648fde06cbe55fc8b8e4ab865ff400)
- refactor(providers): simplify proxy UX — hover button + inline dropdown, remove selection toolbar [`076e70c`](https://github.com/nqdev-group/9router/commit/076e70c5a6fa9ba962ee76e0f83b924147c568fc)
- feat(ollama): Add Ollama provider support with models and configuration, including API endpoints and UI updates. [`32e3980`](https://github.com/nqdev-group/9router/commit/32e3980a13b48ae395389ecf12125ca2c0a129ad)
- feat:  - Introduced per-provider strategy overrides in settings, allowing for more flexible connection management. [`fe49b61`](https://github.com/nqdev-group/9router/commit/fe49b61dfbda597017ddfa6abfe54b0916c1e4fc)
- feat: Add OpenAI API response_format support for structured JSON output [`75270ea`](https://github.com/nqdev-group/9router/commit/75270ea75570e92c9b064d222b302336f0c43087)
- refactor: Fix MITM [`b98f4ce`](https://github.com/nqdev-group/9router/commit/b98f4ce20ed3fc0e228e47e0326bccd1361b0c7a)
- fix: custom model compatibility with antigravity/mitm (PR #250) [`97860a0`](https://github.com/nqdev-group/9router/commit/97860a06298ab9d31856ce7e4907f59f12c908d8)
- feat(usage): claude quota tracker [`f1bf027`](https://github.com/nqdev-group/9router/commit/f1bf027c68ca9bbc24c5fcdebf9b2ffc7698489c)
- feat(chat): Enhance bypass handling and introduce CC filter naming feature [`373b10e`](https://github.com/nqdev-group/9router/commit/373b10ebb52115bd34629bc4c2ba5a95d9788e66)
- chore: Delete the proxy pools migration API route. [`9bca03b`](https://github.com/nqdev-group/9router/commit/9bca03bff7bde93610980a567f9681eca17ae199)
- Update ReadMe [`0cf78fd`](https://github.com/nqdev-group/9router/commit/0cf78fd76aaba7966b990ff4bdc14923f3852759)
- refactor(claude-to-openai): simplify usage token calculation and final chunk assembly [`6437a1c`](https://github.com/nqdev-group/9router/commit/6437a1c55fb6907663e718697ad69b8647696b21)
- ci: add Docker build and publish workflow [`aa2b83e`](https://github.com/nqdev-group/9router/commit/aa2b83e1f6b6c7a05bb4a405c547cb37b4da0a1b)
- fix(cline): use workos auth token shape [`29f3e18`](https://github.com/nqdev-group/9router/commit/29f3e1894e207d704df4de05f406d0fa3a51aede)
- feat(memory-management): Introduce MEMORY_CONFIG for session and DNS management, including session TTL, cleanup intervals, and proxy dispatcher limits. [`8223c87`](https://github.com/nqdev-group/9router/commit/8223c87988d4a6b9b7d5187b505e89118b6a3999)
- Refactor error logging to provide clearer context on provider failures [`f264bb9`](https://github.com/nqdev-group/9router/commit/f264bb9a23c548c0e0c0a7f6cb0597dc03873171)
- feat(kimi-coding): Added Kimi Coding to the list of supported OAuth providers with specific configuration. [`a224f68`](https://github.com/nqdev-group/9router/commit/a224f68e5cac5c2f847a29ba9de3a3c1ea25bdd0)
- feat(gemini-cli): add proper User-Agent and X-Goog-Api-Client headers [`06a5307`](https://github.com/nqdev-group/9router/commit/06a53071609be190563d893742bf4340f5b5fb6b)
- fix: SSE data: [DONE] sentinel + response_format for Claude via GitHub [`754a24d`](https://github.com/nqdev-group/9router/commit/754a24d52a1cba5228a2e4288b93422be54aaa58)
- fix(proxyTest): improve error handling and update default test URL [`8940512`](https://github.com/nqdev-group/9router/commit/89405125e6c2320bb2bc19ae06b3b362d5cb8feb)
- Update Antigravity provider config and headers [`2bec2e1`](https://github.com/nqdev-group/9router/commit/2bec2e1801eed37a1b5b70b6ea4b6af3a410ec3c)
- feat: AI SDK compatibility - Accept header & JSON markdown stripping [`d12b14f`](https://github.com/nqdev-group/9router/commit/d12b14f411534c9f86bd7cb95ffd9bed8367dc59)
- feat: Add support for local Ollama Local provider [`399adca`](https://github.com/nqdev-group/9router/commit/399adca63d549661514d7cb47968cb03ef9d889f)
- Make API key optional for MITM server [`6546b16`](https://github.com/nqdev-group/9router/commit/6546b162cc4ba96f6ec4fb7e6160e0bb0e299fa4)
- ci: add optimized Docker publish workflow from PR #281 [`2887b1d`](https://github.com/nqdev-group/9router/commit/2887b1d5a16e3580280049c6d8c7cfbbc55d6511)
- feat: implement usage tracking for AI requests [`9c3d6f4`](https://github.com/nqdev-group/9router/commit/9c3d6f4ad8f0b31f3555e4144cacd3a1c3e3f26b)
- Update jsconfig.json and package.json to correct open-sse path references from relative to local directory. [`e35421b`](https://github.com/nqdev-group/9router/commit/e35421beb16d437bda443296b7bb83c97f4dc2eb)
- Fix Antigravity [`87c8f7f`](https://github.com/nqdev-group/9router/commit/87c8f7f22985728917403c077680bcd04d9e50cf)
- feat(db): migrate from lowdb to SQLite with repos pattern [`bee8dad`](https://github.com/nqdev-group/9router/commit/bee8dad946cdc741d7a86eecb183f048973ced1a)
- Feat : Skills [`9c6be62`](https://github.com/nqdev-group/9router/commit/9c6be62a54b6b049869b30f8cfb63d24f140300b)
- Enhance token refresh functionality across multiple executors [`8f81363`](https://github.com/nqdev-group/9router/commit/8f813636752a9dd25057afecbc80efb5f9585e44)
- feat: add STT support, Gemini TTS, and expand usage tracking [`d4bc42e`](https://github.com/nqdev-group/9router/commit/d4bc42e1f593802e78f28d3aa36b37dc0d4262d8)
- Fixed Codex [`adf57aa`](https://github.com/nqdev-group/9router/commit/adf57aa0c9234ad66a5e220f2f79a8ae74b5e800)
- feat(cursor): Integrate Cursor IDE support with OAuth import token flow [`137f315`](https://github.com/nqdev-group/9router/commit/137f315bec066a71ebd484f41b30d6b33e1f085d)
- Fix codex cache session id [`3b1a608`](https://github.com/nqdev-group/9router/commit/3b1a608e8d92fc533b395c0706cf6d58fadd74f3)
- Add Providers [`3debf84`](https://github.com/nqdev-group/9router/commit/3debf84b9a9ede68c63b30ca1d754db49ccc37d3)
- - Cowork: ComboFormModal [`5c62e73`](https://github.com/nqdev-group/9router/commit/5c62e73cc6ca986767b7f8cd55b85de1ab1281fe)
- Feat : tts [`3c96e8d`](https://github.com/nqdev-group/9router/commit/3c96e8d6d176273ce059d9eeb84269beb2420333)
- feat(cursor): Add cursor Provider [`0a026c7`](https://github.com/nqdev-group/9router/commit/0a026c7af6230b4e173560c3b2799d67facb3c98)
- Refactor error handling to config-driven approach with centralized error rules [`b669b6f`](https://github.com/nqdev-group/9router/commit/b669b6ffc1670ef03a199195a8da607eac84552b)
- Feat Kiro OAuth, Fix Codex [`26b61e5`](https://github.com/nqdev-group/9router/commit/26b61e5fbb09100ec1ee9b50d65f29228f390280)
- refactor: restructure translator from from-openai/to-openai to request/response folders [`1853350`](https://github.com/nqdev-group/9router/commit/18533505efeabfb0c4c65d66751f3efe489a875d)
- - Refines the overall structure of the CLI tools and MITM server functionalities. [`573b0f0`](https://github.com/nqdev-group/9router/commit/573b0f02417a21cf427983a43626bb5838503b5d)
- Feat : Tailscale [`ed17a8f`](https://github.com/nqdev-group/9router/commit/ed17a8ffacce5ac3cd7aecd509633d7c9bc6b69f)
- Feat : Setup cloudflare worker for cloud endpoint [`102c193`](https://github.com/nqdev-group/9router/commit/102c1931120421824b30a5d965b4239a54fa0ff5)
- feat : [`0baa299`](https://github.com/nqdev-group/9router/commit/0baa2997221371a7663765c0777aca0696c95316)
- feat: v0.4.41 - cli-tools UI redesign + jcode integration [`2190ff0`](https://github.com/nqdev-group/9router/commit/2190ff062dcca45d6a80af37576202931ea9e5e0)
- ok [`79342c0`](https://github.com/nqdev-group/9router/commit/79342c0c3e2d6f27586796c29e32822eefb2b1ca)
- Refactor global styles and enhance MITM functionality [`6cdf40b`](https://github.com/nqdev-group/9router/commit/6cdf40b44eb1dc1c4f9fae14a0c09ee5afff4979)
- feat: Added McpMarketplaceModal to the CoworkToolCard for improved plugin management. [`145f588`](https://github.com/nqdev-group/9router/commit/145f588cc000fc20cdd9dc25ef8219a5df3a41f4)
- feat: add ProviderDetailPage component for managing provider connections and models [`484e702`](https://github.com/nqdev-group/9router/commit/484e7025e85474e42a26f06158ce8c4bba8efc40)
- - Refactor chatCore.js to streamline imports and remove unused functions. [`5954b8f`](https://github.com/nqdev-group/9router/commit/5954b8f4eb9f5e4c20559fcbd9ea34beb06b16b1)
- feat(antigravity): integrate Antigravity tool with MITM support and update CLI tools [`2e854bd`](https://github.com/nqdev-group/9router/commit/2e854bd4c99c2ea33aa48ac89f74389bd4aa3240)
- Revert "feat(request-details): implement observability settings and enhance request detail tracking" [`388389c`](https://github.com/nqdev-group/9router/commit/388389c97257baa2743564ccd8286d4eb6b63f26)
- feat(request-details): implement observability settings and enhance request detail tracking [`cbabf55`](https://github.com/nqdev-group/9router/commit/cbabf5547cdfb417015676408c51d56770e1b8a1)
- feat(qoder): port Kiro-style provider integration with COSY signing [`a6fd846`](https://github.com/nqdev-group/9router/commit/a6fd84691b0347d2fd208dda94da108ab17aa18b)
- Feature : RTK compress [`8de9aae`](https://github.com/nqdev-group/9router/commit/8de9aae90c4c2dd7de76cf122b0d7ef923fa2fbf)
- feat: add support for Grok Web and Perplexity Web providers [`abb04c5`](https://github.com/nqdev-group/9router/commit/abb04c536693c435b792c463e36a57aa549c92e9)
- # v0.4.29 (2026-05-10) [`7ad538b`](https://github.com/nqdev-group/9router/commit/7ad538bcf248a563e78f984bf64e66286058917f)
- Merge PR #1300: tailscale Windows fix, quota pagination, SSE abort handling [`6b0dc09`](https://github.com/nqdev-group/9router/commit/6b0dc0923996e091a7a3a08d4947c6a54f377922)
- docs: add Russian README, remove unused testFromFile script [`4758a00`](https://github.com/nqdev-group/9router/commit/4758a00b44c00878810322e6aed32133d4701655)
- feat: Add OpenAI-compatible provider nodes [`0a28f9f`](https://github.com/nqdev-group/9router/commit/0a28f9f924d2dc53027a910679ee3cff3e63a59c)
- chore: add buildOutput RTK filter, drop legacy cloud sync, internal cleanup [`3cca225`](https://github.com/nqdev-group/9router/commit/3cca2252a67fdd2d28ef2dd1dc8b84ed1c4f7fef)
- Fix Model Price [`341a1c6`](https://github.com/nqdev-group/9router/commit/341a1c649052b8fa21439f7d4fe7d42880d615e5)
- feat(executors):  Improved UI components for displaying provider limits and usage statistics in the dashboard. [`32aefe5`](https://github.com/nqdev-group/9router/commit/32aefe5a76fbe7588d9bca72682e4992a70c38f8)
- Refactor Tunnel [`b876e02`](https://github.com/nqdev-group/9router/commit/b876e0225aad98ff441b5266634c0538e4935dd9)
- - Updated Kiro OAuth configuration [`31cc79a`](https://github.com/nqdev-group/9router/commit/31cc79ab23d80921e78e7243314662fa8e0601d4)
- Enhance image and embedding provider support [`0b8bed5`](https://github.com/nqdev-group/9router/commit/0b8bed5793c7a7c9beb7a5db7368720907f61ebc)
- feat(cli-tools): update CLI tools and add new models [`a2122e3`](https://github.com/nqdev-group/9router/commit/a2122e3e487eb9886fb75a27e44b1a444c6bc821)
- feat(xai): add xAI Grok provider with OAuth + API key auth + image [`d976f4c`](https://github.com/nqdev-group/9router/commit/d976f4cc876b989359ac5ab618f4c79060bc82d3)
- feat: add OpenCode Go provider and support for custom models [`45731ae`](https://github.com/nqdev-group/9router/commit/45731ae639b00eb0e207a031ca294dd265b7bd9f)
- feat: add runtime i18n with English, Vietnamese, and Simplified Chinese support [`afb83f4`](https://github.com/nqdev-group/9router/commit/afb83f4563409092ecaedfcb27ece3e46d9ec20c)
- feat: add GLM Coding (China) provider and Usage by API Keys statistics [`1ae4e31`](https://github.com/nqdev-group/9router/commit/1ae4e311b7c18b0d826495f5d48c4cb222ed11c8)
- refactor: streamline provider interactions and enhance error handling [`f46ff42`](https://github.com/nqdev-group/9router/commit/f46ff42cb31a0dc7a48396276f39cf4bfa48ec43)
- Feat : embedding dev [`5448eed`](https://github.com/nqdev-group/9router/commit/5448eedbdd68154cce3f17eb7cd19b81246688e1)
- Fix : usage convert [`e6e44ac`](https://github.com/nqdev-group/9router/commit/e6e44ac364c978415788ee859f0a402152c5dc2c)
- feat(ui): add Basic Chat interface for testing models [`6b0cced`](https://github.com/nqdev-group/9router/commit/6b0cced8842f554256aed86d4c4aeb830ea3bb59)
- test(translator): add data-driven coverage, bug-exposing cases, and real provider smoke [`281f292`](https://github.com/nqdev-group/9router/commit/281f292f63b605a8b08f21f19834a3dbbc92454d)
- Fix bug Tunnel [`d21f7aa`](https://github.com/nqdev-group/9router/commit/d21f7aaadc39d8ab4d4365049ca0c9867e568dfe)
- feat(usage): implement cost tracking backend and pricing configuration [`a36afaa`](https://github.com/nqdev-group/9router/commit/a36afaa85e640b383af9140f30e1e4a8bbcaef8b)
- feat: OpenAI compatibility improvements & build fixes [`d9b8e48`](https://github.com/nqdev-group/9router/commit/d9b8e487254d42610d2dbb970f67be3c8d2b41b2)
- feat: cherry-pick PR #183 — multi-provider support, PWA, dynamic models, UI improvements [`07717ba`](https://github.com/nqdev-group/9router/commit/07717bad60798d27dacbec72f27039bf256be851)
- https://github.com/decolua/9router/pull/1167 [`4a575f2`](https://github.com/nqdev-group/9router/commit/4a575f21a2ef315ddd2b0b6969b07d6190657a24)
- feat: add GitLab Duo and CodeBuddy support, update observability settings [`abbf8ec`](https://github.com/nqdev-group/9router/commit/abbf8ec86f294cfaa87c60fb5f51ee741eed4f5b)
- Enhance token refresh logic and improve MITM server handling [`4ba546a`](https://github.com/nqdev-group/9router/commit/4ba546afe7e1bd29fafd2f2d17bad50d01f1855c)
- # v0.4.36 (2026-05-13) [`7ccf8c5`](https://github.com/nqdev-group/9router/commit/7ccf8c5e84e9d2af964af82d12d6aa623ed4a474)
- - Added Hermes tool to CLI tools and updated related components. [`368f4c3`](https://github.com/nqdev-group/9router/commit/368f4c3e7fad00e64caf57843c9230ae53af226e)
- Fix MITM on window [`833069c`](https://github.com/nqdev-group/9router/commit/833069caacac5af2195dbadc9546b56fd52efc96)
- - Introduce default MITM router base URL and update related components to handle it. [`d84489d`](https://github.com/nqdev-group/9router/commit/d84489dba44bd8152dd89fab468da3ff65b69466)
- Update Readme [`814e02a`](https://github.com/nqdev-group/9router/commit/814e02ae311813d0fdb131d4ccae2071d90fd941)
- feat(docker): add Docker setup, environment examples, and architecture docs [`5e4a15b`](https://github.com/nqdev-group/9router/commit/5e4a15bb0cf18adacbbea02b20b4aaf9dd3bc25b)
- Enhance layout [`8897df5`](https://github.com/nqdev-group/9router/commit/8897df50363e9c5650046c2c6fcec5a4e6979aef)
- feat: Add Anthropic Compatible provider support [`da5bdef`](https://github.com/nqdev-group/9router/commit/da5bdef4cbc03103b298b989871b8864e0330429)
- - Updated `markAccountUnavailable` function to accept `resetsAtMs` for precise cooldown management. [`030fb34`](https://github.com/nqdev-group/9router/commit/030fb34f886343fc86293f1cab1787225f643056)
- feat(ui): add cost tracking to usage dashboard and pricing settings [`f302c88`](https://github.com/nqdev-group/9router/commit/f302c88dfbf46eab0fc225023d8354a9405cf0bb)
- chore: release v0.4.27 [`b39eb61`](https://github.com/nqdev-group/9router/commit/b39eb61c33e28c0e9e307e8c25763835198eaaaf)
- chore: add proper-lockfile for safe database read/write operations and implement retry logic for file access [`8759545`](https://github.com/nqdev-group/9router/commit/875954526064ce8a1275d9d5cef3fdb671d541ab)
- Fix codex [`a648a42`](https://github.com/nqdev-group/9router/commit/a648a42bdb8a4a25e174157dc663bc91ddf54c0a)
- Update version to 0.4.9, enhance README with Trendshift badge, and add new embedding models to providerModels.js. Refactor TTS handling to support additional providers and improve API key validation for media providers. [`512e3de`](https://github.com/nqdev-group/9router/commit/512e3de371f6b6a9b1012380bd72bbdcdd475eed)
- Fix : MITM [`f4e08fc`](https://github.com/nqdev-group/9router/commit/f4e08fcd1619f840d5d9be6c0b942a423a20587b)
- fix(codex): durable OAuth refresh lifecycle [`c233c7c`](https://github.com/nqdev-group/9router/commit/c233c7c8fc64d76dc8e171b91df3c986e10739dc)
- Add marked package, update Qwen executor for OAuth handling, and enhance changelog styles [`75c4598`](https://github.com/nqdev-group/9router/commit/75c4598da08e4440ddcfd2e38576e59db68fb54f)
- Fix bug [`307be3b`](https://github.com/nqdev-group/9router/commit/307be3b63d4df98b17df4293445654673535dfdb)
- Enhance provider models and chat handling with new thinking configurations [`4c28a16`](https://github.com/nqdev-group/9router/commit/4c28a1671db54252b6e0410da78353dcb6e458a8)
- fix(mitm): Kiro binary EventStream crash + add models & TTS tool filtering [`0850f0a`](https://github.com/nqdev-group/9router/commit/0850f0a4705001b09b212c50d20ef4b6ae1f774e)
- - Added functionality to check token expiration and key valid [`686585d`](https://github.com/nqdev-group/9router/commit/686585d57668d6ac089ebb59ac6bb059bc318bb3)
- Update Readme [`f47dfcd`](https://github.com/nqdev-group/9router/commit/f47dfcde1c862047f9c23c32d2ce0fc09c4bb6da)
- fix(qoder): address review findings [`620b59c`](https://github.com/nqdev-group/9router/commit/620b59ca0b3b2966d8e7b0eb666a1d857bce44f8)
- Refactor CLI tool cards to use BaseUrlSelect component and pass additional tunnel and Tailscale configuration [`6344abc`](https://github.com/nqdev-group/9router/commit/6344abcf8d0e703653ac0d3c410746da3ea67cc8)
- Add OpenCode CLI [`03fc685`](https://github.com/nqdev-group/9router/commit/03fc685f72f6cb8355a0e83d9aa5f0e979ba8dc2)
- feat: Update response handling and logging for improved usage tracking [`df0e1d6`](https://github.com/nqdev-group/9router/commit/df0e1d6485ce0132ae40d46e3656252c1a611a6e)
- feat(cli-tools): add OpenCode tool integration to CLI Tools page [`38ded5c`](https://github.com/nqdev-group/9router/commit/38ded5c62f50b945e577cd5116c5de9f4bf56a95)
- Fix bug [`9708541`](https://github.com/nqdev-group/9router/commit/9708541f6d593fcd378ffbe1f1fa0a4e6232442d)
- feat(proxy): add outbound HTTP proxy support for OAuth + provider requests [`5a015e5`](https://github.com/nqdev-group/9router/commit/5a015e5b4d5dc00cf6ea722529496dea11f49747)
- Fix model test routing for image providers [`e414975`](https://github.com/nqdev-group/9router/commit/e414975d0c8d8f11a7d09f8a020772ef6afdc7c7)
- feat: enhance CommandCode integration with improved message handling [`ad661c1`](https://github.com/nqdev-group/9router/commit/ad661c1286252f36a78f31876037d85483de5748)
- fix: resolve SonarQube findings and Next.js Image warnings [`7058b06`](https://github.com/nqdev-group/9router/commit/7058b062e70ce7c9b58ed8392439a1f9f3db02f3)
- refactor(qoder): mirror Kiro's OAuth service layout [`69bc71c`](https://github.com/nqdev-group/9router/commit/69bc71cf11e9f208cffe1b77c572be04ac31732c)
- Fix : Antigravity MITM [`34da52f`](https://github.com/nqdev-group/9router/commit/34da52f144c6c979b75f6d68a5a1255fa98bb4b2)
- feat(antigravity): initial steps for Antigravity anti-ban alignment [`a229d79`](https://github.com/nqdev-group/9router/commit/a229d79158587ade7706c673a853c6e994218b71)
- feat: implement model lock functionality for connection management [`25c2ad7`](https://github.com/nqdev-group/9router/commit/25c2ad7360900178a8c071424412ad6f8a5c1e4d)
- fix(kiro): handle 400 on tool-bearing history without client tools [`8ad9554`](https://github.com/nqdev-group/9router/commit/8ad95542da0329c1f80a8d7f0e2d409a36153238)
- feat(cloud): harden sync/auth flow, SSE fallback, and update changelog [`3d43983`](https://github.com/nqdev-group/9router/commit/3d439839d9cd9f103dcf64cf436ad522f73e277e)
- Feat : Kiro MITM [`03ff351`](https://github.com/nqdev-group/9router/commit/03ff35100d70a7c3bbb675af849169e8521776bb)
- chore: Refactor CursorAuthModal to handle manual instructions for Windows users. [`04ba66b`](https://github.com/nqdev-group/9router/commit/04ba66bc1eace6825c4fc1b38f6810de5b95554d)
- Fix Kiro [`1d481c2`](https://github.com/nqdev-group/9router/commit/1d481c2862f4f9b3439940c00bdf657d2508b950)
- Update gitbook [`50b8a59`](https://github.com/nqdev-group/9router/commit/50b8a59f996e1f4a37be53ceda198d924ed4f01f)
- feat(provider): add free providers and enhance error handling [`bdbe816`](https://github.com/nqdev-group/9router/commit/bdbe8162e7b9d9fa35d52ea452e6d86e8dc4e105)
- chore: add Gemini 3.1 Pro models to provider configurations [`a5eb5a8`](https://github.com/nqdev-group/9router/commit/a5eb5a864ed81fa75a322182f681ae296acfd0a7)
- feat: add CommandCode provider support [`b72a443`](https://github.com/nqdev-group/9router/commit/b72a443bd38c37fc498773ed64f269edbb3bd047)
- Add Cloudflare AI provider support and enhance connection management [`1bb6213`](https://github.com/nqdev-group/9router/commit/1bb621317d9d9c3fafefd00e5279663d93d622cf)
- # v0.4.71 (2026-06-06) [`827e5c3`](https://github.com/nqdev-group/9router/commit/827e5c382b11f90b876f856ffa99cbd50f6abd6b)
- Enhance TTS functionality and security settings [`b3feb96`](https://github.com/nqdev-group/9router/commit/b3feb96740aa6233bd2887b135682f18a68da7a6)
- - Updated CLI tool components to accept initial status as a prop, improving state management for tool statuses. [`9003675`](https://github.com/nqdev-group/9router/commit/9003675b71efcb0fc9e1aec748fd7309b9417d4b)
- Fix MITM [`8221f7c`](https://github.com/nqdev-group/9router/commit/8221f7c027bb569c752168afb1e0ec9685ff2caf)
- Added Usage page. [`3804357`](https://github.com/nqdev-group/9router/commit/3804357aba544bf631dc22c491533f1093fc2b69)
- Fix Antigravity [`fb5be37`](https://github.com/nqdev-group/9router/commit/fb5be37e1439af6e53408aadc9f43ffbe7ff1934)
- feat: Enhance usage tracking across response handlers [`a33924b`](https://github.com/nqdev-group/9router/commit/a33924b336a7042d0372f8ff2e793f3058591e59)
- # v0.4.28 (2026-05-10) [`530dc9c`](https://github.com/nqdev-group/9router/commit/530dc9cb3ba4e0e369eb0cdb4bb70210d98678ff)
- Feat : console log [`4903a9b`](https://github.com/nqdev-group/9router/commit/4903a9b2cb57ca803ccfa78a06b02efa2ee76fa5)
- refactor(dashboard): reorganize menu actions across sidebar/header/profile [`f161b29`](https://github.com/nqdev-group/9router/commit/f161b295a5ad1bb97579caf7fd515d365d442279)
- fix(codex): harden streaming timeouts + Responses terminal events [`9caea88`](https://github.com/nqdev-group/9router/commit/9caea8852801dc0cdbb6f67aace3b4f95ca9fe13)
- Enhance proxy functionality with Vercel relay support [`89eb26d`](https://github.com/nqdev-group/9router/commit/89eb26dee2ea80b66d957a885c9ce51c330356e6)
- feat: add password change functionality and dependencies [`23cfb19`](https://github.com/nqdev-group/9router/commit/23cfb19459869fe8e825afe2093f11170fbcf59e)
- Enhance model configuration by adding modalities for input and output in OpenCodeToolCard and route.js. Introduce live model resolvers for Kiro in v1/models, allowing dynamic fetching of models based on provider credentials. [`18f87f4`](https://github.com/nqdev-group/9router/commit/18f87f43ca07962d0779a143741e2134c4f9f2a3)
- Enhance chat handling and introduce Caveman feature [`936d65a`](https://github.com/nqdev-group/9router/commit/936d65ae1c4d0b713fa466669a2a6c605f1ea0b2)
- - Added new model "Claude Opus 4.6" to the provider models. [`e8aa3e2`](https://github.com/nqdev-group/9router/commit/e8aa3e21fe9ce447451429009304858eb922074b)
- Refactor proxyFetch and enhance MediaProviderDetailPage layout [`f410061`](https://github.com/nqdev-group/9router/commit/f410061e706a54a983c07b9ec3add577880b483d)
- fix(minimax): Bổ sung MiniMax-M3 + cập nhật Quota Tracker coding/CN [`41f94ce`](https://github.com/nqdev-group/9router/commit/41f94ce8c87bf5561e049fb1cc5717a6eea70ed8)
- Enhance chat handling. [`c208f24`](https://github.com/nqdev-group/9router/commit/c208f244ee884c9ea12823045da5908f239110ab)
- Refactor error handling and localDb structure, and fix usage tracking bug. [`75ad0be`](https://github.com/nqdev-group/9router/commit/75ad0bef8e793f59ca668ab393a7c77ab1b5d2b2)
- Fix bug strip image [`401772c`](https://github.com/nqdev-group/9router/commit/401772cb9ac77a4687694057e8bc9f8c79218b12)
- - Enhance passthrough function to support response inspection [`fd4ec9e`](https://github.com/nqdev-group/9router/commit/fd4ec9e5b8971da0b74cb04845d388175e24e218)
- feat: multi-model support for OpenCode CLI config with subagent integration [`1a25c6e`](https://github.com/nqdev-group/9router/commit/1a25c6e3b5a8e40616096bb49199fceae21c02ad)
- chore: fix build warnings, add deployment config, and cleanup lint errors [`0848dd5`](https://github.com/nqdev-group/9router/commit/0848dd5d1398503caad8f53267a14c9d6ac5f6e2)
- # v0.4.52 (2026-05-17) [`9abbb8a`](https://github.com/nqdev-group/9router/commit/9abbb8ad9bc31dd2b060364e3ccc560427a38f66)
- Fix AG [`93b8668`](https://github.com/nqdev-group/9router/commit/93b8668e9ee4d2c803421b0c2fc965d74bb0d5e7)
- fix: improve code formatting and reduce auto-refresh interval [`7f71916`](https://github.com/nqdev-group/9router/commit/7f71916f9e5143a8ddd17f83159ae6251eb532bc)
- Add proactive token refresh lead times for providers and implement Codex proxy management [`04cdb75`](https://github.com/nqdev-group/9router/commit/04cdb75839a798ca5eadc6964f6bf63be29a9b23)
- feat: enhance request handling and error management in chatCore and streamToJsonConverter [`e2db638`](https://github.com/nqdev-group/9router/commit/e2db638982676899d4eadedb2614601ffe91ee33)
- MODEL_CAPS [`333e704`](https://github.com/nqdev-group/9router/commit/333e704b2afd3ff414809658167e751c368364a6)
- fix(tui): replace enquirer with readline to remove input lag [`1c3ab7b`](https://github.com/nqdev-group/9router/commit/1c3ab7be236455ad83fae0504a144bb4f82764e8)
- Fix Bug [`e6299ee`](https://github.com/nqdev-group/9router/commit/e6299eef56d4f1c519dcae6d86bda4418413829d)
- - Add new model "minimax-m2.5" to providerModels. [`3e4ca18`](https://github.com/nqdev-group/9router/commit/3e4ca1889f7f2d74222cb013eb22277f8a9d0c57)
- feat: add Azure OpenAI provider support [`65f11a6`](https://github.com/nqdev-group/9router/commit/65f11a603eaf542fc49c39e8d61ec1afcbcb9087)
- feat: add request logging functionality and usage metrics display [`e476907`](https://github.com/nqdev-group/9router/commit/e4769070b388504b9c49b0821fb9707cf6061e94)
- feat: add auto README translation workflow with streaming [`4a1521d`](https://github.com/nqdev-group/9router/commit/4a1521de09c6ae3a5c65ae6e04d399ccbfe2ab2d)
- feat: add OllamaLocalExecutor and update provider handling [`0d61a1d`](https://github.com/nqdev-group/9router/commit/0d61a1d5464ddd496975a2d7703e379cffdff906)
- test(qoder): add regression coverage for review-fix changes [`935462c`](https://github.com/nqdev-group/9router/commit/935462ce8f0b1d7e1d1a66e91617068afb372f92)
- refactor: update MitmServerCard and MitmToolCard to use modalError instead of message for error handling [`c8d2497`](https://github.com/nqdev-group/9router/commit/c8d249742327d6836ba719a329c94f02c5671313)
- feat: implement request tracking and enhance usage stats display [`e4f92cd`](https://github.com/nqdev-group/9router/commit/e4f92cd104986a16c5f45266205cda73f1969e79)
- fix(security): harden public API and local-only access gates [`5e1c126`](https://github.com/nqdev-group/9router/commit/5e1c1261368e06dced1cbc650684561b2c8844db)
- # v0.4.62 (2026-05-26) [`0065bbb`](https://github.com/nqdev-group/9router/commit/0065bbbdfd1094bc9ce446e193352678888b57f0)
- MITM Warning [`b5979df`](https://github.com/nqdev-group/9router/commit/b5979dfbd687c0517adab17068ff7bf6825cf264)
- Enhance error formatting to include low-level cause details, update HeaderMenu to use MenuItem component for better structure, and improve LanguageSwitcher to support controlled open state. Update subproject commit status. [`3977edc`](https://github.com/nqdev-group/9router/commit/3977edc460bc3e3e6c708caf090933425ba50808)
- - Add new "Quota Tracker" item to the sidebar navigation. [`bfd9614`](https://github.com/nqdev-group/9router/commit/bfd9614fa2d8816071a834fe7eae2b3ea8e1a27d)
- Fix tunnel [`e84ab78`](https://github.com/nqdev-group/9router/commit/e84ab7857a0a5c21eb0c9b7305dab0df310f02dc)
- Fix : Tunnel [`80583e2`](https://github.com/nqdev-group/9router/commit/80583e203d3f7ddbe87d0f1dad2f73f647ff6c84)
- feat(auth): Enhance authentication flow and settings management [`249fc28`](https://github.com/nqdev-group/9router/commit/249fc28c49e834fdc283dcaf13fcaf4205050d76)
- Fix model check [`b90e21c`](https://github.com/nqdev-group/9router/commit/b90e21cff2a842826473b141dcc34e6f2d316572)
- Fix bug select model [`a015266`](https://github.com/nqdev-group/9router/commit/a01526642c03f29e08242fcb25ccf80ea3b4a3cb)
- feat(ui): add model support for custom providers and improve UX [`a7a52be`](https://github.com/nqdev-group/9router/commit/a7a52be2d4283ccbe9ec7b6eec02206fe359ba05)
- Enhance security [`026a7c9`](https://github.com/nqdev-group/9router/commit/026a7c9b85ea513b41ec04401eeeaa29247a0d9e)
- Implement non-streaming response translation for multiple formats in chatCore.js [`63f2da8`](https://github.com/nqdev-group/9router/commit/63f2da87b0ae7989bf50370a2cc79a7978f1a154)
- Refactor UsageChart and UsageStats components to support dynamic period selection [`7195fee`](https://github.com/nqdev-group/9router/commit/7195fee2f6e55d52402bf045ea74ffd147182791)
- feat: add Gemini embeddings support + Letta compatibility fixes [`a57a8ce`](https://github.com/nqdev-group/9router/commit/a57a8ce206e552c802f6ed23e9aefcfc015a4be2)
- # v0.4.55 (2026-05-18) [`613a0a8`](https://github.com/nqdev-group/9router/commit/613a0a819ac33524975032298437512e0baf6824)
- Fix : Updated Anthropic-Beta header. [`67e0db7`](https://github.com/nqdev-group/9router/commit/67e0db77da5ad48cb1577abcb99b191f4d2ec48b)
- - Cap maximum cooldown for rate limit handling in account unavailability and single-model chat flows [`cca615e`](https://github.com/nqdev-group/9router/commit/cca615eaffa84b6c16e9c98ab3dd014b07b577e7)
- Squashed commit of the following: [`0654d7b`](https://github.com/nqdev-group/9router/commit/0654d7bb35a83d8e3e6bc25c996e63beeac519d0)
- feat(usage): implement timeout and error handling for antigravity usage and subscription requests [`2f4b813`](https://github.com/nqdev-group/9router/commit/2f4b813c5bf95a63323ed78329ef672e8e93ae63)
- Fix input fields in tool cards [`f08fa5f`](https://github.com/nqdev-group/9router/commit/f08fa5f78da589aae52f8feb2cbe3aa2238a99f4)
- Added new models for Claude Opus 4.8 and GPT 5.4 Mini. [`468c61b`](https://github.com/nqdev-group/9router/commit/468c61b2ac53bd8b9d991fe82e7ba784e87910e9)
- fix: prevent race conditions in sticky round-robin [`3ad2f8d`](https://github.com/nqdev-group/9router/commit/3ad2f8dc580dc264537c96c6a277701d0521d16e)
- Fix kiro [`eff52f7`](https://github.com/nqdev-group/9router/commit/eff52f75aea4ba960efef3b9c3ec32e38898304f)
- feat(i18n): add endpoint exposure notice across multiple languages [`64f5842`](https://github.com/nqdev-group/9router/commit/64f58420db30b9027e554ae7dd513e0daa96d089)
- fix: update backoff configuration and improve CLI detection messages [`6ab9927`](https://github.com/nqdev-group/9router/commit/6ab9927a28277cb8b423e376435d6b10e7d8e6e8)
- Fix Combo [`c39eca6`](https://github.com/nqdev-group/9router/commit/c39eca6d4e6731aef20245fde11c2e607ca16211)
- Fix tunnel health check [`134a70c`](https://github.com/nqdev-group/9router/commit/134a70c62f01b801db96b52a671bf199baadf8e4)
- Fix bug [`875a128`](https://github.com/nqdev-group/9router/commit/875a1282ea7fe74b15fbafd88e1f14374c19cf13)
- feat: Implement buffer addition to usage tracking for improved context handling [`7881db8`](https://github.com/nqdev-group/9router/commit/7881db81ec44081dffccd2bac1ec9a25af742ea1)
- chore: update version and enhance dashboard components [`a84477e`](https://github.com/nqdev-group/9router/commit/a84477e8153b11ab7f28065e463494634c28ba6b)
- Add codex  to image providers [`83418e8`](https://github.com/nqdev-group/9router/commit/83418e8a9d236922b64d5d52cc2968f91a02c103)
- # v0.4.62 (2026-05-26) [`ac2fee7`](https://github.com/nqdev-group/9router/commit/ac2fee73058467f67cb86963f8fd2cd96d1ff16e)
- Add Docker support and improve Dockerfile configuration [`d99f63c`](https://github.com/nqdev-group/9router/commit/d99f63cf36e5defecc640c15d6f9faca89fa51ba)
- # v0.4.66 (2026-05-29) [`e9ae21a`](https://github.com/nqdev-group/9router/commit/e9ae21a7238f00207b10c87c93b29045fd341d9c)
- Fix bug [`b7b4ac5`](https://github.com/nqdev-group/9router/commit/b7b4ac55927e43df4613862a99f276ccde1c1542)
- fix bug [`147fc16`](https://github.com/nqdev-group/9router/commit/147fc168f9b624be2a36ec34da450eaffeb74353)
- Fix [`94c4320`](https://github.com/nqdev-group/9router/commit/94c4320632b982f48e6ed3838e772cf719176c7b)
- Remove Docker publish workflow and update error handling in various modules [`d3c3a4a`](https://github.com/nqdev-group/9router/commit/d3c3a4ae0aced5c7dc7faa9f92e728836da1640e)
- Added profile ARN handling in OAuth provider mapping and improved polling logic in OAuth modal for better user experience. [`75f486b`](https://github.com/nqdev-group/9router/commit/75f486b7a221e0c988f07b7e192df7690b9c044a)
- Fix : Claude OAuth [`07d4cdf`](https://github.com/nqdev-group/9router/commit/07d4cdfa7e310030a80e5114ea01feefdb1a3e37)
- Docker [`7f7b86f`](https://github.com/nqdev-group/9router/commit/7f7b86f70efc21574cd4f611c9bb3a6a96c01559)
- feat(iflow): add IFlowExecutor with HMAC-SHA256 signature and enable models [`bd23ab4`](https://github.com/nqdev-group/9router/commit/bd23ab41ee17dc8d0349d3b39df0dd08bcb2599b)
- feat: enhance usage stats with sortable columns and improved data handling [`bf6e09b`](https://github.com/nqdev-group/9router/commit/bf6e09bb6fdb7bc17642ed8e1acc4de68e905fd2)
- refactor: update MITM bypass logic and enhance combo name validation [`f1c53a3`](https://github.com/nqdev-group/9router/commit/f1c53a319efdc1b410d4a820ca8d07ef081ba9e3)
- Fix MITM [`f2306e6`](https://github.com/nqdev-group/9router/commit/f2306e69622e8c57df92ec44afae0f66bebbc84d)
- feat(providers): auto-validate API keys on save [`b275dfd`](https://github.com/nqdev-group/9router/commit/b275dfdc9cd3139baaf9d4bd67841d8abe486f77)
- Fix bug [`224981d`](https://github.com/nqdev-group/9router/commit/224981d53716bb12f2f9a77ead9342b788c8093d)
- Fix Kiro [`da15660`](https://github.com/nqdev-group/9router/commit/da15660681179244c6ddccc1783e3ed800567789)
- Fix Antigravity [`f9ef718`](https://github.com/nqdev-group/9router/commit/f9ef718fc692739fef22bfcfbbb611ccd5e677f9)
- Fix antigravity [`8c37b39`](https://github.com/nqdev-group/9router/commit/8c37b39eed1bdf5a737b71ba4840390f5e751579)
- Fix [`067b7c5`](https://github.com/nqdev-group/9router/commit/067b7c529213b59a9502507a8095243730b88dff)
- Update i18n [`74043f5`](https://github.com/nqdev-group/9router/commit/74043f59abe6f545bc9f2a0414fa628f30e93e1e)
- fix(db): improve error handling and null checks [`e6ef852`](https://github.com/nqdev-group/9router/commit/e6ef8528fcaf56ac8c86b41ee1ca59dccbcfaaa3)
- chore: update version and enhance provider model configurations. [`930e917`](https://github.com/nqdev-group/9router/commit/930e9170925a2d014362545987a4ba8638846c75)
- feat: add round-robin routing strategy [`9ebd7d3`](https://github.com/nqdev-group/9router/commit/9ebd7d30623d985af592d27b7660006ceff38ec1)
- feat: add sticky round-robin routing strategy [`4f292aa`](https://github.com/nqdev-group/9router/commit/4f292aae638b922a97056fdc8e770a6b0478c879)
- Harden STT ping input and expand model-test coverage [`c980e1f`](https://github.com/nqdev-group/9router/commit/c980e1f7ad0e3476e309106c21800a3e13d3db2a)
- feat(combos): add per-combo round-robin strategy [`3e694a3`](https://github.com/nqdev-group/9router/commit/3e694a383fd1902f6889e79aff6ecfd6b82a1d64)
- Fix Antigravity OAuth [`11b2fcd`](https://github.com/nqdev-group/9router/commit/11b2fcd64374589ccb32ec2e56579ff0ea52ca68)
- Integrated proxy support [`0943387`](https://github.com/nqdev-group/9router/commit/0943387d243bb97a15bdbde6ff4d70036edbc5d9)
- Fix : Qwen provider [`2b1faeb`](https://github.com/nqdev-group/9router/commit/2b1faeb2c6477df893211676c42c6bb2f09a7651)
- Fix Bug [`bf99c60`](https://github.com/nqdev-group/9router/commit/bf99c600f18a06f3a8cec8e635d3c3599482de78)
- feat(qoder): fetch latest model + nút import model trên dashboard [`12c97ad`](https://github.com/nqdev-group/9router/commit/12c97ad46ff852b0afd648e07d16597d4c484b1c)
- Fix bug [`992f4db`](https://github.com/nqdev-group/9router/commit/992f4db4a0d858bcc86b4786f2abab117a6ccdf8)
- fix: deny-by-default API auth + safe SSE controller [`bb86808`](https://github.com/nqdev-group/9router/commit/bb86808582067e4fc6f004508a919efb9970d1d5)
- # v0.4.44 (2026-05-15) [`a28c5ec`](https://github.com/nqdev-group/9router/commit/a28c5ec98b58d685b9855bf429f07d780312c8f6)
- fix: Antigravity INVALID_ARGUMENT errors and Copilot agent mode parity [`c43f8c5`](https://github.com/nqdev-group/9router/commit/c43f8c54d4b7fc7ee9a5b800eb10dc341bea70ac)
- feat(translator): lossless passthrough via CLI tool + provider pairing [`666aecf`](https://github.com/nqdev-group/9router/commit/666aecfc7cc10b70608796852392f40e9b9ed0df)
- Refactor execSync and spawn calls to include windowsHide option for better compatibility on Windows environments. [`1fa05eb`](https://github.com/nqdev-group/9router/commit/1fa05eb2ab2e09ef552200c4b33c5a5ea09408e0)
- Update version to 0.2.76 and enhance MITM manager for cross-platform compatibility [`c3baf52`](https://github.com/nqdev-group/9router/commit/c3baf5298834784b3e3bf5e67726c601997f67da)
- Update ReadMe [`1686adc`](https://github.com/nqdev-group/9router/commit/1686adc704f06f51ff49c6604ec30363e2982e1c)
- feat: implement provider connection reordering on create, update, and delete [`f2abcc6`](https://github.com/nqdev-group/9router/commit/f2abcc65856006204f4695ae82ef171f272182e8)
- Update changelog [`dd15d16`](https://github.com/nqdev-group/9router/commit/dd15d162fcbb63797fa3a3a9eecaedfa98c9a0b2)
- fix: update Codex executor for gpt-5.3-codex support [`d7d5dc9`](https://github.com/nqdev-group/9router/commit/d7d5dc90bccdcdf80eaa94a26254f148a65bca68)
- Fix cloud [`c7219d0`](https://github.com/nqdev-group/9router/commit/c7219d0ac9375e465a8c0c64388b537d2bed240d)
- feat: Improve Antigravity quota monitoring and fix Droid CLI compatibility [`3c65e0c`](https://github.com/nqdev-group/9router/commit/3c65e0c5f204d15d8b29f4eeda46c1111fe2a7ab)
- fix(minimax): echo reasoning_content on follow-up turns to avoid 400 [`4fc02e6`](https://github.com/nqdev-group/9router/commit/4fc02e67e5e56203a7f5dd87f77890b0cb963478)
- fix(antigravity): passthrough tab-autocomplete + mark default agent slot mandatory [`38b73bf`](https://github.com/nqdev-group/9router/commit/38b73bfc6b71a94217d58694f85a415b5afcec64)
- Fix Kiro [`d3dd868`](https://github.com/nqdev-group/9router/commit/d3dd8686fe9a8dc34f940c2ed939c8e7dc696998)
- Fix GitHub Copilot agent mode with Antigravity [`222e22f`](https://github.com/nqdev-group/9router/commit/222e22fa5304a56625193d29ea0c66fad1511bb2)
- Fix antigravity [`ef49595`](https://github.com/nqdev-group/9router/commit/ef49595866b0342dc1977964cfc52c595fe5e909)
- feat(caveman): add wenyan classical Chinese levels and sync upstream prompts [`0477922`](https://github.com/nqdev-group/9router/commit/047792205f6e4c55d89e6c72d0c874558a23d21a)
- feat: add Alibaba Cloud Coding Plan support [`b0ec81f`](https://github.com/nqdev-group/9router/commit/b0ec81f4a51b32d3e3334c902628dbfd84a7ba9f)
- Remove prepare-standalone.js script as it is no longer needed for the build process. [`b0e2eb2`](https://github.com/nqdev-group/9router/commit/b0e2eb2b4bd143ad9ef980fcf8bfcc38a1b3174c)
- Update Readme [`2e3eccf`](https://github.com/nqdev-group/9router/commit/2e3eccf687f61cd6cb7b65ce75e9c7bfcdab31f9)
- Fix STT model test routing [`d4c3e63`](https://github.com/nqdev-group/9router/commit/d4c3e6383aac068a436ce1f6d0a794d69aff3228)
- Refactor MitmServerCard to use input field for API key selection and enhance shutdown process to remove DNS entries synchronously. Added removeAllDNSEntriesSync function for safe cleanup during shutdown. [`8204bba`](https://github.com/nqdev-group/9router/commit/8204bba79f49f83a9e404f69d0c453a36911b607)
- ## Fixes [`593c788`](https://github.com/nqdev-group/9router/commit/593c788c75c9f6a1afa74e3421239e34595a5565)
- feat: add enable/disable toggle for provider connections [`ed796d2`](https://github.com/nqdev-group/9router/commit/ed796d27241ab63d64175ca4013d5c05a71d8bd6)
- chore: update package version to 0.2.71 and enhance MITM tools [`635d327`](https://github.com/nqdev-group/9router/commit/635d327dbc6fb45fb2a09adc310f02f661837b33)
- feat(codex): add GPT 5.3, fix API translation, add thinking levels [`127475d`](https://github.com/nqdev-group/9router/commit/127475df849e9893914bf1a8f4dc1a82d80c7f41)
- Fix : Add reasoning_content placeholder for DeepSeek thinking models [`e8aa5e2`](https://github.com/nqdev-group/9router/commit/e8aa5e2222483f0af627bbe1017747a1cdbbe1da)
- fix: correct finish_reason for tool calls in OpenAI Responses translator [`11e6004`](https://github.com/nqdev-group/9router/commit/11e6004fcb5b3057802fcc2c9b65ad60a12576f2)
- Fix Tray [`1ec3829`](https://github.com/nqdev-group/9router/commit/1ec38292d78ed161ce0ad1003d84f98a81eefd59)
- Fix Bug [`bfb7d42`](https://github.com/nqdev-group/9router/commit/bfb7d421642921a8ff562a1b86c93027081b0d23)
- feat(providers): add provider icons to dashboard [`60bd686`](https://github.com/nqdev-group/9router/commit/60bd686fb0415b38b857553c01eaa3e89c9debae)
- Enhance Windows Tailscale installation process by adding support for curl and verifying installation success. Update fallback mechanism for Tailscale binary to include well-known Windows path. [`6bec1e0`](https://github.com/nqdev-group/9router/commit/6bec1e085b7b38d607660df980b7b0b5e68623ca)
- Fix AG MITM [`50990e8`](https://github.com/nqdev-group/9router/commit/50990e84b40c76f2c06ca3d53b60171ca4b10d54)
- feat: implement API key requirement toggle [`4cf25dc`](https://github.com/nqdev-group/9router/commit/4cf25dc53db414a40d44f4949396e34c58b5c29c)
- Fix bug [`01787a3`](https://github.com/nqdev-group/9router/commit/01787a3d5bc089527eaef6c7a648ee54aec35a96)
- chore: - Adjust opacity settings for ConnectionRow to improve user experience. [`3059df4`](https://github.com/nqdev-group/9router/commit/3059df40141da5e9a569c8396bb053a98c9716e5)
- Refactor cloudflared process management to improve port-specific termination and enhance tunnel management. Update Antigravity cloaking comments for clarity. [`111e789`](https://github.com/nqdev-group/9router/commit/111e78940a489df7909debb7290dab881f6738d8)
- Enhance CodexExecutor with compact URL support [`4bff21c`](https://github.com/nqdev-group/9router/commit/4bff21cb80305cabd526f34779eae1313eccbc14)
- fix(translator): correct thought signatures for AG, Gemini CLI, Vertex; fix missing Vertex response translator [`1973fe5`](https://github.com/nqdev-group/9router/commit/1973fe5a83347d5882f88df0eef1b480ccd2d349)
- feat(qoder): show in Quota Tracker dashboard [`af7f6b1`](https://github.com/nqdev-group/9router/commit/af7f6b1de259bd61384c62108479436c9dc09d5b)
- Update tunnel [`cc971f2`](https://github.com/nqdev-group/9router/commit/cc971f24027b585f4c200f18143d37fd9146d3a7)
- # v0.4.38 (2026-05-13) [`58df17a`](https://github.com/nqdev-group/9router/commit/58df17aa91f25b07b0b39941205bf4c71d2048fa)
- Update ReadMe [`01343c6`](https://github.com/nqdev-group/9router/commit/01343c63256a14a1da144ca967e1fb0cd5b8dbeb)
- fix:  GitHub Copilot model [`95fd950`](https://github.com/nqdev-group/9router/commit/95fd9508e87bfb97554d4e5f7dc1bb09626cbb57)
- Fix antigravity [`9ae5487`](https://github.com/nqdev-group/9router/commit/9ae5487bc768c358ab94b15b1fb81c1f8441d6c3)
- Fix Tunnel [`6af8043`](https://github.com/nqdev-group/9router/commit/6af8043f2a59598fc1a45ddb3c38c67e042339e5)
- refactor: enhance MITM server path resolution and ensure runtime server copy [`d8c0a7e`](https://github.com/nqdev-group/9router/commit/d8c0a7ef44bc9dbf30637f01a77a57bbdf862529)
- - Improved dashboard access control by blocking tunnel/Tailscale access when disabled. [`41c079b`](https://github.com/nqdev-group/9router/commit/41c079babaa16616902ccf5c62ec463de758afec)
- Feat : qoder provider [`4baaa5c`](https://github.com/nqdev-group/9router/commit/4baaa5c7aae9cedace588828a1b7bec489e158f9)
- Fix build bug [`a8100e9`](https://github.com/nqdev-group/9router/commit/a8100e944455e6625d34c82623c01e2cb272ddb8)
- chore: remove translation script and workflow files [`f64c043`](https://github.com/nqdev-group/9router/commit/f64c043a4494d51a8c6aa0737294eb89bb2c05cc)
- feat: implement batch processing for README translation [`cd6962c`](https://github.com/nqdev-group/9router/commit/cd6962c7a29f84cebc7ca1f78324a0d183f228c0)
- Fix Kiro token refresh logic [`6b22b1f`](https://github.com/nqdev-group/9router/commit/6b22b1f4909dac6f6ad46b27fecf84bb8432775f)
- feat(xiaomi-tokenplan): add Claude-native MiMo V2.5 Pro alias via dedicated executor [`40cfa63`](https://github.com/nqdev-group/9router/commit/40cfa63eb8e1806e8ce88fe04ea5f83dcb605d51)
- Add xiaomi token plan provider [`d26db17`](https://github.com/nqdev-group/9router/commit/d26db17f5f65e66c2656f78a87a15891f7bd5274)
- Fix : noAuth support for providers and adjusted MITM restart settings. [`6a6e2fc`](https://github.com/nqdev-group/9router/commit/6a6e2fcd7715522ef53184ca38f330a5f0edc8b3)
- Fix : Fix error 400 [`0c9ad12`](https://github.com/nqdev-group/9router/commit/0c9ad12055151e20bbe5fe991d2de55b03f989ff)
- fix(kiro): add mappable "auto" model slot for Kiro agent mode [`3dda651`](https://github.com/nqdev-group/9router/commit/3dda651bad934cc58ef03d662524e715c9d640e0)
- Use a valid WAV sample for STT model tests [`dcf9bee`](https://github.com/nqdev-group/9router/commit/dcf9beee4b7d1fb5b2ea4c00c2c40fda1b614684)
- - Added BytePlus Provider [`14ff69b`](https://github.com/nqdev-group/9router/commit/14ff69bf90fd46aaa47303325842fe73ab0fc1fe)
- fix: custom provider prefix conflicts with built-in alias [`860d947`](https://github.com/nqdev-group/9router/commit/860d94732a27b10f91c6afbb4e1646361516e2a8)
- refactor: update Antigravity model configurations and pricing [`985985e`](https://github.com/nqdev-group/9router/commit/985985e454044133967bb706db0b6d83f081d473)
- Fix OpenClaw configuration options [`dd043f6`](https://github.com/nqdev-group/9router/commit/dd043f6ff43a88d87d909ad689195904746adfd4)
- feat(endpoint): implement locale-based visibility for wenyan caveman levels [`48c37e0`](https://github.com/nqdev-group/9router/commit/48c37e0ad236f2db486f563c74fb2bbdafa998df)
- refactor: rename provider to alicode (Aliyun Coding) [`d14c18f`](https://github.com/nqdev-group/9router/commit/d14c18f77f923d5286188bd392b0e2fffc63baa3)
- Update JWT_SECRET handling [`fe3ce25`](https://github.com/nqdev-group/9router/commit/fe3ce25ae3cda48c0702c2d452e17f6ec214009d)
- fix: enhance retry logic and configuration for HTTP status codes [`0aff9a5`](https://github.com/nqdev-group/9router/commit/0aff9a502c5c74d89f18998f8b25cf887cc9e5b8)
- Fix Antigravity [`e989796`](https://github.com/nqdev-group/9router/commit/e989796024df9b5d366af29d704b52dcdbb1ce93)
- fix(tunnel): skip virtual interfaces to prevent false netchange watchdog [`293cf40`](https://github.com/nqdev-group/9router/commit/293cf40455b6feea3c0dd3887b43726ffe8460a1)
- implement CLI token validation for enhanced security [`428e2c0`](https://github.com/nqdev-group/9router/commit/428e2c045cb9c0eb8080e8b580471a9c2eaa95ca)
- feat(gemini-cli): wrap CloudCode payload and surface 429 retryDelay [`3e52af3`](https://github.com/nqdev-group/9router/commit/3e52af35e2eaca2513c151a4f3305e4953fd9d48)
- docs: update changelog for v0.3.96 [`248efac`](https://github.com/nqdev-group/9router/commit/248efacdaaf4e5f58eaf14f884ba6e4e7ace96ae)
- Fix combo modal [`39545cf`](https://github.com/nqdev-group/9router/commit/39545cf4c83c14187d3f70dd256dad42bd3c243d)
- fix(chat): pick last non-empty message for Codex Responses SSE [`3d4dbdc`](https://github.com/nqdev-group/9router/commit/3d4dbdc0e7b4d98f470a5d2efef95214bf38a636)
- ci: trigger only on tag push, keep master trigger commented [`5fc77fb`](https://github.com/nqdev-group/9router/commit/5fc77fbf8c988567b54064e1f09d5d58bf61a28e)
- Fix MITM [`90a47c3`](https://github.com/nqdev-group/9router/commit/90a47c3f29743cb307cd9f4c94d9398fae9b3ccc)
- fix(tray): kill child PID before IPC close to avoid macOS NSStatusItem orphan [`e1db491`](https://github.com/nqdev-group/9router/commit/e1db49190a0352a2a93e2269bdba0ff09acb9e3b)
- feat(providers): add Minimax Coding (China) provider [`7c609d7`](https://github.com/nqdev-group/9router/commit/7c609d7a3e69a1ad5017d4287f96018ce9e6f69b)
- Fix ModelSelectModal [`57cfacc`](https://github.com/nqdev-group/9router/commit/57cfaccceb6e87db3acb78db6ed4d3237a60c8e6)
- Fix : Codex on cursor [`a7365c5`](https://github.com/nqdev-group/9router/commit/a7365c5a4e2c420bc345e7e51d0671d9384043bf)
- Update changelog [`a3a0cc8`](https://github.com/nqdev-group/9router/commit/a3a0cc837970629b0ae5c916c53189a383fcac74)
- Update Changelog [`b184444`](https://github.com/nqdev-group/9router/commit/b184444f3471df6e4437fa7d8a8b1a2af8ac2915)
- Update GitHub Actions workflow for Docker image [`ee1271b`](https://github.com/nqdev-group/9router/commit/ee1271b6fd8f6c5145938463b9b85e827be865e9)
- Update Docker build process and documentation [`5d3780c`](https://github.com/nqdev-group/9router/commit/5d3780cfd25a97a0edd4bc0cdcd1782632e70c30)
- Fix bug antigravity [`af5edfd`](https://github.com/nqdev-group/9router/commit/af5edfd00e48a3182793629efc2471c12d9d4e52)
- Fix small bug [`cebc72e`](https://github.com/nqdev-group/9router/commit/cebc72e3438dca5aad69b2828cb0d0f2e54b168d)
- Update Changelog [`1c83142`](https://github.com/nqdev-group/9router/commit/1c8314252b55633c5a9780564ea01f19da023d16)
- add GPT 5.5 model [`5abc9e5`](https://github.com/nqdev-group/9router/commit/5abc9e5c740fdec9f65b45f71c8d45069818ec03)
- docs: add MIT LICENSE file [`753a04b`](https://github.com/nqdev-group/9router/commit/753a04b49ea2e6dbe73e797b1fedbbbe36a080f9)
- Update change log [`30ff4e3`](https://github.com/nqdev-group/9router/commit/30ff4e3fb0c4abaa39de6d02dbab38f02d11334c)
- Update changelog [`ca84e98`](https://github.com/nqdev-group/9router/commit/ca84e988c046483d15b7038a843ae87f506ee186)
- feat(base): add 429 retry with fixed delay for all providers [`36f8a8c`](https://github.com/nqdev-group/9router/commit/36f8a8ce1692c5db7cb157154eaf8aabc4a28658)
- ok [`2449d08`](https://github.com/nqdev-group/9router/commit/2449d0888500a413088e75455f11ef09952b2e22)
- # v0.4.55 (2026-05-18) [`9dde485`](https://github.com/nqdev-group/9router/commit/9dde4858e74d2e883979193694d61e7ff04572b7)
- feat(iflow): sync model list with CLIProxyAPI [`3177539`](https://github.com/nqdev-group/9router/commit/31775393e6d2ccdfe582bfa735c78090522d7dce)
- feat(antigravity): add gemini-3.5-flash-extra-low (Low) model [`e6c09aa`](https://github.com/nqdev-group/9router/commit/e6c09aad15b9a60ee9faabc302cde6335ff42e3e)
- Update change log [`b3fb20e`](https://github.com/nqdev-group/9router/commit/b3fb20e23715c51c6a6259bcefcc13ef3f2c7e5b)
- Update changelog [`42f0736`](https://github.com/nqdev-group/9router/commit/42f0736d283555f3ec8099f68f4ec04b0981a3c9)
- Update ChangeLog [`ef3abea`](https://github.com/nqdev-group/9router/commit/ef3abeacf196faa516eb57cae37255a28d3b673b)
- Add Xiaomi MiMo provider support [`b0da7c1`](https://github.com/nqdev-group/9router/commit/b0da7c1211ed2b227931d8a28f59a905255d9a46)
- Update ChangeLog [`10e24a1`](https://github.com/nqdev-group/9router/commit/10e24a1c95917532f55b8f3a827518281b136877)
- ReadMe [`23181af`](https://github.com/nqdev-group/9router/commit/23181afb637cfda285299f52caf2f9280d32c37a)
- Compass.yml file for config-as-code [`3897ccf`](https://github.com/nqdev-group/9router/commit/3897ccf2f22f6569c7ae1ff73c49999b84c5bc9a)
- Update version [`c3a2bd0`](https://github.com/nqdev-group/9router/commit/c3a2bd01b7621d3158dafcbbcf95b4f07eef61ee)
- fix(providers): restore one-connection guard for compatible/embedding nodes [`44d8de2`](https://github.com/nqdev-group/9router/commit/44d8de288dd02daa0f7fc3271840770469002192)
- # v0.4.58 (2026-05-21) [`f9e6863`](https://github.com/nqdev-group/9router/commit/f9e68631d116719b6920bdbd438b1607ebf39c8a)
- fix(cline): refresh static model catalog [`30e4689`](https://github.com/nqdev-group/9router/commit/30e4689fb9f9468c59a450c19e73e08ac43a950b)
- # v0.4.63 (2026-05-26) [`9742074`](https://github.com/nqdev-group/9router/commit/9742074b3809b26e91ff39c607a136e2376d2062)
- Squashed commit of the following: [`f1bb5bd`](https://github.com/nqdev-group/9router/commit/f1bb5bd67e3690df66f0d4725e13dde4270989c0)
- ci: harden Dockerfile and workflow security [`91c1bc8`](https://github.com/nqdev-group/9router/commit/91c1bc848ed6a7aca3c0d10e91daa25eb22e2e30)
- fix: avoid lost writes by running bulk proxy pool updates sequentially against JSON db [`f94ac21`](https://github.com/nqdev-group/9router/commit/f94ac213b59a35463894c1406efb894416256eb0)
- Update ChangeLog [`0e4e589`](https://github.com/nqdev-group/9router/commit/0e4e58930f8871b98e8164b902d335696dde05a5)
- Update iflow provider models [`4ad344e`](https://github.com/nqdev-group/9router/commit/4ad344e462f5bd3e56c9e2670d39eaca7dbf6217)
- Add support for Kiro token refresh in tokenRefresh.js [`f2ca6f0`](https://github.com/nqdev-group/9router/commit/f2ca6f0dc546b92166f4d986049c80d40bcb7aca)
- chore(gemini-cli): bump version to 0.34.0 and refine user-agent [`eaf770a`](https://github.com/nqdev-group/9router/commit/eaf770a28e893e4b96a82084194943973fb29fc0)
- Update changelog [`cad31a1`](https://github.com/nqdev-group/9router/commit/cad31a171b5b1765db593c5ff27c8a1185a68862)
- chore: update CHANGELOG for v0.4.2 and version bump to 0.4.2 [`fd8163e`](https://github.com/nqdev-group/9router/commit/fd8163e26ea2945639cd4a03926510b421126f89)
- Fix Bug [`96ddec8`](https://github.com/nqdev-group/9router/commit/96ddec822dc1d5efaa6206244a22568d6819d2eb)
- feat: workflow only translates, no auto-commit - user downloads artifact [`5ba862d`](https://github.com/nqdev-group/9router/commit/5ba862dce237eedce993504d7faf3b5faf33d835)
- Delete debug log [`18712b2`](https://github.com/nqdev-group/9router/commit/18712b24cf8bb3ef987c56cd96c7eb10e0f1d307)
- Update ChangeLog [`a7a4e85`](https://github.com/nqdev-group/9router/commit/a7a4e851a798d692868cfb52c8afaa5403595f98)
- Update changelog [`a331c34`](https://github.com/nqdev-group/9router/commit/a331c34eabffa645e67b8abc4702afc2197b4cb4)
- chore: update CHANGELOG for v0.4.1 [`2eebcee`](https://github.com/nqdev-group/9router/commit/2eebcee4fcd517b17412fb8d17dc41a5984db52a)
- Feat : Kiro Provider can now read images. [`4496bf9`](https://github.com/nqdev-group/9router/commit/4496bf96c88bee6bfbe39696d3c381e291d660d8)
- refactor: clarify parallel batch execution [`28ba7bc`](https://github.com/nqdev-group/9router/commit/28ba7bc30c015ff95f38d397ebfccfdedc4ea9ef)
- - Enhanced the description of how the MITM server operates with a clearer flow of information. [`1c3ba6e`](https://github.com/nqdev-group/9router/commit/1c3ba6ef698147af99d521585b8be56b4ad3011e)
- Fix combo fallback [`e6ca119`](https://github.com/nqdev-group/9router/commit/e6ca119f5ee11ae09199f885cd76c7ff3059d595)
- fix(gemini): improve base64 image data parsing [`5645d0a`](https://github.com/nqdev-group/9router/commit/5645d0a0fb27ee3262e2ad7cd50b0532f16a51a8)
- Refactor error handling in chatCore.js and update formatProviderError function to include status code. This improves error message clarity by incorporating HTTP status codes in the formatted output. [`f0698ee`](https://github.com/nqdev-group/9router/commit/f0698eee9d5748fbf53ce310d0b282b0a33b9803)
- Gitbook [`cd483d9`](https://github.com/nqdev-group/9router/commit/cd483d9f659fa9a4347ca980899739dc98c059d0)
- update changelog [`1aedf5c`](https://github.com/nqdev-group/9router/commit/1aedf5cfc0f8b270ee742b2ead930231ad78d1be)
- update change log [`e1a219d`](https://github.com/nqdev-group/9router/commit/e1a219dba69e2262cb28309c7c3d1f3f3f745761)
- Fix bug [`00448b3`](https://github.com/nqdev-group/9router/commit/00448b389b17b92c542564b2cacb3f5ed86c690e)
- Fix codex image [`549223c`](https://github.com/nqdev-group/9router/commit/549223c8cf88372b433d16267f951251ac2df9cf)
- chore: bump version to 0.2.27 [`0f28920`](https://github.com/nqdev-group/9router/commit/0f28920bbc814196eb0da0c91b1e7a780bfd3b2a)
- Update README.md to correct image path and reorder installation instructions for clarity [`0ea417a`](https://github.com/nqdev-group/9router/commit/0ea417a3311d7fd90b7216df966d23855a67b11f)
- Parameterize Bun image and improve package management in Dockerfile [`7887f4f`](https://github.com/nqdev-group/9router/commit/7887f4fd32d55d97102de3fdb34d57b6a6ff516f)
- fix: OpenRouter custom models not showing after being added [`507a5db`](https://github.com/nqdev-group/9router/commit/507a5dbfea70b4671a3e521598a599331b65e824)
- Enhance image support in Kiro for Claude models. Update the message conversion logic to conditionally handle image types based on model capabilities. Additionally, hide the Basic Chat option in the sidebar for a cleaner UI. [`8df8b94`](https://github.com/nqdev-group/9router/commit/8df8b941802cf6a629af972c113129bdc0494fde)
- fix(translator): Ensure loading state is reset after error handling in TranslatorPage [`372b985`](https://github.com/nqdev-group/9router/commit/372b985ee98bd426abfd01115d87798f975e93d6)
- fix(codex): use user-agent detection for Droid CLI compatibility [`8c6e3b8`](https://github.com/nqdev-group/9router/commit/8c6e3b8b62eb2f0ffc78d5d1eefc5f84dd931a15)
- fix(docker): use entrypoint to fix /app/data permissions on mounted volumes [`8c51eda`](https://github.com/nqdev-group/9router/commit/8c51edabcf3a2fdb17458ef9d837bf1aac596aeb)
- Refactor AntigravityExecutor to improve part filtering logic [`b179dc2`](https://github.com/nqdev-group/9router/commit/b179dc264739d5d6d8a16f5483b24b0464c63a6d)
- feat(cli-tools): update default local endpoint port to 20128 [`6c41573`](https://github.com/nqdev-group/9router/commit/6c41573203ce2b23985ad80b9da3d0b9c9a790eb)
- docs: clarify Droid CLI compatibility comment in Responses API translator [`39c555c`](https://github.com/nqdev-group/9router/commit/39c555ca7e34b0a41560c6f6e7357b001794ba6b)
- update README.md [`11f8c2e`](https://github.com/nqdev-group/9router/commit/11f8c2e54016bc6035dce004ff34f1fcfb252a84)
- chore: update CHANGELOG and version to 0.3.98 [`ab7dd63`](https://github.com/nqdev-group/9router/commit/ab7dd63b22c42211ca7554dcbc205eb213d52ac5)
- feat: add Gemini 3.1 Pro models to provider [`f2025cc`](https://github.com/nqdev-group/9router/commit/f2025cc776ab4fa7b8c997da79f14a7f8d4902bc)
- Fix Antigravity [`509b68f`](https://github.com/nqdev-group/9router/commit/509b68fb75880d35c6bcba42ae9ecbf437ecdf26)
- chore(providers): unhide qwen, iflow and antigravity entries [`b59fee8`](https://github.com/nqdev-group/9router/commit/b59fee8053bb68a9dac51d48ffafb29d8c384b1b)
- chore: clean Docker tags + clearer pulls badge [`9ce5290`](https://github.com/nqdev-group/9router/commit/9ce529071070c4c0cf80071a7318d52fca918d4f)
- Update changelog [`c42c014`](https://github.com/nqdev-group/9router/commit/c42c0146ab46d36c6b5ddcf7ef21fd12d5dd486b)
- Update version [`81cef7d`](https://github.com/nqdev-group/9router/commit/81cef7d022c61073d5e9c3741373d179a5b3e714)
- Fix bug [`fca829a`](https://github.com/nqdev-group/9router/commit/fca829aa2a7dc0696f8343c6f3d871bcad5fdbec)
- fix: rename tunnelUrl to tunnelPublicUrl for clarity in CLIToolsPageClient [`3f47038`](https://github.com/nqdev-group/9router/commit/3f47038933c149b3669bf3d892a9dbb708c4e1ac)
- chore: Update package version to 0.3.51 and improve connection handling in API route [`877eea8`](https://github.com/nqdev-group/9router/commit/877eea8ebec0bcfaee1db5227f9a22ea7b6d87d7)
- fix(docker): move data dir chown after COPY to fix EACCES permission error [`9c757ff`](https://github.com/nqdev-group/9router/commit/9c757ff7d2407acbf54de01532560842b00e04a6)
- fix(api): improve access token handling during credential refresh [`a501c05`](https://github.com/nqdev-group/9router/commit/a501c059691ea39c371fa6e1697441d26fd01a51)
- docs: add OmniRoute fork to README [`bd71298`](https://github.com/nqdev-group/9router/commit/bd71298fb76024da2810370cb7d18cf8059e6976)
- feat: add GLM 5 and MiniMax M2.5 models to providerModels.js; add Claude Sonnet 4.6 to CLI tools [`e1e5a81`](https://github.com/nqdev-group/9router/commit/e1e5a816130ba467e694b1ead0eb75132fe54a02)
- Kiro Fix [`85b7bb9`](https://github.com/nqdev-group/9router/commit/85b7bb93196778d140070e4e2fbd784a5c46d6ea)
- fix(proxy): raise Next client body limit to 128MB (configurable) [`2be00e2`](https://github.com/nqdev-group/9router/commit/2be00e2a7886bcfe12d25615faac57e311e4eccd)
- fix(qoder): drop `remaining` from normalized quota — was rendering as % [`3d523b1`](https://github.com/nqdev-group/9router/commit/3d523b138756394bfc32866385b42704792e0d9e)
- # v0.4.59 (2026-05-21) [`e1b821d`](https://github.com/nqdev-group/9router/commit/e1b821dd531b476d92b06ed11020dc465322b2f6)
- Update CHANGELOG for version 0.3.87 [`e02dd07`](https://github.com/nqdev-group/9router/commit/e02dd07a2c563a3ec9e1edabb51062d4c502f43d)
- feat: change workflow to manual trigger only [`863a9ca`](https://github.com/nqdev-group/9router/commit/863a9ca7d5626c5a6ddc8181a5283957d7c7db78)
- Update database file path in ProfilePage component [`1b14c9d`](https://github.com/nqdev-group/9router/commit/1b14c9d66bd5bfa6f2a2980ab0469258bf2e2eda)
- OK [`f1a7be3`](https://github.com/nqdev-group/9router/commit/f1a7be3fee79cd713738fe2a58037c232da54e06)
- Update ReadMe [`b0df536`](https://github.com/nqdev-group/9router/commit/b0df5368ae3c3b32af4c7404b366176ebc839170)
- chore(qoder): rename display label from "Qoder AI" to "Qoder" [`53c0eef`](https://github.com/nqdev-group/9router/commit/53c0eefa00abb3472c75a2bdd04640632ed353d0)
- Update Version [`6493391`](https://github.com/nqdev-group/9router/commit/6493391415776144ebb923d86e7afc91f705042d)
- Update version to 0.4.6 and add BytePlus provider to shared constants [`4ea842c`](https://github.com/nqdev-group/9router/commit/4ea842c0626e7b6151702e850efe6ff0f9c8f265)
- Feat : Kiro MITM [`0657612`](https://github.com/nqdev-group/9router/commit/065761268c508c8030164187400d5d891670f014)
- feat: allow custom user data directory via DATA_DIR environment variable [`d83bd86`](https://github.com/nqdev-group/9router/commit/d83bd8681604c60be9d50e60bb73df13356a925a)
- Fix version [`fafa773`](https://github.com/nqdev-group/9router/commit/fafa77316b4523c6be009f3890cbec4024798504)
- chore(providers): use Anthropic Compatible logo [`8ceb8f2`](https://github.com/nqdev-group/9router/commit/8ceb8f24c3e7bda9c85577a3cd39251fb50d755b)
- fix: Correct indentation for clarity in chatCore and claude-to-openai response handlers [`fa06226`](https://github.com/nqdev-group/9router/commit/fa06226972c0528d627b325be89ca8d22de19d59)
- Redirect to /dashboard [`eb4c709`](https://github.com/nqdev-group/9router/commit/eb4c7093a4dccefe14466f1529caab54235857f2)
- Fix Bug [`146310a`](https://github.com/nqdev-group/9router/commit/146310a3a3193c82ac9b079d4441d6e4feec3cc6)
- feat: add GPT-4o mini to GitHub Copilot provider [`053e490`](https://github.com/nqdev-group/9router/commit/053e490bb591afd411886307e4d91dc1685c901c)
- fix(login): avoid infinite loading on settings fetch failure [`01c9410`](https://github.com/nqdev-group/9router/commit/01c9410530633e3de83a3b84a4818b2e4a652aef)
- Fix Antigravity [`c612741`](https://github.com/nqdev-group/9router/commit/c6127412a6e314cef0951bf0e76619b0c8171cbd)
- Update ver [`7aa7a11`](https://github.com/nqdev-group/9router/commit/7aa7a115994325e1c8b6739c8d23adf3fa3fbae1)
- Update Change Log [`9e87935`](https://github.com/nqdev-group/9router/commit/9e87935c0e53f46d6ae04fbec656fc4d971547d7)
- Update changelog [`278951d`](https://github.com/nqdev-group/9router/commit/278951dc61ab056bd1385ff152c3aaf93242e96e)
- Update CHANGELOG.md [`15153e6`](https://github.com/nqdev-group/9router/commit/15153e658dad660fe815266407e967683fdb9206)
- Update version [`b8e3a46`](https://github.com/nqdev-group/9router/commit/b8e3a46add7b72442e53e9e62d5d310d17bc561c)
- Update Version [`35f1d47`](https://github.com/nqdev-group/9router/commit/35f1d479e7968786fdf5010bf0450f1c844d9c8b)
- Update version [`f25c051`](https://github.com/nqdev-group/9router/commit/f25c05131c927f7060862dd023a010339cc49740)
- Update version [`ecd6e93`](https://github.com/nqdev-group/9router/commit/ecd6e930673bfdca8d746886f91a295892520058)
- Fix bug [`f5aa821`](https://github.com/nqdev-group/9router/commit/f5aa8215b4d204f4ea06727bb4835af1ceb07390)
- Update version [`7959fd3`](https://github.com/nqdev-group/9router/commit/7959fd37add434ccf81c47422165a80ee26eaa05)
- Update version [`a1317ed`](https://github.com/nqdev-group/9router/commit/a1317edfb1aed5f33933d922c0e78bac14f05962)
- update Version [`b7d85ae`](https://github.com/nqdev-group/9router/commit/b7d85ae4636efbb33ddbb610092a789ff188050d)
- fix: enable Apply button when models are selected [`f8a2677`](https://github.com/nqdev-group/9router/commit/f8a267746ab7b7d9e1e7cc9d82a3a8c5fe2ba5a0)
- Update package [`d076c7d`](https://github.com/nqdev-group/9router/commit/d076c7d7f530c06bfd949e0740cc94bdb23f2562)
- update submodule: dev pointer to latest [`9877f32`](https://github.com/nqdev-group/9router/commit/9877f32efa391bc65817b606b1bbe89c590edaf3)
- Update version [`00e7af0`](https://github.com/nqdev-group/9router/commit/00e7af010f9c3696582b4cd9dd84faa00e823955)
- fix: Update abort method in pipeWithDisconnect to return a promise for better error handling [`6b624af`](https://github.com/nqdev-group/9router/commit/6b624af4d0d6e905ef2b52e8c153389c04016c63)
- Update version [`05fc8e9`](https://github.com/nqdev-group/9router/commit/05fc8e9ed99abb2e03800b0af793e7e1dfec33ae)
- Update Version [`f3e5c99`](https://github.com/nqdev-group/9router/commit/f3e5c99e8cf8be1bf8d30bb4637c54a7dc196540)
- Update version [`4b51119`](https://github.com/nqdev-group/9router/commit/4b5111974acd627cbaa5aafb6973cd55b4e2c36e)
- chore(package): bump version from 0.3.42 to 0.3.44 [`c893aea`](https://github.com/nqdev-group/9router/commit/c893aeaa4d1e0e88ea09cda84668665376f1b411)
- docs: update contributors badge display (max 200, columns 10) [`b13ff2c`](https://github.com/nqdev-group/9router/commit/b13ff2cddbfd7fe4d8bca04aeb55ce9d1d737595)
- fix: add write permission to translation workflow [`3fca8a7`](https://github.com/nqdev-group/9router/commit/3fca8a71f575c31b8ed705b9a4c2b3c1e54b219d)
- feat: add Aliyun Bailian (alicode) provider support [`6e6ea7d`](https://github.com/nqdev-group/9router/commit/6e6ea7d97f3a4ef17341e56521cbc5e2028d550f)
- Modify image source in README.md [`33830b0`](https://github.com/nqdev-group/9router/commit/33830b00bbc35d080414b479f14b06f1da6f1d6e)
- fix(auth): allow HTTP for local network [`0a394d0`](https://github.com/nqdev-group/9router/commit/0a394d0d9ac930e5bcbcd74aa1028f6980411e2f)
- Fix antigravity [`2393771`](https://github.com/nqdev-group/9router/commit/239377143ec59535cfa135cd01c7007ac7e888ac)
- fix(providerModels): remove deprecated DeepSeek 3.1 entry from provider models [`eeb2dc9`](https://github.com/nqdev-group/9router/commit/eeb2dc9e303dd54bd139c8ff2f7c34bb82f1f115)
- test: trigger translation workflow [`acb6486`](https://github.com/nqdev-group/9router/commit/acb6486afe8731f893586cd4ed9cf089a251ace3)
- feat(open-sse): add Claude Sonnet 4.6 [`b057c43`](https://github.com/nqdev-group/9router/commit/b057c43c2729631d98c757fcfcf301942b1e9c2a)
- feat: add GPT-3.5 Turbo to GitHub Copilot provider [`e3dbd44`](https://github.com/nqdev-group/9router/commit/e3dbd448af53c975c97be69733e150d0d75c9182)
- feat: add GPT-4 to GitHub Copilot provider [`6ade8ef`](https://github.com/nqdev-group/9router/commit/6ade8ef39afeb3c275ba01d9760e13c3f18c588e)
- PR [`f59571a`](https://github.com/nqdev-group/9router/commit/f59571a18b630ab3e0f894dcd6bfa9e448cbeff9)
- Remove debug [`5d092f3`](https://github.com/nqdev-group/9router/commit/5d092f3710b66f5e40a61ff8da071a6b6da70438)
