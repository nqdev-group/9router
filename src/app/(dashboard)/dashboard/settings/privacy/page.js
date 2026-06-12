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
  const [keywordError, setKeywordError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/privacy");
      const data = await res.json();
      setPrivacyEnabled(data.privacyEnabled);
      setCustomKeywords(data.privacyCustomKeywords || []);
    } catch (err) {
      console.error("Failed to load privacy config:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleAddKeyword = useCallback(() => {
    setKeywordError("");
    const kw = newKeyword.trim().toLowerCase();
    if (!kw) {
      setKeywordError("Enter a keyword.");
      return;
    }
    if (!/^[a-z][a-z0-9_-]*$/.test(kw)) {
      setKeywordError("Keyword must start with a letter and contain only letters, digits, underscores, hyphens.");
      return;
    }
    if (customKeywords.includes(kw)) {
      setKeywordError(`"${kw}" already added.`);
      return;
    }
    if (customKeywords.length >= 50) {
      setKeywordError("Max 50 custom keywords reached.");
      return;
    }
    const updated = [...customKeywords, kw];
    setCustomKeywords(updated);
    setNewKeyword("");
    // Immediately persist so privacy engine picks it up
    setSaving(true);
    fetch("/api/settings/privacy", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ privacyCustomKeywords: updated }),
    })
      .then(res => {
        if (!res.ok) throw new Error("Save failed");
        setSaveMessage("Saved.");
        setTimeout(() => setSaveMessage(""), 2000);
      })
      .catch(err => {
        console.error("Failed to save keyword:", err);
        setCustomKeywords(customKeywords); // revert
        setKeywordError("Failed to save. Try again.");
      })
      .finally(() => setSaving(false));
  }, [newKeyword, customKeywords]);

  const handleRemoveKeyword = useCallback((kw) => {
    const updated = customKeywords.filter(k => k !== kw);
    setCustomKeywords(updated);
    setSaving(true);
    fetch("/api/settings/privacy", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ privacyCustomKeywords: updated }),
    })
      .then(res => {
        if (!res.ok) throw new Error("Save failed");
      })
      .catch(err => {
        console.error("Failed to save after remove:", err);
        setCustomKeywords(customKeywords); // revert
      })
      .finally(() => setSaving(false));
  }, [customKeywords]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveMessage("");
    try {
      const res = await fetch("/api/settings/privacy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ privacyCustomKeywords: customKeywords }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSaveMessage("Settings saved.");
      setTimeout(() => setSaveMessage(""), 2000);
    } catch (err) {
      console.error("Failed to save privacy config:", err);
      setSaveMessage("Save failed.");
    } finally {
      setSaving(false);
    }
  }, [customKeywords]);

  const handleReset = useCallback(async () => {
    setLoading(true);
    setKeywordError("");
    setSaveMessage("");
    try {
      const res = await fetch("/api/settings/privacy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ privacyCustomKeywords: [] }),
      });
      if (!res.ok) throw new Error("Reset failed");
      const data = await res.json();
      setCustomKeywords(data.privacyCustomKeywords || []);
      setSaveMessage("Reset to defaults.");
      setTimeout(() => setSaveMessage(""), 2000);
    } catch (err) {
      console.error("Failed to reset privacy config:", err);
      setSaveMessage("Reset failed.");
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
            <div className="flex gap-2 mb-1">
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => { setNewKeyword(e.target.value); setKeywordError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleAddKeyword()}
                placeholder="e.g. clientid"
                className={`flex-1 px-3 py-2 rounded-lg bg-bg border text-sm focus:outline-none focus:border-primary ${keywordError ? "border-red-500" : "border-border-subtle"}`}
              />
              <button
                onClick={handleAddKeyword}
                disabled={!newKeyword.trim() || customKeywords.length >= 50 || saving}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors"
              >
                Add
              </button>
            </div>
            {keywordError && (
              <p className="text-xs text-red-500 mb-3">{keywordError}</p>
            )}
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

          <div className="flex items-center gap-3 pt-2">
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
            {saveMessage && (
              <span className="text-sm text-emerald-600 dark:text-emerald-400">{saveMessage}</span>
            )}
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
