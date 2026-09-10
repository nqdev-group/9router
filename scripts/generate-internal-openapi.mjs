// Regenerates src/app/api/docs/internal-openapi/spec.json — the "path +
// summary + auth requirement" tier OpenAPI doc for 9Router's internal/admin
// API surface (everything under src/app/api/ except v1/ and v1beta/, which
// are documented separately in public/openapi/ollama-public.json).
//
// Re-run this whenever routes are added/removed under src/app/api/ (outside
// v1/v1beta) so the internal docs page doesn't go stale:
//   node scripts/generate-internal-openapi.mjs
//
// See plans/2026-09-10-ollama-api-swagger-planning.md §6/§11 for the
// rationale (why this tier, not full request/response schemas) and known
// limitations (most summaries fall back to "METHOD /path" because most route
// files have no comment directly above their exported handler).

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, relative, dirname } from "path";
import { fileURLToPath } from "url";

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const API_ROOT = join(REPO_ROOT, "src", "app", "api");
const OUT_PATH = join(API_ROOT, "docs", "internal-openapi", "spec.json");

// Copied from src/dashboardGuard.js (not exported there — this is a one-time
// generation script, not a runtime dependency of the app). If
// dashboardGuard.js's lists change, update these to match and re-run.
const PUBLIC_API_PATHS = [
  "/api/health", "/api/init", "/api/locale",
  "/api/auth/login", "/api/auth/logout", "/api/auth/status", "/api/auth/oidc", "/api/auth/saml",
  "/api/version", "/api/settings/require-login",
];
const ALWAYS_PROTECTED = [
  "/api/shutdown", "/api/settings/database", "/api/version/shutdown", "/api/version/update",
  "/api/oauth/cursor/auto-import", "/api/oauth/kiro/auto-import",
];
const LOCAL_ONLY_PATHS = [
  "/api/cli-tools/cowork-settings", "/api/cli-tools/antigravity-mitm", "/api/mcp/",
  "/api/tunnel/tailscale-install", "/api/tunnel/tailscale-enable", "/api/tunnel/tailscale-disable", "/api/tunnel/tailscale-check",
  "/api/tunnel/enable", "/api/tunnel/disable", "/api/oauth/cursor/auto-import", "/api/oauth/kiro/auto-import",
  "/api/auth/reset-password", "/api/headroom/start", "/api/headroom/stop", "/api/headroom/proxy",
];

function classifyAuth(pathname) {
  if (LOCAL_ONLY_PATHS.some((p) => pathname.startsWith(p))) {
    return "Local-only — CLI token, or loopback request + dashboard login";
  }
  if (ALWAYS_PROTECTED.some((p) => pathname.startsWith(p))) {
    return "Always protected — JWT (dashboard login) or CLI token, even if requireLogin is disabled";
  }
  if (PUBLIC_API_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return "Public — no auth required";
  }
  return "Protected — JWT (dashboard login) required unless requireLogin=false";
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, files);
    else if (entry === "route.js") files.push(full);
  }
  return files;
}

function filePathToUrlPath(filePath) {
  const rel = relative(API_ROOT, filePath).replace(/\\/g, "/").replace(/\/route\.js$/, "");
  const segments = rel.split("/").map((seg) => {
    if (seg.startsWith("[...") && seg.endsWith("]")) return `{${seg.slice(4, -1)}}`; // catch-all
    if (seg.startsWith("[") && seg.endsWith("]")) return `{${seg.slice(1, -1)}}`;
    return seg;
  });
  return `/api/${segments.join("/")}`;
}

const METHOD_EXPORT_PATTERNS = [
  /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\b/,
  // Some routes export a shared handler as a const, e.g. `export const GET = proxy;`
  // (headroom/proxy/[...path], pxpipe/health) rather than a named function.
  /export\s+const\s+(GET|POST|PUT|PATCH|DELETE)\s*=/,
];

function extractMethodSummaries(source) {
  const methods = {};
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = METHOD_EXPORT_PATTERNS.map((re) => lines[i].match(re)).find(Boolean);
    if (!m) continue;
    const method = m[1];
    let summary = null;
    for (let j = i - 1; j >= Math.max(0, i - 6); j--) {
      const line = lines[j].trim();
      if (line.startsWith("*/") || line === "") continue;
      if (line.startsWith("*") || line.startsWith("//")) {
        summary = line.replace(/^\/?\*+\/?/, "").replace(/^\/\//, "").trim();
        if (summary) break;
      } else if (line.startsWith("/**")) {
        continue;
      } else {
        break;
      }
    }
    methods[method] = summary;
  }
  return methods;
}

function main() {
  const routeFiles = walk(API_ROOT).filter((f) => {
    const rel = relative(API_ROOT, f).replace(/\\/g, "/");
    return !rel.startsWith("v1/") && !rel.startsWith("v1beta/");
  });

  const paths = {};
  for (const file of routeFiles) {
    const urlPath = filePathToUrlPath(file);
    const source = readFileSync(file, "utf8");
    const methods = extractMethodSummaries(source);
    if (Object.keys(methods).length === 0) continue;

    const authNote = classifyAuth(urlPath);
    // Check the raw file path for "[...", not urlPath — filePathToUrlPath()
    // already strips the "..." by the time it produces "{param}".
    const isCatchAll = relative(API_ROOT, file).includes("[...");

    const pathEntry = {};
    for (const [method, summary] of Object.entries(methods)) {
      pathEntry[method.toLowerCase()] = {
        summary: summary || `${method} ${urlPath}`,
        "x-9router-auth": authNote,
        ...(isCatchAll ? { "x-9router-note": "catch-all path segment(s)" } : {}),
        responses: { 200: { description: "See handler source for exact response shape (path+summary-only tier, see plans/2026-09-10-ollama-api-swagger-planning.md §6)" } },
      };
    }
    paths[urlPath] = pathEntry;
  }

  const spec = {
    openapi: "3.1.0",
    info: {
      title: "9Router — Internal/Admin API (path + summary only)",
      version: "1.0.0",
      description:
        "Dashboard/admin API surface — settings, providers, oauth, keys, usage, cli-tools, etc. Lighter documentation tier by design (path + summary + auth requirement, no request/response body schemas) — see plans/2026-09-10-ollama-api-swagger-planning.md §6. Public client-facing API (Ollama + /v1/*) is documented separately at /docs/api (no login required).",
    },
    servers: [{ url: "/" }],
    security: [{ bearerAuth: [] }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", description: "Dashboard JWT session cookie or CLI token — see each path's x-9router-auth note for the exact gate." },
      },
    },
    paths,
  };

  writeFileSync(OUT_PATH, JSON.stringify(spec, null, 2) + "\n", "utf8");
  const roundTrip = JSON.parse(readFileSync(OUT_PATH, "utf8"));
  const methodCount = Object.values(roundTrip.paths).reduce((acc, p) => acc + Object.keys(p).length, 0);
  console.log("OK — wrote", OUT_PATH);
  console.log("route files scanned:", routeFiles.length);
  console.log("paths documented:", Object.keys(roundTrip.paths).length);
  console.log("total operations:", methodCount);
}

main();
