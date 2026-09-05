# Business Document — 9Router

Business context for 9Router. Technical details live in `AGENTS.md`; this file covers why the project exists and who it's for. Sections marked *TBD* need input only a project stakeholder can supply — left honest rather than filled with invented numbers.

## Executive Summary

**Project**: 9Router (`9router-app`) — a local AI routing gateway with a Next.js dashboard.
**Status**: Active, fork of an actively-developed upstream project, regularly synced (see `AGENTS.md` "Fork & upstream sync").

9Router exposes one OpenAI-compatible endpoint (`/v1/*`) and routes traffic across 40+ upstream AI providers, handling format translation, model-combo fallback, multi-account fallback, OAuth/API-key credential management, token refresh, and usage/quota tracking — with optional cloud sync. It ships three artifacts: the dashboard + gateway server (root package), a standalone CLI launcher (`cli/`, published to npm as `9router`), and a set of agent-skill definitions (`skills/`) that let external AI tools (Claude, Cursor, ChatGPT) consume 9Router as a tool.

## Mission

Let a single self-hosted gateway stand in front of many AI providers, so client applications (or AI coding agents) integrate against one stable OpenAI-compatible API instead of provider-specific SDKs, and so operators get provider-outage resilience, cost control, and usage visibility without rewriting client code per provider.

## Problem It Solves

- **Provider fragmentation**: every AI provider has its own request/response format (OpenAI, Claude, Gemini, Kiro, Cursor, Antigravity, CommandCode, Ollama, Vertex, etc.). 9Router's translation layer (`open-sse/translator/`) normalizes this behind one API.
- **Provider/account fragility**: rate limits, outages, and expiring OAuth tokens break single-provider integrations. 9Router's combo/fallback system (`open-sse/services/combo.js`, `src/sse/handlers/chat.js`) automatically rotates across models and accounts.
- **Token cost**: LLM usage is expensive at scale. The token-saving engine pipeline (RTK, Headroom, Caveman, Ponytail, CMEM — see `AGENTS.md` "Token-saving engines") reduces token spend before requests reach a provider.
- **Operational visibility**: usage/cost tracking and provider-down Discord alerts (`packages/provider-alert/`) give operators real-time signal instead of silent failures.

## Target Audience

- **Primary users**: developers/teams self-hosting an AI gateway to consolidate multiple provider accounts/keys behind one endpoint, for cost control, redundancy, or to use tools that only speak the OpenAI API against non-OpenAI providers.
- **Secondary users**: AI coding agents (Claude Code, Cursor, etc.) consuming 9Router as a tool via the published `skills/` definitions, and CLI users running `9router` as a local launcher.

## Business Value

- **Cost reduction**: token-saving engines cut per-request token spend; per-model configurable max-input-token limits bypass models that can't fit a prompt rather than failing the request.
- **Reliability**: multi-account and multi-model fallback avoids hard failures on rate-limit/outage; Discord alerting shortens time-to-notice on provider-wide outages.
- **Flexibility**: one integration surface (`/v1/*`) works across 40+ providers and multiple client protocol dialects (OpenAI, Claude Messages API, Codex Responses API, Gemini).

## Success Criteria — TBD

Concrete KPIs (adoption, cost-savings %, uptime targets), budget, timeline, and named stakeholders are not established in the codebase/docs and should be filled in by whoever owns the project roadmap, rather than invented here.

## Related Documents

- `AGENTS.md` (root) — canonical technical documentation, dev/test commands, architecture.
- `open-sse/AGENTS.md`, `src/sse/AGENTS.md`, `src/app/api/AGENTS.md`, `src/lib/db/AGENTS.md`, `packages/AGENTS.md`, `cli/AGENTS.md` — subsystem-level technical detail.
- `CHANGELOG.md` — version history.
