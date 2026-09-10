# Auth & Session Security — Technical Specification

> **Metadata**
> Date: 2026-09-08
> Author(s): Reverse-engineered from source (nqdev-codebase-analyst)
> Status: Implemented
> Last Updated: 2026-09-08
> Version: 1.0
> Related Docs: `src/app/api/AGENTS.md`, `docs/guide/08-auth-security.md`, `docs/Business-Document.md` §4 (Actors & Permissions)

---

## 1. Overview

9Router has two independent auth surfaces layered by a single centralized gate (`src/dashboardGuard.js`): a **dashboard session** (JWT cookie, bcrypt-hashed operator password, optional OIDC/SAML) protecting management APIs and the UI, and a **client API key** (HMAC-derived Bearer token) optionally required on the OpenAI-compatible `/v1/*` surface. Provider credentials (OAuth tokens / API keys 9Router uses to call *out* to upstream AI providers) are a third, separate concern stored in `providerConnections` and are not part of this spec — see the Provider Registry spec / Combo Pipeline spec for how those are consumed.

### Context
Every inbound HTTP request to 9Router passes through `dashboardGuard.js`'s `proxy(request)` before reaching any route handler — this is the single choke point for all authorization decisions in the system.

### Scope
Dashboard JWT session lifecycle, password/login flow, API key generation/validation for `/v1/*`, the centralized route-protection matrix, and the "always protected" / "local-only" special-case lists.

**Out of scope:** OAuth flows for *upstream provider* connections (device-code/PKCE to Claude/Codex/GitHub/etc. — those authenticate 9Router to a provider, not a user to 9Router), OIDC/SAML implementation internals beyond their existence.

## 2. Motivation

### Problem Statement
- **Who has the problem?** Any operator running 9Router where the dashboard/API could be reached by someone other than the operator (e.g., exposed via tunnel, bound to `0.0.0.0`, or on a shared network).
- **Pain point:** A gateway holding live provider credentials (OAuth tokens, API keys for 40+ services) is a high-value target if left unauthenticated.
- **Impact:** Unauthorized access could exfiltrate provider credentials, rack up usage on the operator's provider accounts, or read usage/cost history.

### Current State
Solved via default-deny centralized middleware plus a documented (but not code-enforced) requirement to override default secrets in production.

### Why Now
N/A — documenting the existing, shipped security model.

## 3. Goals

1. **Deny by default** — any `/api/*` path not explicitly allow-listed requires JWT or CLI token.
   - Success metric: `dashboardGuard.js` "deny-by-default" branch (root `AGENTS.md` §Pitfalls confirms this exists at `dashboardGuard.js:224-229`).
2. **Separate the LLM-compat surface's auth model** from the dashboard's, since `/v1/*` clients are programmatic (API keys), not browser sessions (cookies).
   - Success metric: `/v1/*`, `/v1beta/*` are `PUBLIC_PREFIXES` for the JWT gate, with their own independent `REQUIRE_API_KEY` check inside the handler.
3. **Protect operationally destructive/sensitive endpoints unconditionally**, even if the operator has disabled login (`requireLogin=false`).
   - Success metric: `ALWAYS_PROTECTED` list (shutdown, version update, cursor/kiro auto-import) is checked regardless of the `requireLogin` setting.

### Success Criteria

| Metric | Target |
|---|---|
| Unlisted `/api/*` path | Requires JWT/CLI token (deny-by-default) |
| `ALWAYS_PROTECTED` paths | Require auth even with `requireLogin` disabled |
| `LOCAL_ONLY_PATHS` | Restricted to loopback origin + auth, or CLI token |
| Password hashing | bcrypt (not plaintext, not reversible) |
| API key format | HMAC-derived using `API_KEY_SECRET` |

## 4. Non-Goals

- ❌ Multi-user / multi-tenant accounts — single operator password model only (`INITIAL_PASSWORD`, one `password_hash` in `settings`).
- ❌ Per-API-key scoped permissions (all generated API keys appear to have equal access to `/v1/*` — no role/scope system found).
- ❌ Automated enforcement that `INITIAL_PASSWORD`/`JWT_SECRET`/`API_KEY_SECRET` have been changed from defaults before allowing a production/non-localhost bind (documentation-only requirement today).
- ❌ Inbound rate limiting / brute-force lockout on the login endpoint (not found in the codebase).

## 5. Design

### High-Level Architecture

```
Every inbound request
       │
       ▼
src/dashboardGuard.js :: proxy(request)   (Next.js middleware, runs once per request)
       │
       ├─ PUBLIC_API_PATHS?  (health, init, locale, auth/login|logout|status|oidc|saml,
       │                       version GET, settings/require-login)         → allow, no auth
       │
       ├─ PUBLIC_PREFIXES?   (/v1, /v1beta, /api/v1, /api/v1beta, /codex)   → allow past this gate;
       │                                                                       handler does its OWN
       │                                                                       API-key check via
       │                                                                       isPublicLlmApi/
       │                                                                       canAccessPublicLlmApi
       │
       ├─ ALWAYS_PROTECTED?  (shutdown, settings/database, version/shutdown|update,
       │                       oauth/cursor|kiro/auto-import)               → JWT or CLI token,
       │                                                                       REGARDLESS of requireLogin
       │
       ├─ LOCAL_ONLY_PATHS?  (cli-tools/cowork-settings, cli-tools/antigravity-mitm,
       │                       mcp/, tunnel/tailscale-*, oauth/*/auto-import,
       │                       auth/reset-password, headroom/start|stop|proxy)
       │                                                                     → loopback origin + auth,
       │                                                                       or CLI token
       │
       ├─ PROTECTED_API_PATHS?  (settings, keys, providers, provider-nodes,
       │                          proxy-pools, combos, models, usage, oauth,
       │                          media-providers, pricing, tags, cli-tools,
       │                          mcp, translator, tunnel)                  → JWT cookie or CLI token,
       │                                                                       UNLESS requireLogin=false
       │
       └─ anything else under /api/*                                        → deny-by-default:
                                                                                 JWT or CLI token required
```

### System Components

#### Component 1: Dashboard Guard (`src/dashboardGuard.js`)

**Responsibility:** The single, centralized authorization decision point. No route file checks auth itself — every `route.js` assumes the guard already ran (per `src/app/api/AGENTS.md`). This is a deliberate architectural choice: adding a new sub-path under an already-listed prefix (e.g. `settings/newthing`) automatically inherits that prefix's protection, but a genuinely new top-level `/api/` prefix gets **no** protection until explicitly added to one of the path lists — a documented pitfall.

**Path-list constants:** `PUBLIC_API_PATHS`, `PUBLIC_PREFIXES`, `ALWAYS_PROTECTED`, `LOCAL_ONLY_PATHS`, `PROTECTED_API_PATHS`, plus the deny-by-default fallthrough.

#### Component 2: Dashboard Login (`src/app/api/auth/login/route.js`)

**Responsibility:** Verify the operator password against a bcrypt hash (or `INITIAL_PASSWORD` default `123456` if no hash is set yet), issue a JWT session cookie on success.

```
POST /api/auth/login { "password": "..." }
→ { token: "...", success: true }  (JWT set as httpOnly cookie)
```

Blocks tunnel-origin login attempts if `tunnelDashboardAccess` is disabled in settings — an extra guard specifically for remote-tunnel exposure.

#### Component 3: JWT Session (`src/lib/auth/dashboardSession.js`)

**Responsibility:** Sign/verify the session cookie. `JWT_SECRET` auto-generates and persists to `~/.9router/jwt-secret` if not set via environment — guarantees the app works out of the box, but means the effective secret is a local file an attacker with filesystem access could read. `AUTH_COOKIE_SECURE` (default `false`) should be set `true` behind HTTPS to add the `Secure` cookie flag.

#### Component 4: API Key Auth (`src/shared/utils/apiKey.js`, `apiKeysRepo.js`)

**Responsibility:** Generate (`sk_9router_...`) and validate client-facing API keys used to authenticate to 9Router's own `/v1/*` surface (distinct from provider credentials). HMAC-derived using `API_KEY_SECRET` (default is a fixed, publicly-known string in the shipped code — **must** be overridden per the documented security checklist). Accepted via `Authorization: Bearer ...` or `x-api-key` header.

```
POST /api/keys { "name": "My Key", "machineId": "..." }
→ { key: "sk_9router_...", ... }
```

`REQUIRE_API_KEY=true` (default `false`) enforces this on every `/v1/*` request; without it, `/v1/*` is open to any caller that can reach the process (acceptable for pure-localhost use, a real risk if bound to `0.0.0.0` or tunneled without also setting this flag).

#### Component 5: OIDC / SAML (`src/lib/auth/oidc.js`, `@node-saml/node-saml`)

**Responsibility:** Alternative dashboard login paths for operators wanting to delegate to an external identity provider, configured per-installation in settings. `GET /api/auth/oidc/start?provider=...` / `GET /api/auth/oidc/callback`.

### Security Considerations

#### Authentication
- Dashboard: JWT (cookie), bcrypt password hash, `INITIAL_PASSWORD` fallback for first run.
- `/v1/*`: optional Bearer/`x-api-key` HMAC key, gated by `REQUIRE_API_KEY`.
- CLI: a distinct CLI-token mechanism recognized alongside JWT throughout `dashboardGuard.js`'s protected-path checks.

#### Secrets & their defaults (must-override list, per `docs/guide/08-auth-security.md` and root `AGENTS.md`)
| Variable | Shipped default | Risk if unchanged |
|---|---|---|
| `INITIAL_PASSWORD` | `123456` | Full dashboard takeover if internet-reachable |
| `JWT_SECRET` | auto-generated local file | Low if filesystem is private; high if leaked |
| `API_KEY_SECRET` | fixed default string in source | Predictable API-key derivation |
| `MACHINE_ID_SALT` | fixed default string in source | Predictable machine-ID hashing |

None of these are enforced at startup (no warning/refusal-to-boot when a default is detected in a non-localhost bind) — this is a **documentation-only** control today, not a code-enforced one.

#### Rate limiting / brute force
No login-attempt rate limiting or account lockout was found for `/api/auth/login`. This is an explicit gap relative to typical auth hardening baselines (see Open Questions).

#### Tunnel-specific hardening
`tunnelDashboardAccess` setting can disable dashboard login over a tunnel entirely; Tailscale and MCP routes are `LOCAL_ONLY_PATHS` (loopback-restricted) regardless of tunnel exposure, limiting the blast radius of a tunnel misconfiguration.

## 6. API & Interfaces

```
POST /api/auth/login        { password } → { token, success }
POST /api/auth/logout       → clears session cookie
GET  /api/auth/status       → { authenticated: boolean, ... }
POST /api/auth/reset-password   (LOCAL_ONLY — loopback + auth required)
GET  /api/auth/oidc/start   ?provider=...
GET  /api/auth/oidc/callback ?code=...&state=...
POST /api/keys              { name, machineId } → { key: "sk_9router_..." }
```

Provider-facing `/v1/*` accepts `Authorization: Bearer sk_9router_...` or `x-api-key: sk_9router_...` when `REQUIRE_API_KEY=true`.

## 7. Metrics & Success Criteria

No auth-specific metrics/dashboard found (no login-attempt counter, no failed-auth rate exposed via `/api/usage/*`). Provider-connection health (`testStatus`, `lastError`) is tracked but that is upstream-provider auth, not this system's own session/API-key auth.

## 8. Trade-Offs

| Decision | Alternative | Why chosen |
|---|---|---|
| Single-operator password, no multi-user model | Full user/role system | Matches the "local, self-hosted, single-operator gateway" product shape (Business-Document §4.1) — added complexity would serve a use case the product doesn't target today |
| Centralized middleware gate, not per-route checks | Per-route auth decorators | One place to audit/change the entire security posture; trade-off is the documented "new top-level prefix gets no protection until added to a list" pitfall |
| `/v1/*` auth optional by default | Required by default | Prioritizes zero-friction localhost dev experience; `REQUIRE_API_KEY` exists precisely for the internet-exposed case |
| Secrets default to insecure-but-functional values | Refuse to boot without explicit secrets | Lowers the barrier to first run/evaluation; shifts the security burden to operator diligence for production deploys |

### What We're Giving Up
- No defense-in-depth against a forgotten `INITIAL_PASSWORD` in production — purely a documentation-based control.
- No brute-force protection on login.
- No per-key scoping (an API key is all-or-nothing for `/v1/*` access).

## 9. Alternatives Considered

Not documented as an explicit ADR in-repo. No evidence of a prior multi-user model that was later simplified, or vice versa — the single-operator design appears to be the original and only approach.

## 10. Implementation

Already implemented and shipped. Recommended (not currently planned, per any in-repo roadmap) hardening candidates if this were to be revisited:
1. Startup check that warns (or refuses non-localhost bind) when `INITIAL_PASSWORD`/`API_KEY_SECRET`/`MACHINE_ID_SALT` are still at shipped defaults.
2. Login rate limiting / exponential backoff on repeated failures.
3. Per-API-key scoping (e.g., read-only usage key vs. full routing key).

### Testing Strategy (current)
No dedicated auth/security test suite was located during this analysis pass under `tests/` — recommend confirming coverage (login flow, API key validation, `dashboardGuard` path-matrix) exists before treating this subsystem as regression-safe.

## 11. Open Questions

- [ ] Should the app refuse to bind to a non-loopback address while `INITIAL_PASSWORD` is still the default, rather than only documenting the requirement?
- [ ] Is login rate limiting planned, given the endpoint is fully public (`PUBLIC_API_PATHS`) with no lockout?
- [ ] Is per-API-key scoping (e.g., restricting a key to specific providers/combos) ever planned, or is "one key = full access" the permanent model?
- [ ] Is there a security review / pen-test cadence for this subsystem given it guards live third-party API credentials for 40+ providers?

## 12. References

**Source files:** `src/dashboardGuard.js`, `src/app/api/auth/login/route.js`, `src/lib/auth/dashboardSession.js`, `src/shared/utils/apiKey.js`, `src/lib/db/repos/apiKeysRepo.js`, `src/lib/auth/oidc.js`.
**Prior docs:** `docs/guide/08-auth-security.md`, `src/app/api/AGENTS.md` "Auth & middleware".

## 13. Approval & Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| Security | — | — | ⭕ Pending (recommend a dedicated review given credential-custody role) |
| Engineering | — | — | ⭕ Pending |

## 14. Document History

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-09-08 | 1.0 | nqdev-codebase-analyst | Initial spec, reverse-engineered from `src/dashboardGuard.js` + auth-related route/lib files |
