"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Card,
  Button,
  CardSkeleton,
  ModelSelectModalV2,
  ConfirmModal,
  CapacityBadges,
  ComboFormModal,
  Modal,
  Input,
} from "@/shared/components";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";
import { CAPACITY_META } from "@/shared/constants/models";

/* ── constants ─────────────────────────────────────────── */

const VALID_NAME_REGEX = /^[a-zA-Z0-9_.\-]+$/;

const STRATEGY_OPTIONS = [
  { value: "fallback", label: "Fallback", icon: "vertical_align_bottom", desc: "Try models in order" },
  { value: "round-robin", label: "Round Robin", icon: "sync", desc: "Rotate across requests" },
  { value: "fusion", label: "Fusion", icon: "call_split", desc: "Panel + judge (N+1 calls)" },
];

const STRATEGY_COLORS = {
  fallback: {
    border: "border-l-emerald-500 dark:border-l-emerald-400",
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30",
    dot: "bg-emerald-500",
    step: "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
  },
  "round-robin": {
    border: "border-l-sky-500 dark:border-l-sky-400",
    badge: "bg-sky-500/10 text-sky-700 dark:text-sky-300 ring-sky-500/30",
    dot: "bg-sky-500",
    step: "border-sky-500 text-sky-600 dark:text-sky-400 bg-sky-500/10",
  },
  fusion: {
    border: "border-l-amber-500 dark:border-l-amber-400",
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/30",
    dot: "bg-amber-500",
    step: "border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/10",
  },
};

function splitModel(entry) {
  if (typeof entry !== "string") return { prefix: "", name: entry };
  const idx = entry.indexOf("/");
  if (idx < 0) return { prefix: "", name: entry };
  return { prefix: entry.slice(0, idx), name: entry.slice(idx + 1) };
}

/* ── helpers ── */

// Compute union of capabilities across all models in a combo
function computeComboCaps(models, capsMap) {
  const union = {};
  for (const m of models) {
    const c = capsMap[m];
    if (!c) continue;
    for (const [k, v] of Object.entries(c))
      if (v === true) union[k] = true;
  }
  return union;
}

/* ── main page ─────────────────────────────────────────── */

export default function CombosV2Page() {
  const [combos, setCombos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeProviders, setActiveProviders] = useState([]);
  const [comboStrategies, setComboStrategies] = useState({});
  const [modelCaps, setModelCaps] = useState({});
  const [modelAliases, setModelAliases] = useState({});
  const [confirmState, setConfirmState] = useState(null);
  const [pendingModels, setPendingModels] = useState({});
  const { copied, copy } = useCopyToClipboard();

  /* search */
  const [searchQuery, setSearchQuery] = useState("");

  /* modals */
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCombo, setEditingCombo] = useState(null);
  const [modelSelectorTarget, setModelSelectorTarget] = useState(null);
  const [judgeSelectorTarget, setJudgeSelectorTarget] = useState(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const [bulkAddTarget, setBulkAddTarget] = useState(null); // combo.id
  const [bulkAddText, setBulkAddText] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [combosRes, providersRes, settingsRes, modelsRes, aliasesRes] =
        await Promise.all([
          fetch("/api/combos"),
          fetch("/api/providers"),
          fetch("/api/settings"),
          fetch("/api/models"),
          fetch("/api/models/alias"),
        ]);
      const combosData = await combosRes.json();
      const providersData = await providersRes.json();
      const settingsData = settingsRes.ok ? await settingsRes.json() : {};

      if (combosRes.ok)
        setCombos((combosData.combos || []).filter((c) => !c.kind || c.kind === "llm"));
      if (providersRes.ok) setActiveProviders(providersData.connections || []);
      if (modelsRes.ok) {
        const md = await modelsRes.json();
        const map = {};
        for (const m of md.models || []) if (m.caps) map[m.fullModel] = m.caps;
        setModelCaps(map);
      }
      if (aliasesRes.ok) {
        const ad = await aliasesRes.json();
        setModelAliases(ad.aliases || {});
      }
      setComboStrategies(settingsData.comboStrategies || {});
    } catch (error) {
      console.log("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  /* ── API helpers ── */

  const saveModels = async (combo, models) => {
    const prev = combos.find((c) => c.id === combo.id);
    setCombos((cur) => cur.map((c) => (c.id === combo.id ? { ...c, models } : c)));
    setPendingModels((p) => ({ ...p, [combo.id]: true }));
    const res = await fetch(`/api/combos/${combo.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ models }),
    });
    setPendingModels((p) => ({ ...p, [combo.id]: false }));
    if (!res.ok) {
      if (prev) setCombos((cur) => cur.map((c) => (c.id === prev.id ? prev : c)));
      const err = await res.json().catch(() => ({}));
      alert(err.error || "Failed to save");
      return false;
    }
    return true;
  };

  const handleSetStrategy = async (comboName, patch) => {
    try {
      const updated = { ...comboStrategies };
      const next = { ...(updated[comboName] || {}), ...patch };
      if (!next.fallbackStrategy || next.fallbackStrategy === "fallback") {
        delete updated[comboName];
      } else {
        updated[comboName] = next;
      }
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comboStrategies: updated }),
      });
      setComboStrategies(updated);
    } catch (error) {
      console.log("Error updating strategy:", error);
    }
  };

  const handleDelete = (combo) => {
    setConfirmState({
      title: "Delete Combo",
      message: `Delete combo "${combo.name}"? This cannot be undone.`,
      onConfirm: async () => {
        setConfirmState(null);
        try {
          const res = await fetch(`/api/combos/${combo.id}`, { method: "DELETE" });
          if (res.ok) setCombos((prev) => prev.filter((c) => c.id !== combo.id));
        } catch (error) {
          console.log("Error deleting combo:", error);
        }
      },
    });
  };

  /* Duplicate: clone combo with auto-increment name */
  const handleDuplicate = async (combo) => {
    const exists = (name) => combos.some((c) => c.name === name);
    let counter = 1;
    let newName = `${combo.name}-copy`;
    while (exists(newName)) {
      counter++;
      newName = `${combo.name}-copy-${counter}`;
    }
    const res = await fetch("/api/combos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, models: combo.models, kind: combo.kind || null }),
    });
    if (res.ok) {
      const created = await res.json();
      setCombos((prev) => [...prev, created]);
    } else {
      const err = await res.json();
      alert(err.error || "Failed to duplicate");
    }
  };

  /* Export: copy JSON to clipboard */
  const handleExportConfig = (combo, strategy) => {
    const payload = {
      name: combo.name,
      models: combo.models,
      kind: combo.kind || null,
      strategy: strategy.fallbackStrategy || "fallback",
      judgeModel: strategy.judgeModel || "",
    };
    copy(JSON.stringify(payload, null, 2), `export-${combo.id}`);
  };

  /* Import: parse JSON array of combos, create each */
  const handleImport = async () => {
    setImportError("");
    let parsed;
    try {
      parsed = JSON.parse(importText);
    } catch {
      setImportError("Invalid JSON. Must be a single combo object or array of combo objects.");
      return;
    }
    const items = Array.isArray(parsed) ? parsed : [parsed];
    let ok = 0;
    let fail = 0;
    for (const item of items) {
      if (!item.name || !item.models) { fail++; continue; }
      try {
        const res = await fetch("/api/combos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: item.name,
            models: item.models,
            kind: item.kind || null,
          }),
        });
        if (res.ok) {
          ok++;
          // Set strategy if non-default
          if (item.strategy && item.strategy !== "fallback" || item.judgeModel) {
            await handleSetStrategy(item.name, {
              fallbackStrategy: item.strategy || "fallback",
              judgeModel: item.judgeModel || "",
            });
          }
        } else {
          fail++;
        }
      } catch {
        fail++;
      }
    }
    await fetchData();
    setImportModalOpen(false);
    setImportText("");
    alert(`Imported ${ok} combo(s)${fail > 0 ? ` (${fail} failed)` : ""}`);
  };

  /* Bulk add: add multiple models at once */
  const handleBulkAdd = async (combo) => {
    const candidates = bulkAddText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !combo.models.includes(l));
    if (candidates.length === 0) return;
    await saveModels(combo, [...combo.models, ...candidates]);
    setBulkAddTarget(null);
    setBulkAddText("");
  };

  /* ── filter combos by search ── */
  const filteredCombos = useMemo(() => {
    if (!searchQuery.trim()) return combos;
    const q = searchQuery.toLowerCase();
    return combos.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.models.some((m) => m.toLowerCase().includes(q))
    );
  }, [combos, searchQuery]);

  /* ── loading state ── */

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  /* ── render ── */

  return (
    <div className="flex min-w-0 flex-col gap-8 px-1 sm:px-0">
      {/* ── header ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="w-full sm:w-auto">
          <div className="flex items-center flex-wrap gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Combos Pipeline</h1>
            <Button size="sm" variant="ghost" icon="upload" onClick={() => setImportModalOpen(true)} className="text-xs">
              Import
            </Button>
          </div>
          <p className="text-sm text-text-muted mt-1">
            Chain models with fallback, load balancing, or parallel fusion
            &mdash; every model is visible and manageable at a glance.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            {STRATEGY_OPTIONS.map((s) => (
              <span
                key={s.value}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface border border-border-subtle text-[11px] text-text-muted"
              >
                <span className={`size-2 rounded-full ${STRATEGY_COLORS[s.value].dot}`} />
                {s.label}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto">
          <Button
            icon="add"
            onClick={() => setShowCreateModal(true)}
            className="w-full sm:w-auto whitespace-nowrap shrink-0"
          >
            Create Combo
          </Button>
        </div>
      </div>

      {/* ── search ── */}
      <div className="relative w-full sm:max-w-xs">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[16px]">
          search
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search combos or models..."
          className="w-full pl-8 pr-3 py-1.5 bg-surface border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 text-text-main"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main"
          >
            <span className="material-symbols-outlined text-[14px]">close</span>
          </button>
        )}
      </div>

      {/* ── content ── */}
      {filteredCombos.length === 0 ? (
        <Card>
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/5 text-primary/40 mb-6">
              <span className="material-symbols-outlined text-[40px]">account_tree</span>
            </div>
            <p className="text-lg font-semibold text-text-main mb-2">
              {searchQuery ? "No matches found" : "No combos yet"}
            </p>
            <p className="text-sm text-text-muted mb-6 max-w-sm mx-auto">
              {searchQuery
                ? `No combos matching "${searchQuery}". Try a different search.`
                : "Create model combos to enable automatic fallback, load balancing, or parallel panel judging."}
            </p>
            {searchQuery ? (
              <Button variant="secondary" onClick={() => setSearchQuery("")}>Clear Search</Button>
            ) : (
              <Button icon="add" onClick={() => setShowCreateModal(true)}>Create Combo</Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-5">
          {filteredCombos.map((combo) => {
            const strategy = comboStrategies[combo.name] || {};
            const currentStrategy = strategy.fallbackStrategy || "fallback";
            const sc = STRATEGY_COLORS[currentStrategy];
            const isFusion = currentStrategy === "fusion";
            const judge = strategy.judgeModel || "";
            const isPending = pendingModels[combo.id];
            const comboCapUnion = computeComboCaps(combo.models, modelCaps);

            return (
              <ComboPanel
                key={combo.id}
                combo={combo}
                strategy={currentStrategy}
                strategyColors={sc}
                isFusion={isFusion}
                judge={judge}
                modelCaps={modelCaps}
                comboCapUnion={comboCapUnion}
                copied={copied}
                onCopy={copy}
                isPending={isPending}
                onSetStrategy={(patch) => handleSetStrategy(combo.name, patch)}
                onEdit={() => setEditingCombo(combo)}
                onDelete={() => handleDelete(combo)}
                onDuplicate={() => handleDuplicate(combo)}
                onExport={() => handleExportConfig(combo, strategy)}
                onOpenModelSelector={() => setModelSelectorTarget(combo.id)}
                onOpenJudgeSelector={() => setJudgeSelectorTarget(combo.id)}
                onOpenBulkAdd={() => setBulkAddTarget(combo.id)}
                onMoveModel={(idx, dir) => {
                  const next = [...combo.models];
                  const swap = idx + dir;
                  if (swap < 0 || swap >= next.length) return;
                  [next[idx], next[swap]] = [next[swap], next[idx]];
                  saveModels(combo, next);
                }}
                onRemoveModel={(idx) => {
                  if (combo.models.length === 1) {
                    setConfirmState({
                      title: "Remove Last Model",
                      message: "This combo will have no models. Continue?",
                      onConfirm: () => {
                        setConfirmState(null);
                        saveModels(combo, combo.models.filter((_, i) => i !== idx));
                      },
                    });
                  } else {
                    saveModels(combo, combo.models.filter((_, i) => i !== idx));
                  }
                }}
                onEditModel={async (oldModel, newModel) => {
                  if (oldModel === newModel) return;
                  const next = [...combo.models];
                  const idx = next.indexOf(oldModel);
                  if (idx >= 0) {
                    next[idx] = newModel;
                    await saveModels(combo, next);
                  }
                }}
              />
            );
          })}
        </div>
      )}

      {/* ── modals ── */}
      <ComboFormModal
        key="create"
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreate}
        activeProviders={activeProviders}
      />
      <ComboFormModal
        key={editingCombo?.id || "edit"}
        isOpen={!!editingCombo}
        combo={editingCombo}
        onClose={() => setEditingCombo(null)}
        onSave={(data) => handleUpdate(editingCombo.id, data)}
        activeProviders={activeProviders}
      />

      {modelSelectorTarget &&
        (() => {
          const combo = combos.find((c) => c.id === modelSelectorTarget);
          if (!combo) return null;
          return (
            <ModelSelectModalV2
              key={modelSelectorTarget}
              isOpen
              onClose={() => setModelSelectorTarget(null)}
              onSelect={(m) => {
                const val = m?.value || m;
                if (!val || combo.models.includes(val)) return;
                saveModels(combo, [...combo.models, val]);
              }}
              onDeselect={(m) => {
                const val = m?.value || m;
                const idx = combo.models.indexOf(val);
                if (idx >= 0) saveModels(combo, combo.models.filter((_, i) => i !== idx));
              }}
              activeProviders={activeProviders}
              modelAliases={modelAliases}
              title="Add Model"
              addedModelValues={combo.models}
              closeOnSelect={false}
            />
          );
        })()}

      {judgeSelectorTarget &&
        (() => {
          const combo = combos.find((c) => c.id === judgeSelectorTarget);
          if (!combo) return null;
          return (
            <ModelSelectModalV2
              key={`judge-${judgeSelectorTarget}`}
              isOpen
              onClose={() => setJudgeSelectorTarget(null)}
              onSelect={(m) => {
                handleSetStrategy(combo.name, { judgeModel: m?.value || "" });
                setJudgeSelectorTarget(null);
              }}
              activeProviders={activeProviders}
              modelAliases={modelAliases}
              title="Select Judge Model"
              addedModelValues={
                (comboStrategies[combo.name] || {}).judgeModel ? [(comboStrategies[combo.name] || {}).judgeModel] : []
              }
              closeOnSelect
            />
          );
        })()}

      {/* ── Import Modal ── */}
      <Modal isOpen={importModalOpen} onClose={() => { setImportModalOpen(false); setImportText(""); setImportError(""); }} title="Import Combos">
        <div className="flex flex-col gap-3">
          <p className="text-xs text-text-muted">
            Paste a JSON config (single combo or array of combos). Each object: <code className="font-mono text-[11px] bg-black/[0.04] dark:bg-white/[0.04] px-1 rounded">{`{ name, models, kind?, strategy?, judgeModel? }`}</code>
          </p>
          <textarea
            value={importText}
            onChange={(e) => { setImportText(e.target.value); setImportError(""); }}
            placeholder='[{"name": "my-combo", "models": ["cc/claude-sonnet-4-5", "kr/gpt-4o"]}]'
            className="w-full h-32 resize-y rounded border border-border bg-surface px-3 py-2 text-xs font-mono text-text-main outline-none focus:border-primary/50"
          />
          {importError && <p className="text-xs text-red-500">{importError}</p>}
          <div className="flex gap-2">
            <Button variant="ghost" fullWidth onClick={() => { setImportModalOpen(false); setImportText(""); setImportError(""); }}>
              Cancel
            </Button>
            <Button fullWidth onClick={handleImport} disabled={!importText.trim()}>
              Import
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Bulk Add Modal ── */}
      {bulkAddTarget &&
        (() => {
          const combo = combos.find((c) => c.id === bulkAddTarget);
          if (!combo) return null;
          return (
            <Modal isOpen onClose={() => { setBulkAddTarget(null); setBulkAddText(""); }} title={`Add Models to "${combo.name}"`}>
              <div className="flex flex-col gap-3">
                <p className="text-xs text-text-muted">
                  Paste model IDs, one per line. Duplicates and existing models are skipped.
                </p>
                <textarea
                  value={bulkAddText}
                  onChange={(e) => setBulkAddText(e.target.value)}
                  placeholder={`cc/claude-sonnet-4-5\nkr/gpt-4o\nglm/glm-5.1`}
                  className="w-full h-28 resize-y rounded border border-border bg-surface px-3 py-2 text-xs font-mono text-text-main outline-none focus:border-primary/50"
                />
                {(() => {
                  const candidates = bulkAddText.split("\n").map((l) => l.trim()).filter((l) => l && !combo.models.includes(l));
                  if (!bulkAddText.trim()) return null;
                  return (
                    <p className="text-[11px] text-text-muted">
                      {candidates.length} new model{candidates.length !== 1 ? "s" : ""} will be added
                    </p>
                  );
                })()}
                <div className="flex gap-2">
                  <Button variant="ghost" fullWidth onClick={() => { setBulkAddTarget(null); setBulkAddText(""); }}>
                    Cancel
                  </Button>
                  <Button fullWidth disabled={!bulkAddText.trim()} onClick={() => handleBulkAdd(combo)}>
                    Add All
                  </Button>
                </div>
              </div>
            </Modal>
          );
        })()}

      <ConfirmModal
        isOpen={!!confirmState}
        onClose={() => setConfirmState(null)}
        onConfirm={confirmState?.onConfirm}
        title={confirmState?.title || "Confirm"}
        message={confirmState?.message}
        variant="danger"
      />
    </div>
  );

  /* ── inline handlers that need state ── */

  async function handleCreate(data) {
    const res = await fetch("/api/combos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setShowCreateModal(false);
      await fetchData();
    } else {
      const err = await res.json();
      alert(err.error || "Failed to create combo");
    }
  }

  async function handleUpdate(id, data) {
    const res = await fetch(`/api/combos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setEditingCombo(null);
      await fetchData();
    } else {
      const err = await res.json();
      alert(err.error || "Failed to update combo");
    }
  }
}

/* ── ComboPanel ─────────────────────────────────────────── */

function ComboPanel({
  combo,
  strategy,
  strategyColors,
  isFusion,
  judge,
  modelCaps,
  comboCapUnion,
  copied,
  onCopy,
  isPending,
  onSetStrategy,
  onEdit,
  onDelete,
  onDuplicate,
  onExport,
  onOpenModelSelector,
  onOpenJudgeSelector,
  onOpenBulkAdd,
  onMoveModel,
  onRemoveModel,
  onEditModel,
}) {
  const capKeys = Object.keys(comboCapUnion || {});

  return (
    <Card
      padding="none"
      className={`overflow-hidden border-l-4 ${strategyColors.border} transition-all`}
    >
      {/* ── header row ── */}
      <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3 border-b border-border-subtle">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <code className="text-base font-semibold font-mono text-text-main truncate">
              {combo.name}
            </code>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${strategyColors.badge}`}
            >
              <span className={`size-1.5 rounded-full ${strategyColors.dot}`} />
              {STRATEGY_OPTIONS.find((s) => s.value === strategy)?.label || strategy}
            </span>
            {/* Combo-level capability summary */}
            {capKeys.length > 0 && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-black/[0.03] dark:bg-white/[0.03] text-[10px] text-text-muted">
                {capKeys.map((k) => {
                  const meta = CAPACITY_META[k];
                  if (!meta) return null;
                  return (
                    <span key={k} className={`material-symbols-outlined leading-none ${meta.color}`} style={{ fontSize: "12px" }}>
                      {meta.icon}
                    </span>
                  );
                })}
              </span>
            )}
            {isPending && (
              <span className="material-symbols-outlined animate-spin text-[14px] text-text-muted">progress_activity</span>
            )}
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            {combo.models.length} model{combo.models.length !== 1 ? "s" : ""} in chain
            &nbsp;&middot;&nbsp;
            {strategy === "fusion"
              ? "Parallel — all models queried, judge synthesizes"
              : strategy === "round-robin"
                ? "Load-balanced — requests rotate across models"
                : "Sequential — next model on failure"}
          </p>
        </div>

        {/* actions */}
        <div className="flex items-center gap-0.5 shrink-0">
          <TooltipBtn text={copied === `combo-${combo.id}` ? "Copied!" : "Copy combo name"}>
            <button
              onClick={(e) => { e.stopPropagation(); onCopy(combo.name, `combo-${combo.id}`); }}
              className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-surface-2 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">
                {copied === `combo-${combo.id}` ? "check" : "content_copy"}
              </span>
            </button>
          </TooltipBtn>
          <TooltipBtn text="Duplicate combo">
            <button
              onClick={onDuplicate}
              className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-surface-2 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">copy_all</span>
            </button>
          </TooltipBtn>
          <TooltipBtn text="Export config (JSON)">
            <button
              onClick={onExport}
              className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-surface-2 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">
                {copied === `export-${combo.id}` ? "check" : "file_download"}
              </span>
            </button>
          </TooltipBtn>
          <TooltipBtn text="Edit combo name & models">
            <button
              onClick={onEdit}
              className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-surface-2 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
            </button>
          </TooltipBtn>
          <TooltipBtn text="Delete combo">
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </TooltipBtn>
        </div>
      </div>

      {/* ── body ── */}
      <div className="px-5 py-4">
        {/* strategy toggle */}
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border-subtle flex-wrap">
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Route</span>
          <div className="flex gap-1">
            {STRATEGY_OPTIONS.map((s) => {
              const active = strategy === s.value;
              const c = STRATEGY_COLORS[s.value];
              return (
                <button
                  key={s.value}
                  onClick={() => onSetStrategy({ fallbackStrategy: s.value })}
                  className={`px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-all flex items-center gap-1.5 ${
                    active
                      ? `${c.badge} ring-1 ring-inset ${c.dot.replace("bg-", "ring-")}/40`
                      : "text-text-muted hover:text-text-main hover:bg-surface-2"
                  }`}
                >
                  <span className={`size-1.5 rounded-full ${c.dot} ${active ? "" : "opacity-40"}`} />
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── model chain ── */}
        <div className="space-y-1.5">
          {combo.models.map((model, idx) => (
            <ModelRow
              key={`${model}-${idx}`}
              index={idx}
              model={model}
              caps={modelCaps[model]}
              isFirst={idx === 0}
              isLast={idx === combo.models.length - 1}
              total={combo.models.length}
              color={strategyColors}
              disabled={isPending}
              onMoveUp={() => onMoveModel(idx, -1)}
              onMoveDown={() => onMoveModel(idx, 1)}
              onRemove={() => onRemoveModel(idx)}
              onEdit={async (oldModel, newModel) => {
                await onEditModel(oldModel, newModel);
              }}
            />
          ))}
        </div>

        {/* add model buttons */}
        <div className="flex gap-2 mt-2.5">
          <button
            onClick={onOpenModelSelector}
            disabled={isPending}
            className="flex-1 py-2.5 border-2 border-dashed border-border-subtle rounded-xl text-xs font-medium text-text-muted hover:text-primary hover:border-primary/40 transition-all flex items-center justify-center gap-1.5 group disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[16px] group-hover:scale-110 transition-transform">add</span>
            Add Model
          </button>
          <button
            onClick={onOpenBulkAdd}
            disabled={isPending}
            className="py-2.5 px-3 border-2 border-dashed border-border-subtle rounded-xl text-xs font-medium text-text-muted hover:text-primary hover:border-primary/40 transition-all flex items-center gap-1.5 group disabled:opacity-40 disabled:cursor-not-allowed"
            title="Bulk add models"
          >
            <span className="material-symbols-outlined text-[16px] group-hover:scale-110 transition-transform">content_paste</span>
          </button>
        </div>

        {/* fusion judge */}
        {isFusion && (
          <div className="mt-4 pt-3 border-t border-border-subtle flex items-center gap-2 flex-wrap">
            <span className="material-symbols-outlined text-[16px] text-amber-500">gavel</span>
            <span className="text-[12px] font-medium text-text-muted">Judge:</span>
            <button
              onClick={onOpenJudgeSelector}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/5 border border-amber-500/20 text-[12px] font-mono text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 hover:border-amber-500/40 transition-colors"
            >
              <span className="truncate max-w-[200px]">{judge || `Auto — ${combo.models[0] || "first model"}`}</span>
              <span className="material-symbols-outlined text-[14px] shrink-0">expand_more</span>
            </button>
            {judge && (
              <button onClick={() => onSetStrategy({ judgeModel: "" })}
                className="p-1 rounded text-text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors" title="Reset to Auto">
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            )}
            <span className="text-[11px] text-text-muted ml-auto">The model that fuses panel answers</span>
          </div>
        )}
      </div>
    </Card>
  );
}

/* ── ModelRow ───────────────────────────────────────────── */

function ModelRow({
  index,
  model,
  caps,
  isFirst,
  isLast,
  total,
  color,
  disabled,
  onMoveUp,
  onMoveDown,
  onRemove,
  onEdit,
}) {
  const { prefix, name } = splitModel(model);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(model);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== model) {
      onEdit(model, trimmed);
    } else {
      setDraft(model);
    }
    setEditing(false);
  };

  return (
    <div className={`group flex items-stretch gap-0 min-w-0 ${disabled ? "opacity-60 pointer-events-none" : ""}`}>
      <div className="flex flex-col items-center w-7 shrink-0 pt-1.5">
        <div
          className={`size-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold leading-none transition-colors ${color.step}`}
        >
          {index + 1}
        </div>
        {index < total - 1 && <div className="w-px flex-1 min-h-[8px] bg-border-subtle mt-0.5" />}
      </div>

      <div className="flex-1 min-w-0 flex items-center gap-2 pl-2.5 py-1.5 rounded-lg hover:bg-surface-2/50 transition-colors">
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") { setDraft(model); setEditing(false); }
              }}
              className="w-full rounded border border-primary/40 bg-white px-1.5 py-0.5 font-mono text-xs text-text-main outline-none dark:bg-black/20"
            />
          ) : (
            <div className="flex items-center gap-1.5 min-w-0">
              {prefix && (
                <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider shrink-0">{prefix}</span>
              )}
              <span
                className="font-mono text-xs text-text-main truncate cursor-text hover:text-primary transition-colors"
                onClick={() => { setDraft(model); setEditing(true); }}
                title="Click to edit"
              >/{name}</span>
              {caps && (
                <span className="shrink-0 flex items-center">
                  <CapacityBadges caps={caps} size={13} className="gap-0" />
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onMoveUp} disabled={isFirst}
            className={`p-1 rounded ${isFirst ? "text-text-muted/20 cursor-not-allowed" : "text-text-muted hover:text-primary hover:bg-surface-2"}`} title="Move up">
            <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
          </button>
          <button onClick={onMoveDown} disabled={isLast}
            className={`p-1 rounded ${isLast ? "text-text-muted/20 cursor-not-allowed" : "text-text-muted hover:text-primary hover:bg-surface-2"}`} title="Move down">
            <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
          </button>
          <button onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="p-1 rounded text-text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors" title="Remove">
            <span className="material-symbols-outlined text-[14px]">close</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── TooltipBtn wrapper ──────────────────────────────────── */

function TooltipBtn({ text, children }) {
  return (
    <span className="relative inline-flex group/tt">
      {children}
      <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 z-50 w-max max-w-56 rounded px-2 py-1 text-[11px] leading-snug bg-gray-900 text-white opacity-0 group-hover/tt:opacity-100 transition-opacity duration-150 whitespace-nowrap">
        {text}
      </span>
    </span>
  );
}
