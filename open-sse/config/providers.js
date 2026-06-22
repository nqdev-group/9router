import { platform, arch } from "os";

// Barrel: PROVIDERS now built from providers/registry (transport co-located with models)
import { PROVIDERS } from "../providers/index.js";
export { PROVIDERS, PROVIDER_OAUTH } from "../providers/index.js";

// === OS/Arch helpers ===
function mapStainlessOs() {
  switch (platform()) {
    case "darwin": return "MacOS";
    case "win32": return "Windows";
    case "linux": return "Linux";
    case "freebsd": return "FreeBSD";
    default: return `Other::${platform()}`;
  }
}

function mapStainlessArch() {
  switch (arch()) {
    case "x64": return "x64";
    case "arm64": return "arm64";
    case "ia32": return "x86";
    default: return `other::${arch()}`;
  }
}

// Shared Claude-compatible API headers (reused across claude-format providers)
const CLAUDE_API_HEADERS = {
  "Anthropic-Version": "2023-06-01",
  "Anthropic-Beta": "claude-code-20250219,interleaved-thinking-2025-05-14"
};

// Full Claude CLI fingerprint � required by providers that gate on client identity (e.g. agentrouter)
const CLAUDE_CLI_SPOOF_HEADERS = {
  "Anthropic-Version": "2023-06-01",
  "Anthropic-Beta": "claude-code-20250219,oauth-2025-04-20,interleaved-thinking-2025-05-14,context-management-2025-06-27,prompt-caching-scope-2026-01-05,advanced-tool-use-2025-11-20,effort-2025-11-24,structured-outputs-2025-12-15,fast-mode-2026-02-01,redact-thinking-2026-02-12,token-efficient-tools-2026-03-28",
  "Anthropic-Dangerous-Direct-Browser-Access": "true",
  "User-Agent": "claude-cli/2.1.92 (external, sdk-cli)",
  "X-App": "cli",
  "X-Stainless-Helper-Method": "stream",
  "X-Stainless-Retry-Count": "0",
  "X-Stainless-Runtime-Version": "v24.14.0",
  "X-Stainless-Package-Version": "0.80.0",
  "X-Stainless-Runtime": "node",
  "X-Stainless-Lang": "js",
  "X-Stainless-Arch": mapStainlessArch(),
  "X-Stainless-Os": mapStainlessOs(),
  "X-Stainless-Timeout": "600"
};

// Shared baseUrls
const KIMI_CODING_BASE_URL = "https://api.kimi.com/coding/v1/messages";

export const OLLAMA_LOCAL_DEFAULT_HOST = "http://localhost:11434";

export function resolveOllamaLocalHost(credentials) {
  const raw = credentials?.providerSpecificData?.baseUrl?.trim();
  return (raw || OLLAMA_LOCAL_DEFAULT_HOST).replace(/\/$/, "");
}

// Region URLs single-source from registry xiaomi-tokenplan.transport
export const XIAOMI_TOKENPLAN_REGIONS = PROVIDERS["xiaomi-tokenplan"]?.regions || {};
export const XIAOMI_TOKENPLAN_DEFAULT_REGION = PROVIDERS["xiaomi-tokenplan"]?.defaultRegion;

export function resolveXiaomiTokenplanBaseUrl(credentials) {
  const region = credentials?.providerSpecificData?.region;
  return XIAOMI_TOKENPLAN_REGIONS[region] || XIAOMI_TOKENPLAN_REGIONS[XIAOMI_TOKENPLAN_DEFAULT_REGION];
}
