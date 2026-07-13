"use client";

import { useState, useEffect } from "react";
import {
  Card,
  Button,
  CardSkeleton,
  ModelSelectModal,
  ConfirmModal,
  CapacityBadges,
  ComboFormModal,
} from "@/shared/components";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";

/* ── constants ─────────────────────────────────────────── */

const VALID_NAME_REGEX = /^[a-zA-Z0-9_.\-]+$/;

const STRATEGY_OPTIONS = [
  { value: "fallback", label: "Fallback", icon: "vertical_align_bottom", desc: "Try models in order" },
  { value: "round-robin", label: "Round Robin", icon: "sync", desc: "Rotate across requests" },
  { value: "fusion", label: "Fusion", icon: "call_split", desc: "Panel + judge (N+1 calls)" },
];

/* Each strategy gets a distinct color family — industrial panel aesthetic */
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

/* ── main page ─────────────────────────────────────────── */

export default function CombosV2Page() {
  const [combos, setCombos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeProviders, setActiveProviders] = useState([]);
  const [comboStrategies, setComboStrategies] = useState({});
  const [modelCaps, setModelCaps] = useState({});
  const [modelAliases, setModelAliases] = useState({});
  const [confirmState, setConfirmState] = useState(null);
  const [pendingModels, setPendingModels] = useState({}); // combo.id → true while saving
  const { copied, copy } = useCopyToClipboard();

  /* modals */
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCombo, setEditingCombo] = useState(null);
  const [modelSelectorTarget, setModelSelectorTarget] = useState(null); // combo.id
  const [judgeSelectorTarget, setJudgeSelectorTarget] = useState(null); // combo.id

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
        setCombos(
          (combosData.combos || []).filter(
            (c) => !c.kind || c.kind === "llm"
          )
        );
      if (providersRes.ok)
        setActiveProviders(providersData.connections || []);
      if (modelsRes.ok) {
        const md = await modelsRes.json();
        const map = {};
        for (const m of md.models || [])
          if (m.caps) map[m.fullModel] = m.caps;
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

  // Optimistic save: update local state immediately, revert on error
  const saveModels = async (combo, models) => {
    const prev = combos.find((c) => c.id === combo.id);
    // Optimistic update
    setCombos((prev) =>
      prev.map((c) => (c.id === combo.id ? { ...c, models } : c))
    );
    setPendingModels((p) => ({ ...p, [combo.id]: true }));
    const res = await fetch(`/api/combos/${combo.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ models }),
    });
    setPendingModels((p) => ({ ...p, [combo.id]: false }));
    if (!res.ok) {
      // Revert on error
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
          const res = await fetch(`/api/combos/${combo.id}`, {
            method: "DELETE",
          });
          if (res.ok)
            setCombos((prev) => prev.filter((c) => c.id !== combo.id));
        } catch (error) {
          console.log("Error deleting combo:", error);
        }
      },
    });
  };

  const handleCreate = async (data) => {
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
  };

  const handleUpdate = async (id, data) => {
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
  };

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
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Combos Pipeline
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Chain models with fallback, load balancing, or parallel fusion
            &mdash; every model is visible and manageable at a glance.
          </p>
          {/* Strategy legend */}
          <div className="flex flex-wrap gap-2 mt-3">
            {STRATEGY_OPTIONS.map((s) => (
              <span
                key={s.value}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface border border-border-subtle text-[11px] text-text-muted"
              >
                <span
                  className={`size-2 rounded-full ${STRATEGY_COLORS[s.value].dot}`}
                />
                {s.label}
              </span>
            ))}
          </div>
        </div>
        <Button
          icon="add"
          onClick={() => setShowCreateModal(true)}
          className="w-full sm:w-auto whitespace-nowrap shrink-0"
        >
          Create Combo
        </Button>
      </div>

      {/* ── content ── */}
      {combos.length === 0 ? (
        <Card>
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/5 text-primary/40 mb-6">
              <span className="material-symbols-outlined text-[40px]">
                account_tree
              </span>
            </div>
            <p className="text-lg font-semibold text-text-main mb-2">
              No combos yet
            </p>
            <p className="text-sm text-text-muted mb-6 max-w-sm mx-auto">
              Create model combos to enable automatic fallback, load balancing,
              or parallel panel judging.
            </p>
            <Button
              icon="add"
              onClick={() => setShowCreateModal(true)}
            >
              Create Combo
            </Button>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-5">
          {combos.map((combo) => {
            const strategy = comboStrategies[combo.name] || {};
            const currentStrategy = strategy.fallbackStrategy || "fallback";
            const sc = STRATEGY_COLORS[currentStrategy];
            const isFusion = currentStrategy === "fusion";
            const judge = strategy.judgeModel || "";
            const isPending = pendingModels[combo.id];

            return (
              <ComboPanel
                key={combo.id}
                combo={combo}
                strategy={currentStrategy}
                strategyColors={sc}
                isFusion={isFusion}
                judge={judge}
                modelCaps={modelCaps}
                copied={copied}
                onCopy={copy}
                isPending={isPending}
                onSetStrategy={(patch) =>
                  handleSetStrategy(combo.name, patch)
                }
                onEdit={() => setEditingCombo(combo)}
                onDelete={() => handleDelete(combo)}
                onOpenModelSelector={() => setModelSelectorTarget(combo.id)}
                onOpenJudgeSelector={() => setJudgeSelectorTarget(combo.id)}
                onMoveModel={(idx, dir) => {
                  const next = [...combo.models];
                  const swap = idx + dir;
                  if (swap < 0 || swap >= next.length) return;
                  [next[idx], next[swap]] = [next[swap], next[idx]];
                  saveModels(combo, next);
                }}
                onRemoveModel={(idx) => {
                  // Confirm if removing last model
                  if (combo.models.length === 1) {
                    setConfirmState({
                      title: "Remove Last Model",
                      message: "This combo will have no models. Continue?",
                      onConfirm: () => {
                        setConfirmState(null);
                        saveModels(
                          combo,
                          combo.models.filter((_, i) => i !== idx)
                        );
                      },
                    });
                  } else {
                    saveModels(
                      combo,
                      combo.models.filter((_, i) => i !== idx)
                    );
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
            <ModelSelectModal
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
                if (idx >= 0)
                  saveModels(
                    combo,
                    combo.models.filter((_, i) => i !== idx)
                  );
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
            <ModelSelectModal
              key={`judge-${judgeSelectorTarget}`}
              isOpen
              onClose={() => setJudgeSelectorTarget(null)}
              onSelect={(m) => {
                handleSetStrategy(combo.name, {
                  judgeModel: m?.value || "",
                });
                setJudgeSelectorTarget(null);
              }}
              activeProviders={activeProviders}
              modelAliases={modelAliases}
              title="Select Judge Model"
              addedModelValues={
                (comboStrategies[combo.name] || {}).judgeModel
                  ? [(comboStrategies[combo.name] || {}).judgeModel]
                  : []
              }
              closeOnSelect
            />
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
}

/* ── ComboPanel ─────────────────────────────────────────── */

function ComboPanel({
  combo,
  strategy,
  strategyColors,
  isFusion,
  judge,
  modelCaps,
  copied,
  onCopy,
  isPending,
  onSetStrategy,
  onEdit,
  onDelete,
  onOpenModelSelector,
  onOpenJudgeSelector,
  onMoveModel,
  onRemoveModel,
  onEditModel,
}) {
  return (
    <Card
      padding="none"
      className={`overflow-hidden border-l-4 ${strategyColors.border} transition-all`}
    >
      {/* ── header row ── */}
      <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3 border-b border-border-subtle">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <code className="text-base font-semibold font-mono text-text-main truncate">
              {combo.name}
            </code>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${strategyColors.badge}`}
            >
              <span className={`size-1.5 rounded-full ${strategyColors.dot}`} />
              {STRATEGY_OPTIONS.find((s) => s.value === strategy)?.label ||
                strategy}
            </span>
            {isPending && (
              <span className="material-symbols-outlined animate-spin text-[14px] text-text-muted">
                progress_activity
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            {combo.models.length} model
            {combo.models.length !== 1 ? "s" : ""} in chain
            &nbsp;&middot;&nbsp;{strategy === "fusion"
              ? "Parallel — all models queried, judge synthesizes"
              : strategy === "round-robin"
                ? "Load-balanced — requests rotate across models"
                : "Sequential — next model on failure"}
          </p>
        </div>

        {/* actions */}
        <div className="flex items-center gap-0.5 shrink-0">
          {(() => {
            const tipText =
              copied === `combo-${combo.id}`
                ? "Copied!"
                : "Copy combo name";
            return (
              <span className="relative inline-flex group/tt">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopy(combo.name, `combo-${combo.id}`);
                  }}
                  className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-surface-2 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {copied === `combo-${combo.id}`
                      ? "check"
                      : "content_copy"}
                  </span>
                </button>
                <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 z-50 w-max max-w-56 rounded px-2 py-1 text-[11px] leading-snug bg-gray-900 text-white opacity-0 group-hover/tt:opacity-100 transition-opacity duration-150 whitespace-nowrap">
                  {tipText}
                </span>
              </span>
            );
          })()}
          {(() => {
            return (
              <span className="relative inline-flex group/tt">
                <button
                  onClick={onEdit}
                  className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-surface-2 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    edit
                  </span>
                </button>
                <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 z-50 w-max max-w-56 rounded px-2 py-1 text-[11px] leading-snug bg-gray-900 text-white opacity-0 group-hover/tt:opacity-100 transition-opacity duration-150 whitespace-nowrap">
                  Edit combo name &amp; models
                </span>
              </span>
            );
          })()}
          {(() => {
            return (
              <span className="relative inline-flex group/tt">
                <button
                  onClick={onDelete}
                  className="p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    delete
                  </span>
                </button>
                <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 z-50 w-max max-w-56 rounded px-2 py-1 text-[11px] leading-snug bg-gray-900 text-white opacity-0 group-hover/tt:opacity-100 transition-opacity duration-150 whitespace-nowrap">
                  Delete combo
                </span>
              </span>
            );
          })()}
        </div>
      </div>

      {/* ── body ── */}
      <div className="px-5 py-4">
        {/* strategy toggle */}
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border-subtle flex-wrap">
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
            Route
          </span>
          <div className="flex gap-1">
            {STRATEGY_OPTIONS.map((s) => {
              const active = strategy === s.value;
              const c = STRATEGY_COLORS[s.value];
              return (
                <button
                  key={s.value}
                  onClick={() =>
                    onSetStrategy({ fallbackStrategy: s.value })
                  }
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
              onEdit={onEditModel}
            />
          ))}
        </div>

        {/* add model */}
        <button
          onClick={onOpenModelSelector}
          disabled={isPending}
          className="w-full mt-2.5 py-2.5 border-2 border-dashed border-border-subtle rounded-xl text-xs font-medium text-text-muted hover:text-primary hover:border-primary/40 transition-all flex items-center justify-center gap-1.5 group disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-[16px] group-hover:scale-110 transition-transform">
            add
          </span>
          Add Model
        </button>

        {/* fusion judge */}
        {isFusion && (
          <div className="mt-4 pt-3 border-t border-border-subtle flex items-center gap-2 flex-wrap">
            <span className="material-symbols-outlined text-[16px] text-amber-500">
              gavel
            </span>
            <span className="text-[12px] font-medium text-text-muted">
              Judge:
            </span>
            <button
              onClick={onOpenJudgeSelector}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/5 border border-amber-500/20 text-[12px] font-mono text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 hover:border-amber-500/40 transition-colors"
            >
              <span className="truncate max-w-[200px]">
                {judge ||
                  `Auto — ${combo.models[0] || "first model"}`}
              </span>
              <span className="material-symbols-outlined text-[14px] shrink-0">
                expand_more
              </span>
            </button>
            {judge && (
              <button
                onClick={() =>
                  onSetStrategy({ judgeModel: "" })
                }
                className="p-1 rounded text-text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors"
                title="Reset to Auto"
              >
                <span className="material-symbols-outlined text-[14px]">
                  close
                </span>
              </button>
            )}
            <span className="text-[11px] text-text-muted ml-auto">
              The model that fuses panel answers
            </span>
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
      {/* step indicator */}
      <div className="flex flex-col items-center w-7 shrink-0 pt-1.5">
        <div
          className={`size-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold leading-none transition-colors ${color.step}`}
        >
          {index + 1}
        </div>
        {index < total - 1 && (
          <div className="w-px flex-1 min-h-[8px] bg-border-subtle mt-0.5" />
        )}
      </div>

      {/* model content */}
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
                if (e.key === "Escape") {
                  setDraft(model);
                  setEditing(false);
                }
              }}
              className="w-full rounded border border-primary/40 bg-white px-1.5 py-0.5 font-mono text-xs text-text-main outline-none dark:bg-black/20"
            />
          ) : (
            <div className="flex items-center gap-1.5 min-w-0">
              {prefix && (
                <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider shrink-0">
                  {prefix}
                </span>
              )}
              <span
                className="font-mono text-xs text-text-main truncate cursor-text hover:text-primary transition-colors"
                onClick={() => {
                  setDraft(model);
                  setEditing(true);
                }}
                title="Click to edit"
              >
                /
                {name}
              </span>
              {caps && (
                <span className="shrink-0 flex items-center">
                  <CapacityBadges
                    caps={caps}
                    size={13}
                    className="gap-0"
                  />
                </span>
              )}
            </div>
          )}
        </div>

        {/* controls */}
        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            className={`p-1 rounded ${
              isFirst
                ? "text-text-muted/20 cursor-not-allowed"
                : "text-text-muted hover:text-primary hover:bg-surface-2"
            }`}
            title="Move up"
          >
            <span className="material-symbols-outlined text-[14px]">
              arrow_upward
            </span>
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            className={`p-1 rounded ${
              isLast
                ? "text-text-muted/20 cursor-not-allowed"
                : "text-text-muted hover:text-primary hover:bg-surface-2"
            }`}
            title="Move down"
          >
            <span className="material-symbols-outlined text-[14px]">
              arrow_downward
            </span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="p-1 rounded text-text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors"
            title="Remove"
          >
            <span className="material-symbols-outlined text-[14px]">
              close
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
