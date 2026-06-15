"use client";

import { useState, useEffect, useCallback } from "react";
import Card from "@/shared/components/Card";

export default function ProviderAlertPage() {
  const [enabled, setEnabled] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [cooldown, setCooldown] = useState(15);
  const [ignoreProviders, setIgnoreProviders] = useState([]);
  const [newIgnore, setNewIgnore] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/provider-alert");
      const data = await res.json();
      setEnabled(data.providerAlertEnabled);
      setWebhookUrl(data.providerAlertWebhookUrl || "");
      setCooldown(data.providerAlertCooldown ?? 15);
      setIgnoreProviders(data.providerAlertIgnoreProviders || []);
    } catch (err) {
      console.error("Failed to load provider alert config:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveMessage("");
    try {
      const res = await fetch("/api/settings/provider-alert", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerAlertEnabled: enabled,
          providerAlertWebhookUrl: webhookUrl,
          providerAlertCooldown: cooldown,
          providerAlertIgnoreProviders: ignoreProviders,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setEnabled(data.providerAlertEnabled);
      setWebhookUrl(data.providerAlertWebhookUrl);
      setCooldown(data.providerAlertCooldown);
      setIgnoreProviders(data.providerAlertIgnoreProviders);
      setSaveMessage("Settings saved.");
      setTimeout(() => setSaveMessage(""), 2000);
    } catch (err) {
      console.error("Failed to save provider alert config:", err);
      setSaveMessage(err.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }, [enabled, webhookUrl, cooldown, ignoreProviders]);

  const handleToggleEnabled = useCallback(async (val) => {
    setEnabled(val);
    try {
      await fetch("/api/settings/provider-alert", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerAlertEnabled: val }),
      });
    } catch {
      setEnabled(!val);
    }
  }, []);

  const handleAddIgnore = useCallback(() => {
    const val = newIgnore.trim().toLowerCase();
    if (!val || ignoreProviders.includes(val)) return;
    const updated = [...ignoreProviders, val];
    setIgnoreProviders(updated);
    setNewIgnore("");
    setSaving(true);
    fetch("/api/settings/provider-alert", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerAlertIgnoreProviders: updated }),
    })
      .then(res => res.ok || setIgnoreProviders(ignoreProviders))
      .catch(() => setIgnoreProviders(ignoreProviders))
      .finally(() => setSaving(false));
  }, [newIgnore, ignoreProviders]);

  const handleRemoveIgnore = useCallback((val) => {
    const updated = ignoreProviders.filter(v => v !== val);
    setIgnoreProviders(updated);
    setSaving(true);
    fetch("/api/settings/provider-alert", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerAlertIgnoreProviders: updated }),
    })
      .catch(() => setIgnoreProviders(ignoreProviders))
      .finally(() => setSaving(false));
  }, [ignoreProviders]);

  const handleTestWebhook = useCallback(async () => {
    if (!webhookUrl) return;
    setSaveMessage("Sending test...");
    try {
      const { sendDiscordAlert } = await import('@9router/provider-alert');
      const ok = await sendDiscordAlert(webhookUrl, {
        embeds: [{
          title: "Provider Alert Test",
          description: "This is a test message from 9Router Provider Alert.",
          color: 10181046,
          timestamp: new Date().toISOString()
        }]
      });
      setSaveMessage(ok ? "Test message sent!" : "Test failed.");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch {
      setSaveMessage("Test failed.");
    }
  }, [webhookUrl]);

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
        <h1 className="text-2xl font-semibold">Provider Alert — Discord Webhook</h1>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-sm text-text-muted">Enabled</span>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => handleToggleEnabled(e.target.checked)}
            className="toggle toggle-primary"
          />
        </label>
      </div>

      <p className="text-sm text-text-muted/80 -mt-4">
        Send a Discord notification when all accounts in a provider are permanently down (auth errors, disabled accounts).
        Recovery notification sent when an account becomes available again.
      </p>

      {enabled && (
        <>
          <Card title="Discord Webhook URL" subtitle="Enter your Discord channel webhook URL" icon="notifications">
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
              className="w-full px-3 py-2 rounded-lg bg-bg border border-border-subtle text-sm focus:outline-none focus:border-primary"
            />
            <p className="text-xs text-text-muted/60 mt-2">
              Create a webhook in your Discord server channel settings → Integrations → Webhooks.
            </p>
            {webhookUrl && (
              <button
                onClick={handleTestWebhook}
                className="mt-3 px-4 py-1.5 rounded-lg border border-border-subtle text-sm text-text-muted hover:text-text-main hover:border-text-muted transition-colors"
              >
                Send Test
              </button>
            )}
          </Card>

          <Card title="Cooldown" subtitle="Minimum time between alerts per provider" icon="timer">
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={cooldown}
                onChange={(e) => setCooldown(parseInt(e.target.value) || 15)}
                min={1}
                max={1440}
                className="w-24 px-3 py-2 rounded-lg bg-bg border border-border-subtle text-sm focus:outline-none focus:border-primary"
              />
              <span className="text-sm text-text-muted">minutes (1–1440)</span>
            </div>
          </Card>

          <Card title="Ignored Providers" subtitle="Providers excluded from alerts" icon="block">
            <div className="flex gap-2 mb-1">
              <input
                type="text"
                value={newIgnore}
                onChange={(e) => setNewIgnore(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddIgnore()}
                placeholder="e.g. opencode-free"
                className="flex-1 px-3 py-2 rounded-lg bg-bg border border-border-subtle text-sm focus:outline-none focus:border-primary"
              />
              <button
                onClick={handleAddIgnore}
                disabled={!newIgnore.trim()}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors"
              >
                Add
              </button>
            </div>
            {ignoreProviders.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-2">
                {ignoreProviders.map(p => (
                  <span key={p} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-error/10 border border-error/30 text-sm text-error">
                    {p}
                    <button
                      onClick={() => handleRemoveIgnore(p)}
                      className="ml-1 text-error/60 hover:text-error transition-colors"
                      aria-label={`Remove ${p}`}
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted mt-2">No providers ignored.</p>
            )}
          </Card>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            {saveMessage && (
              <span className="text-sm text-emerald-600 dark:text-emerald-400">{saveMessage}</span>
            )}
          </div>
        </>
      )}

      {!enabled && (
        <div className="rounded-lg border border-border-subtle p-8 text-center">
          <p className="text-text-muted mb-2">Provider Alert is disabled.</p>
          <p className="text-sm text-text-muted/60">Enable it above to receive Discord notifications when providers go down.</p>
        </div>
      )}
    </div>
  );
}
