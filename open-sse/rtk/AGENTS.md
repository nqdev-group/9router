# open-sse/rtk

The real RTK ("request token-killer") engine: compresses verbose tool_result/text payloads in-place and injects terse-style system prompts, both to cut tokens before a request reaches the upstream provider. A JS port of the Rust `rtk` CLI's filter set (comments cite `rtk/src/...` line numbers from that source). Wired into the pipeline from `open-sse/handlers/chatCore.js` — see root `AGENTS.md`'s "Token-saving engines" table and `open-sse/AGENTS.md`'s request lifecycle line.

## Directory map

- `index.js` — `compressMessages(body, enabled, rtkConfig)`: the tool_result/text compressor. Detects wire shape (Kiro `conversationState`, OpenAI `messages`, Responses `input`) and dispatches per-message. Exports `formatRtkLog`.
- `autodetect.js` — `autoDetectFilter(text)`: sniffs the first `DETECT_WINDOW` (4096) chars against a fixed, ordered chain of regexes (git-log → git-diff → git-status → build-output → eslint → tsc → jest → npm/pip install → docker → grep → find → tree → ls → search-list → stack trace → json-log → read-numbered → dedup-log → smart-truncate → `null`).
- `applyFilter.js` — `safeApply(fn, text)`: try/catch wrapper around a single filter call; any throw or non-string return passes the original text through unchanged (`rtk/src/cmds/system/pipe_cmd.rs` `catch_unwind` port).
- `filters/*.js` — 21 pure `(text: string) => string` shape compressors, one per detected format, each self-tagging `fn.filterName = "..."` (git-diff, git-status, git-log, git-show, grep, find, ls, tree, dedup-log, smart-truncate, read-numbered, search-list, build-output, eslint, tsc-build, jest-test, npm-install, pip-install, docker-logs, error-stacktrace, json-log). None accept a config argument — thresholds/caps come only from `constants.js`.
- `registry.js` — `REGISTRY_MAP` (id → `{fn, category}`) + `allFilters()`/`resolveFilter()`, consumed by the settings UI/API (`src/app/api/settings/rtk/filters/route.js`, `packages/components/rtk/FilterGrid.js`) to render togglable filter cards.
- `configResolver.js` — `resolveRtkConfig()` merges/validates a user config against defaults via `@9router/validation` (`packages/validation/rtkConfigSchemas.js`); `resolveEffectiveFilters()`/`getFilterPreset()` map an `intensity` level (minimal/moderate/aggressive/maximal) to a filter allow-list + threshold preset.
- `constants.js` — legacy/default caps (`RAW_CAP`, `MIN_COMPRESS_SIZE`, `DETECT_WINDOW`, per-filter line caps) and the `FILTERS` id map.
- `batchCompress.js` — `batchCompressTexts()`: joins several small (<500 char) system/user text blobs with a `\n---BATCH-SEP---\n` marker, runs them through one `autoDetectFilter` pass, and splits the compressed result back apart (by separator, falling back to proportional-ratio slicing).
- `headroom.js` — `compressWithHeadroom()`: optional external `/v1/compress` proxy call. Translates Claude/Responses/Kiro bodies to OpenAI `messages[]`, POSTs, translates the compressed result back. Also exports diagnostics helpers (`formatHeadroomSizeLog`, `isHeadroomPhantomSavings`) that detect a proxy reporting token savings while the outbound JSON barely shrank.
- `systemInject.js` — `injectSystemPrompt(body, format, prompt)`: shared, format-dispatching injector used by both caveman and ponytail. Exact-match idempotent (`hasPrompt`/`dedupStringAppend`) so re-injection across retries is a no-op. Has a dedicated, documented Kiro branch (appends to the first user turn's content, deliberately never writes a top-level `systemPrompt` field — kiro.dev 400s on that field).
- `caveman.js` / `cavemanPrompts.js` — `injectCaveman()`: terse-reply system prompt, 6 levels (lite/full/ultra + 3 wenyan/classical-Chinese levels), built from shared boundary/persistence/no-decoration fragments.
- `ponytail.js` / `ponytailPrompt.js` — `injectPonytail()`: "lazy senior dev" / YAGNI-first coding-style system prompt, 3 levels (lite/full/ultra).
- `pxpipe.js` — `compressWithPxpipe()`: Claude-format-only, renders bulky context to PNGs via a host-injected `transform` function (keeps `open-sse` filesystem-free); gated by a min-char threshold and a timeout race (`Promise.race` against a timer, since the transform itself isn't abortable).
- `preprocessors/contentCleaner.js` — `preprocessBody()`/`cleanText()`: BOM strip, trailing/leading whitespace trim, blank-line collapse. Runs on the raw client-format body.
- `preprocessors/contextPruner.js` — `pruneBody()`: replaces a duplicate fenced code block (seen verbatim in an earlier turn) with `[duplicate <lang> block omitted...]`.

## Pipeline — where this actually runs (chatCore.js)

Two distinct stages, not one, despite `open-sse/AGENTS.md` calling all of this "pre-translate hooks":

1. **Pre-translate** (`chatCore.js:110-113`): `preprocessBody(body)` always runs on the raw client-format body; `pruneBody(body)` runs only when `Array.isArray(body.messages) && body.messages.length >= 2` — a Responses-shaped body (`body.input`) never reaches `pruneBody` even though `pruneBody` itself handles that shape internally.
2. **Post-translate, pre-execute** (`chatCore.js:202` `translateRequest(...)` → `chatCore.js:269-346`): caveman → RTK (`compressMessages`) → Headroom → caveman *again* → Privacy → CMEM → Ponytail → PXPIPE, all operating on `translatedBody` (already in upstream wire format), before `getExecutor(provider)` (`chatCore.js:378`) and `executor.execute()` (`:433`). So RTK/caveman/headroom/ponytail/pxpipe compress/inject the *translated* body, not the client's original — the "pre-translate" label in the parent doc describes the preprocessors' stage, not this one.

`compressMessages` itself: a batch pre-pass (`index.js:29-66`) collects short system/user texts and compresses them as one blob via `batchCompressTexts`, then the main loop (wrapped in one `try/catch`, `index.js:69-161`) walks every message/block once more, compressing per-shape: system/developer text, user text, Responses `function_call_output`, OpenAI `tool` messages (string or array content), and Claude `tool_result` blocks (string or array) — skipping any block with `is_error === true` (Claude) or `status === "error"` (Kiro), to preserve error traces per `open-sse/AGENTS.md`'s Pitfalls note.

## Conventions

- Every filter is a pure string→string function tagged with `fn.filterName`; always call through `safeApply` (never call a filter directly in a hot path).
- `compressText` (`index.js:195`) never returns something bigger or empty than the input — checked explicitly (`out.length >= bytesIn` bails to original text).
- Config only ever gates two things end-to-end: `minCompressSize`/`maxCompressSize` (size window) and `enabledFilters` (an allow-map keyed by `filterName`). Everything else in the resolved config (`truncateHeadLines`, `truncateTailLines`, `dedupThreshold`, `codeStrippingEnabled`, `codeStrippingLanguages`, `rawOutputRetention`, `autoDetectEnabled`, `commandDetectionEnabled`) is validated and merged by `configResolver.js`/`@9router/validation` but never threaded into `autodetect.js` or any `filters/*.js` function — those read fixed values from `constants.js` regardless of intensity.

## How to add a filter

1. Add `filters/newThing.js` exporting `(text) => string` and set `newThing.filterName = "new-thing"`.
2. Add a detection rule to `autodetect.js` — order matters, insert before the generic `dedup-log`/`smart-truncate` fallbacks so a more specific filter isn't shadowed.
3. Add the id to `constants.js` `FILTERS` **and** to `registry.js`'s `REGISTRY_MAP` (+ a description in `getFilterDescription`) — skipping the registry entry means the filter can auto-fire but can never be toggled from the settings UI/API (see Pitfalls).

## Pitfalls

| Issue | Where |
|---|---|
| The caveman opt-out header (`TOKEN_SAVER_HEADER: off`) doesn't actually suppress caveman: `injectCaveman` is called once *before* the `tokenSaverEnabled` check exists (gated only by `cavemanEnabled && cavemanLevel`), then again after, gated by `tokenSaverEnabled`. The first call already mutated the body; the second is just a no-op due to `systemInject.js`'s idempotency check. | `chatCore.js:266-271` (first call, ungated) vs `:300-303` (second, gated) |
| `build-output` has a `FILTERS.BUILD_OUTPUT` constant and is a live autodetect branch, but is missing from `registry.js`'s `REGISTRY_MAP` — it can never appear in the settings UI (`FilterGrid.js`) or be referenced by name in an explicit `enabledFilters` allow-list, so once any caller sets `enabledFilters` to a specific map, build-output output silently stops compressing (the `!enabledFilters[filterName]` check in `index.js:218` treats the missing key as disabled). | `registry.js` (REGISTRY_MAP), `autodetect.js:58`, `filters/buildOutput.js:127` |
| The batch pre-pass in `compressMessages` (collecting/compressing short system+user texts) runs *before* the function's own `try/catch` block and is not itself guarded; `resolveRtkConfig()` (config merge/validate) also runs unguarded before that. Neither `compressMessages`'s caller (`chatCore.js:275`) nor `compressWithHeadroom`'s equivalent wraps the call in try/catch either — a throw here would propagate up past the "fail-open" contract described in `open-sse/AGENTS.md`. | `index.js:14-66`, call site `chatCore.js:275` |
| Default min-compress-size is inconsistent across three places: `constants.js` `MIN_COMPRESS_SIZE = 200` (legacy path, no `rtkConfig`), `configResolver.js` `getDefaultRtkConfig().minCompressSize = 500`, and `batchCompress.js:8` hardcodes its own literal `200` fallback instead of importing either constant. | `constants.js:3`, `configResolver.js:8`, `batchCompress.js:8` |
| `pruneBody` is only invoked when `body.messages` is an array with ≥2 entries; Responses-shaped bodies (`body.input`) never get pruned even though `pruneBody` has explicit `body.input` handling. | `chatCore.js:111-113`, `preprocessors/contextPruner.js:11-13` |
| `contextPruner.js` declares `RE_FILE_PATH` and `RE_ERROR_MSG` regexes but only `RE_CODE_BLOCK` is ever used in `pruneBody` — dedup only fires on duplicate fenced code blocks, not on repeated file paths or error messages the names suggest. | `preprocessors/contextPruner.js:5-6` (declared), `:28` (only use) |
| `registry.js`'s `resolveFilter()` and its `rg`/`fd` `ALIASES` map have no callers anywhere in `open-sse/`, `src/`, `packages/`, or `tests/` — only `allFilters()` is consumed (by the settings routes/UI). Dead code kept for "backward compatibility" per its own comment. | `registry.js:47-50, 104-108` |
