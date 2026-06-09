"use client";

import { useState } from "react";
import Card from "@/shared/components/Card";

export function TestPanel({ rtkConfig }) {
  const [input, setInput] = useState("");
  const [results, setResults] = useState(null);
  const [compressing, setCompressing] = useState(false);

  const handleCompress = async () => {
    if (!input.trim()) return;
    setCompressing(true);
    try {
      // Build config for test (filter list or null)
      let testConfig = null;
      if (rtkConfig && rtkConfig.enabledFilters !== null) {
        const enabledFilters = {};
        Object.keys(rtkConfig.enabledFilters).forEach((k) => {
          if (rtkConfig.enabledFilters[k]) enabledFilters[k] = true;
        });
        if (Object.keys(enabledFilters).length > 0) {
          testConfig = { ...rtkConfig, enabledFilters };
        }
      }
      const res = await fetch("/api/settings/rtk/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: input,
          filters: testConfig?.enabledFilters ? Object.keys(testConfig.enabledFilters) : undefined,
        }),
      });
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error("Compression test failed:", err);
      setResults({ error: "Test failed" });
    } finally {
      setCompressing(false);
    }
  };

  return (
    <Card title="Live Preview" subtitle="Test RTK compression on sample text" icon="visibility">
      <div className="space-y-4">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste tool output here (git diff, grep output, etc.) to test compression..."
          className="w-full min-h-[80px] px-3 py-2 rounded-lg bg-bg border border-border-subtle text-sm text-text-main resize-none focus:outline-none focus:border-primary"
          rows={3}
        />
        <div className="flex justify-end">
          <button
            onClick={handleCompress}
            disabled={compressing}
            className="px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors"
          >
            {compressing ? "Testing..." : "Test Compression"}
          </button>
        </div>

        {results && (
          <div className="space-y-3">
            {results.error ? (
              <p className="text-xs text-warning">{results.error}</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="font-medium text-text-main">Original:</span>
                    <span className="font-mono text-text-main">
                      {results.originalLength.toLocaleString()} bytes
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-text-main">Compressed:</span>
                    <span className="font-mono text-primary">
                      {results.compressedLength.toLocaleString()} bytes
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-text-main">Savings:</span>
                    <span className="font-mono text-success">
                      {results.savings.toLocaleString()} bytes
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-text-main">Percent:</span>
                    <span className="font-mono text-success">
                      {results.savingsPercent.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {results.appliedFilters.length > 0 && (
                  <div className="mt-2">
                    <span className="text-xs font-medium text-text-main">
                      Applied filters:
                    </span>{" "}
                    <span className="text-xs text-text-muted">
                      {results.appliedFilters.join(", ")}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {results && !results.error && (
          <div className="border-t border-border-subtle pt-3">
            <p className="text-xs font-semibold text-text-main mb-2">Preview (first 20 lines):</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-text-main">Original:</p>
                <pre className="text-xs font-mono bg-bg px-2 py-1 rounded overflow-auto max-h-[150px]">
                  {input
                    .split("\n")
                    .slice(0, 20)
                    .join("\n")}
                  {input.split("\n").length > 20 && "..."}
                </pre>
              </div>
              <div>
                <p className="text-xs font-semibold text-text-main">Compressed:</p>
                <pre className="text-xs font-mono bg-bg px-2 py-1 rounded overflow-auto max-h-[150px]">
                  {results.compressedText
                    ? results.compressedText
                      .split("\n")
                      .slice(0, 20)
                      .join("\n")
                    : "N/A"}
                  {results.compressedText &&
                  results.compressedText.split("\n").length > 20 && "..."}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
