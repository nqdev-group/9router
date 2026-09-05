"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import Card from "@/shared/components/Card";
import { getProviderByAlias } from "@/shared/constants/providers";

export default function TokenLimitsPage() {
  const [enabled, setEnabled] = useState(false);
  const [models, setModels] = useState([]);
  const [overrides, setOverrides] = useState({}); // saved: { [provider]: { [model]: number } }
  const [draft, setDraft] = useState({}); // edited: { [routedModel]: string }
  const [saveMessage, setSaveMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [settingsRes, modelsRes, limitsRes] = await Promise.all([
        fetch("/api/settings/token-limit-routing"),
        fetch("/api/models"),
        fetch("/api/model-token-limits"),
      ]);
      const settingsData = await settingsRes.json();
      const modelsData = await modelsRes.json();
      const limitsData = await limitsRes.json();

      setEnabled(!!settingsData.tokenLimitRoutingEnabled);
      setModels(modelsData.models || []);
      setOverrides(limitsData || {});
      setDraft({});
    } catch (err) {
      console.error("Failed to load token-limit routing config:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleToggleEnabled = useCallback(async (val) => {
    setEnabled(val);
    try {
      await fetch("/api/settings/token-limit-routing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenLimitRoutingEnabled: val }),
      });
    } catch {
      setEnabled(!val);
    }
  }, []);

  // Group models by provider (same provider key combo.js resolves against —
  // routedModel is "<providerAlias>/<modelId>").
  const byProvider = useMemo(() => {
    const groups = {};
    for (const m of models) {
      const slash = m.routedModel.indexOf("/");
      const provider = slash > 0 ? m.routedModel.slice(0, slash) : m.provider;
      const modelId = slash > 0 ? m.routedModel.slice(slash + 1) : m.model;
      if (!groups[provider]) groups[provider] = [];
      groups[provider].push({ ...m, provider, modelId });
    }
    for (const provider in groups) groups[provider].sort((a, b) => a.modelId.localeCompare(b.modelId));
    return groups;
  }, [models]);

  const currentValue = useCallback((provider, modelId, routedModel) => {
    if (routedModel in draft) return draft[routedModel];
    const override = overrides[provider]?.[modelId];
    return override != null ? String(override) : "";
  }, [draft, overrides]);

  const handleChange = useCallback((routedModel, value) => {
    setDraft((prev) => ({ ...prev, [routedModel]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveMessage("");
    try {
      const payload = {};
      for (const [routedModel, value] of Object.entries(draft)) {
        const trimmed = value.trim();
        if (!trimmed) continue;
        const num = Number(trimmed);
        if (!Number.isFinite(num) || num <= 0) continue;
        const slash = routedModel.indexOf("/");
        const provider = routedModel.slice(0, slash);
        const modelId = routedModel.slice(slash + 1);
        if (!payload[provider]) payload[provider] = {};
        payload[provider][modelId] = num;
      }

      if (Object.keys(payload).length === 0) {
        setSaveMessage("No changes to save.");
        setTimeout(() => setSaveMessage(""), 2000);
        return;
      }

      const res = await fetch("/api/model-token-limits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");

      setOverrides(data);
      setDraft({});
      setSaveMessage("Saved.");
      setTimeout(() => setSaveMessage(""), 2000);
    } catch (err) {
      console.error("Failed to save model token limits:", err);
      setSaveMessage(err.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }, [draft]);

  const handleResetModel = useCallback(async (provider, modelId, routedModel) => {
    try {
      const res = await fetch(`/api/model-token-limits?provider=${encodeURIComponent(provider)}&model=${encodeURIComponent(modelId)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setOverrides(data);
        setDraft((prev) => {
          const next = { ...prev };
          delete next[routedModel];
          return next;
        });
      }
    } catch (err) {
      console.error("Failed to reset model token limit:", err);
    }
  }, []);

  const handleResetAll = useCallback(async () => {
    if (!confirm("Reset all max-input-token overrides to defaults? This cannot be undone.")) return;
    try {
      const res = await fetch("/api/model-token-limits", { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        setOverrides(data);
        setDraft({});
      }
    } catch (err) {
      console.error("Failed to reset model token limits:", err);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const providers = Object.keys(byProvider).sort();

  return (
    <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Token Limit Routing</h1>
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
        When enabled, combo models whose configured max input-token limit is smaller than the
        estimated prompt size are bypassed automatically. Leave a field empty to use the model&apos;s
        default context window. A combo never ends up with zero candidates: if every model would be
        bypassed, the original list is used unchanged and the provider handles the oversized prompt.
      </p>

      {enabled && (
        <>
          {providers.length === 0 && (
            <Card padding="md">
              <p className="text-text-muted">No models available.</p>
            </Card>
          )}

          {providers.map((provider) => {
            const providerInfo = getProviderByAlias(provider);
            const providerName = providerInfo?.name || provider.toUpperCase();
            const providerTitle = providerInfo?.id ? (
              <Link
                href={`/dashboard/providers/${providerInfo.id}`}
                className="hover:text-primary hover:underline transition-colors"
              >
                {providerName}
              </Link>
            ) : (
              providerName
            );
            return (
            <Card key={provider} title={providerTitle} padding="none">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-bg text-text-muted uppercase text-xs">
                    <tr>
                      <th className="px-4 py-2 text-left">Model</th>
                      <th className="px-4 py-2 text-right">Default (context window)</th>
                      <th className="px-4 py-2 text-right">Max input tokens (override)</th>
                      <th className="px-4 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {byProvider[provider].map((m) => {
                      const hasOverride = overrides[provider]?.[m.modelId] != null;
                      return (
                        <tr key={m.routedModel} className="hover:bg-bg/50">
                          <td className="px-4 py-2 font-medium">{m.name || m.modelId}</td>
                          <td className="px-4 py-2 text-right text-text-muted">
                            {m.caps?.contextWindow ? m.caps.contextWindow.toLocaleString() : "—"}
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              min="1"
                              step="1"
                              placeholder={m.caps?.contextWindow ? String(m.caps.contextWindow) : ""}
                              value={currentValue(provider, m.modelId, m.routedModel)}
                              onChange={(e) => handleChange(m.routedModel, e.target.value)}
                              className="w-32 px-2 py-1 text-right bg-bg border border-border-subtle rounded focus:outline-none focus:border-primary"
                            />
                          </td>
                          <td className="px-4 py-2 text-right">
                            {hasOverride && (
                              <button
                                onClick={() => handleResetModel(provider, m.modelId, m.routedModel)}
                                className="text-xs text-text-muted hover:text-error transition-colors"
                              >
                                Reset
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
            );
          })}

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving || Object.keys(draft).length === 0}
              className="px-6 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              onClick={handleResetAll}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm text-error hover:bg-error/10 border border-error/20 transition-colors disabled:opacity-50"
            >
              Reset All to Defaults
            </button>
            {saveMessage && (
              <span className="text-sm text-emerald-600 dark:text-emerald-400">{saveMessage}</span>
            )}
          </div>
        </>
      )}

      {!enabled && (
        <div className="rounded-lg border border-border-subtle p-8 text-center">
          <p className="text-text-muted mb-2">Token Limit Routing is disabled.</p>
          <p className="text-sm text-text-muted/60">Enable it above to configure per-model max input-token limits.</p>
        </div>
      )}
    </div>
  );
}
