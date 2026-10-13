"use client";

import { useState, useEffect } from "react";
import { Card, Badge } from "@/shared/components";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";
import { MCP_TOOLS, buildMcpClientConfig } from "@/shared/constants/mcpTools";

function CopyButton({ value, label = "Copy" }) {
  const { copied, copy } = useCopyToClipboard(2000);
  return (
    <button
      onClick={() => copy(value)}
      className="px-2 py-1 rounded-md bg-primary text-white text-[11px] font-medium hover:bg-primary/90 transition-colors cursor-pointer shrink-0 inline-flex items-center gap-1"
      title={value}
    >
      <span className="material-symbols-outlined text-[12px]">
        {copied ? "check" : "content_copy"}
      </span>
      {copied ? "Copied!" : label}
    </button>
  );
}

function ToolRow({ tool }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-[14px] border border-border-subtle bg-surface hover:bg-surface-2 transition-colors">
      <div className="size-9 rounded-lg flex items-center justify-center shrink-0 bg-primary/10 text-primary">
        <span className="material-symbols-outlined text-[18px]">{tool.icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <code className="text-xs font-semibold text-text-main">{tool.name}</code>
          <Badge variant="default" size="sm">
            <code className="text-[10px]">{tool.restEndpoint}</code>
          </Badge>
        </div>
        <p className="text-xs text-text-muted mt-0.5">{tool.title}</p>
      </div>
    </div>
  );
}

export default function McpServerPage() {
  const [baseUrl, setBaseUrl] = useState("");

  // Hydration fix: only access window on client side (same pattern as /dashboard/endpoint)
  useEffect(() => {
    if (typeof window !== "undefined") setBaseUrl(window.location.origin);
  }, []);

  const endpointUrl = `${baseUrl}/v1/mcp`;
  const configJson = JSON.stringify(buildMcpClientConfig(baseUrl || "http://localhost:20128", "sk-..."), null, 2);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card padding="md" title="MCP Server" subtitle="9Router exposed as a native Model Context Protocol server" icon="hub">
        <p className="text-sm text-text-muted mb-4">
          Any MCP-native client (Claude Code, Claude Desktop, Cursor, …) can connect directly and call typed tools instead of
          reading a skill file and hand-building HTTP requests. Same routing, same auth as the REST <code>/v1/*</code> API below.
        </p>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-1.5 py-0.5 rounded shrink-0 min-w-[88px] text-center bg-surface-2 text-text-muted">
            Streamable HTTP
          </span>
          <input
            value={endpointUrl}
            readOnly
            className="flex-1 font-mono text-sm px-3 py-1.5 rounded-lg border border-border-subtle bg-bg text-text-main"
          />
          <CopyButton value={endpointUrl} />
        </div>
      </Card>

      <Card padding="md" title="Client config" subtitle="Example for Claude Code / Claude Desktop" icon="settings">
        <div className="relative">
          <pre className="px-3 py-2 rounded-lg bg-surface-2 font-mono text-[12px] text-text-main overflow-x-auto">
            {configJson}
          </pre>
          <div className="absolute top-2 right-2">
            <CopyButton value={configJson} label="Copy config" />
          </div>
        </div>
        <p className="text-xs text-text-muted mt-2">
          Get a real key from the <a href="/dashboard/endpoint" className="text-primary hover:underline">Endpoint & Key</a> page.
          Omit the <code>headers</code> block entirely if API key auth is disabled.
        </p>
      </Card>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-text-main px-1">{MCP_TOOLS.length} tools</h2>
        {MCP_TOOLS.map((tool) => (
          <ToolRow key={tool.name} tool={tool} />
        ))}
      </div>

      <Card padding="md">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold text-text-main">Full docs & limitations</h2>
            <p className="text-xs text-text-muted mt-0.5">
              Non-streaming chat, video job creation without status polling, and other caveats.
            </p>
          </div>
          <a
            href="https://github.com/decolua/9router/blob/master/skills/9router-mcp/SKILL.md"
            target="_blank"
            rel="noreferrer"
            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
            View on GitHub
          </a>
        </div>
      </Card>
    </div>
  );
}
