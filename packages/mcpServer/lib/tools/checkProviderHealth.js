import { z } from "zod";
import { getProviderConnections } from "@/lib/localDb";
import { classifyConnections } from "@9router/provider-alert";

// Read-only status query — deliberately reuses classifyConnections (pure) instead
// of checkAllAccountsDown (has debounce/alert side effects meant for the Discord
// notification flow in src/sse/services/auth.js). See plans/2026-08-27-mcp-server-tools-planning.md
// §4 Risks for why the two must stay separate.
export const checkProviderHealthTool = {
  name: "check_provider_health",
  title: "Check provider account health",
  description:
    "Check account health per provider (available / temporarily rate-limited / permanently down, e.g. bad auth) — no equivalent REST-facing skill exists for this today (dashboard-only otherwise). Omit `provider` to check every provider that has at least one configured account.",
  inputSchema: {
    provider: z.string().optional().describe("Provider id to check. Omit to check all providers with configured accounts."),
  },
  async handler({ provider }) {
    const allConnections = await getProviderConnections();
    const byProvider = new Map();
    for (const c of allConnections) {
      if (provider && c.provider !== provider) continue;
      if (!byProvider.has(c.provider)) byProvider.set(c.provider, []);
      byProvider.get(c.provider).push(c);
    }

    if (provider && byProvider.size === 0) {
      return {
        isError: true,
        content: [{ type: "text", text: `No configured accounts for provider: ${provider}` }],
      };
    }

    const report = Array.from(byProvider.entries()).map(([providerId, connections]) => {
      const classified = classifyConnections(connections);
      return { provider: providerId, healthy: classified.available > 0, ...classified };
    });

    return { content: [{ type: "text", text: JSON.stringify(report, null, 2) }] };
  },
};
