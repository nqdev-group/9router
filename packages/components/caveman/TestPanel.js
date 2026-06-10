"use client";

import { useState } from "react";
import Card from "@/shared/components/Card";

const SAMPLE_TEXT = `Sure! I'd be happy to help you with that. The issue you're experiencing with the authentication middleware is likely caused by the token expiry check. Looking at the code, the problem is that the comparison uses the less than operator instead of the less than or equal to operator. This means tokens that are exactly at the boundary value are being treated as expired when they should still be valid. I would recommend changing the comparison operator and then running the test suite to verify the fix works correctly.`;

export function TestPanel({ level }) {
  const [sample, setSample] = useState(SAMPLE_TEXT);
  const [saving, setSaving] = useState(false);

  const previewPrompt = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/caveman/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sample, level }),
      });
      const data = await res.json();
      if (data.prompt) {
        alert("Caveman system prompt for this level:\n\n" + data.prompt.slice(0, 500) + "...");
      }
    } catch {
      alert("Could not load preview");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Test Caveman" subtitle="Preview the injection prompt for current level" icon="science">
      <div className="space-y-3">
        <textarea
          value={sample}
          onChange={(e) => setSample(e.target.value)}
          className="w-full h-24 p-3 rounded-lg border border-border-subtle bg-surface text-text-main text-sm font-mono resize-none focus:outline-none focus:border-primary"
          placeholder="Sample response text (for reference only)..."
        />
        <button
          onClick={previewPrompt}
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {saving ? "Loading..." : "Preview System Prompt"}
        </button>
      </div>
    </Card>
  );
}
