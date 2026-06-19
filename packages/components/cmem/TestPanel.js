"use client";

import { useState } from "react";
import Card from "@/shared/components/Card";

export function CmemTestPanel({ cmemConfig }) {
  const [input, setInput] = useState("");
  const [results, setResults] = useState(null);
  const [testing, setTesting] = useState(false);

  const handleTest = async () => {
    if (!input.trim()) return;
    setTesting(true);
    try {
      const res = await fetch("/api/settings/cmem/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "inject", text: input, targetFormat: "openai" }),
      });
      const data = await res.json();
      setResults(data);
    } catch (err) {
      setResults({ error: "Test failed" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card title="Live Preview" subtitle="Test memory context injection" icon="visibility">
      <div className="space-y-4">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter a prompt to see how CMEM memory context would be injected..."
          className="w-full min-h-[60px] px-3 py-2 rounded-lg bg-bg border border-border-subtle text-sm text-text-main resize-none focus:outline-none focus:border-primary"
          rows={2}
        />
        <div className="flex justify-end">
          <button
            onClick={handleTest}
            disabled={testing}
            className="px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors"
          >
            {testing ? "Testing..." : "Test Injection"}
          </button>
        </div>

        {results && (
          <div className="text-xs space-y-2">
            {results.error ? (
              <p className="text-warning">{results.error}</p>
            ) : (
              <>
                <p className="text-success">Memory context injected.</p>
                {results.messages && results.messages.length > 0 && (
                  <pre className="bg-bg px-2 py-1 rounded max-h-[200px] overflow-auto font-mono text-text-muted">
                    {JSON.stringify(results.messages[0], null, 2)}
                  </pre>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
