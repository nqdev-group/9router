"use client";

import { useState, useEffect, useCallback } from "react";
import Card from "@/shared/components/Card";

const DEFAULT_KEYWORDS = [
  "username", "user_name", "user",
  "password", "pass", "pwd",
  "apikey", "api_key", "api-key",
  "secretkey", "secret_key", "secret",
  "clientsecret", "client_secret",
  "token", "access_token", "refresh_token",
  "cookie", "session"
];

export default function PrivacyPage() {
  const [privacyEnabled, setPrivacyEnabled] = useState(true);
  const [customKeywords, setCustomKeywords] = useState([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings/privacy")
      .then(res => res.json())
      .then(data => {
        setPrivacyEnabled(data.privacyEnabled);
        setCustomKeywords(data.privacyCustomKeywords || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleAddKeyword = useCallback(() => {
    const kw = newKeyword.trim().toLowerCase();
    if (!kw) return;
    if (!/^[a-z][a-z0-9_-]*$/.test(kw)) return;
    if (customKeywords.includes(kw)) return;
    if (customKeywords.length >= 50) return;
    setCustomKeywords(prev => [...prev, kw]);
    setNewKeyword("");
  }, [newKeyword, customKeywords]);

  const handleRemoveKeyword = useCallback((kw) => {
    setCustomKeywords(prev => prev.filter(k => k !== kw));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/privacy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ privacyCustomKeywords: customKeywords }),
      });
      if (!res.ok) throw new Error("Failed to save");
    } catch (err) {
      console.error("Failed to save privacy config:", err);
    } finally {
      setSaving(false);
    }
  }, [customKeywords]);

  const handleReset = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/privacy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ privacyCustomKeywords: [] }),
      });
      if (res.ok) {
        const data = await res.json();
        setCustomKeywords(data.privacyCustomKeywords || []);
      }
    } catch (err) {
      console.error("Failed to reset privacy config:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleToggleEnabled = useCallback(async (enabled) => {
    setPrivacyEnabled(enabled);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ privacyEnabled: enabled }),
      });
    } catch (err) {
      console.error("Failed to toggle privacy:", err);
      setPrivacyEnabled(!enabled);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Privacy Engine — Sensitive Data Masking</h1>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-sm text-text-muted">Enabled</span>
          <input
            type="checkbox"
            checked={privacyEnabled}
            onChange={(e) => handleToggleEnabled(e.target.checked)}
            className="toggle toggle-primary"
          />
        </label>
      </div>

      {privacyEnabled && (
        <>
          <Card title="Default Keywords" subtitle="Built-in sensitive keywords (read-only)" icon="lock">
            <div className="flex flex-wrap gap-2">
              {DEFAULT_KEYWORDS.map(kw => (
                <span key={kw} className="px-3 py-1 rounded-full bg-surface-2 border border-border-subtle text-sm font-mono text-text-muted">
                  {kw}
                </span>
              ))}
            </div>
            <p className="text-xs text-text-muted/60 mt-3">These keywords are always active. Values matching them are masked before transmission.</p>
          </Card>

          <Card title="Custom Keywords" subtitle="Add extra keywords to mask" icon="edit_note">
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddKeyword()}
                placeholder="e.g. clientid"
                className="flex-1 px-3 py-2 rounded-lg bg-bg border border-border-subtle text-sm focus:outline-none focus:border-primary"
              />
              <button
                onClick={handleAddKeyword}
                disabled={!newKeyword.trim() || customKeywords.length >= 50}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors"
              >
                Add
              </button>
            </div>
            {customKeywords.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {customKeywords.map(kw => (
                  <span key={kw} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-sm font-mono text-amber-600 dark:text-amber-400">
                    {kw}
                    <button
                      onClick={() => handleRemoveKeyword(kw)}
                      className="ml-1 text-amber-400 hover:text-amber-600 transition-colors"
                      aria-label={`Remove ${kw}`}
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted">No custom keywords added.</p>
            )}
          </Card>

          <Card title="Security Notice" subtitle="How masking works" icon="security">
            <div className="space-y-3 text-sm text-text-muted">
              <p>Privacy Engine masks sensitive data <strong>before</strong> it leaves 9Router to the AI provider. Data is processed at these stages:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Object keys matching sensitive keywords have their string values masked</li>
                <li>Patterns like <code className="px-1 rounded bg-surface-2 text-xs">key=value</code>, <code className="px-1 rounded bg-surface-2 text-xs">key: value</code>, <code className="px-1 rounded bg-surface-2 text-xs">&quot;key&quot;: &quot;value&quot;</code> are detected in text</li>
                <li>Each masked value keeps <code className="px-1 rounded bg-surface-2 text-xs">Math.floor(len/2)</code> visible chars, the rest replaced with <code className="px-1 rounded bg-surface-2 text-xs">*</code></li>
                <li>Applied after RTK compression, before provider dispatch</li>
              </ul>
              <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300">
                <strong>&#9888; Warning:</strong> Masking happens client-side. Some providers may reject requests with masked values. Disable if you encounter issues.
              </div>
            </div>
          </Card>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              onClick={handleReset}
              className="px-6 py-2 rounded-lg border border-border-subtle text-text-muted hover:text-text-main hover:border-text-muted transition-colors"
            >
              Reset to Defaults
            </button>
          </div>
        </>
      )}

      {!privacyEnabled && (
        <div className="rounded-lg border border-border-subtle p-8 text-center">
          <p className="text-text-muted mb-2">Privacy Engine is disabled.</p>
          <p className="text-sm text-text-muted/60">Enable it above to mask sensitive data in requests.</p>
        </div>
      )}
    </div>
  );
}
