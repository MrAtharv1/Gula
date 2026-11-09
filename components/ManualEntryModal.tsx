"use client";

import React, { useState } from "react";
import { Plus, Trash2, Calendar, Building2 } from "lucide-react";
import { METRIC_DICTIONARY, evaluateResultFlag, matchMetric } from "@/lib/db/metricDictionary";
import { addReport } from "@/lib/db";
import { MetricCategory } from "@/lib/db/schema";
import { Badge } from "./ui/Badge";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";

interface ManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ManualRow {
  id: string;
  name: string;
  category: MetricCategory;
  value: number;
  unit: string;
  refLow?: number;
  refHigh?: number;
  refText?: string;
}

export function ManualEntryModal({ isOpen, onClose, onSuccess }: ManualEntryModalProps) {
  const [title, setTitle] = useState("Manual Health Entry");
  const [date, setDate] = useState("");
  const [labName, setLabName] = useState("");
  const [rows, setRows] = useState<ManualRow[]>([
    {
      id: "row-1",
      name: "Fasting Blood Glucose",
      category: "Sugar",
      value: 90,
      unit: "mg/dL",
      refLow: 70,
      refHigh: 99,
      refText: "70 - 99",
    },
  ]);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!date) {
      setDate(new Date().toISOString().slice(0, 10));
    }
  }, [date]);

  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}`,
        name: "",
        category: "Other",
        value: 0,
        unit: "mg/dL",
      },
    ]);
  };

  const handleRemoveRow = (id: string) => {
    if (rows.length === 1) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleMarkerSelect = (id: string, defKey: string) => {
    const def = METRIC_DICTIONARY[defKey];
    if (!def) return;

    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              name: def.displayName,
              category: def.category,
              unit: def.standardUnit,
              refLow: def.defaultLow,
              refHigh: def.defaultHigh,
              refText: def.defaultLow !== undefined ? `${def.defaultLow} - ${def.defaultHigh}` : undefined,
            }
          : r
      )
    );
  };

  const handleSave = async () => {
    const validRows = rows.filter((r) => r.name.trim().length > 0 && !isNaN(r.value));
    if (validRows.length === 0) {
      setError("Please add at least one valid biomarker entry.");
      return;
    }

    try {
      await addReport(
        {
          fileName: title.trim() || "Manual_Test_Entry",
          reportDate: date || new Date().toISOString().slice(0, 10),
          labName: labName.trim() || undefined,
          uploadedAt: Date.now(),
          status: "active",
          parseWarnings: [],
        },
        validRows.map((r) => {
          const metricDef = matchMetric(r.name);
          const flag = evaluateResultFlag(r.value, r.refLow, r.refHigh);
          return {
            metricKey: metricDef ? metricDef.canonicalKey : r.name.toLowerCase().replace(/\s+/g, "_"),
            displayName: r.name,
            value: r.value,
            unit: r.unit,
            refLow: r.refLow,
            refHigh: r.refHigh,
            flag,
            category: metricDef ? metricDef.category : r.category,
          };
        })
      );

      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to save entry.");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manual report entry"
      description="Enter results from paper printouts or home diagnostic devices."
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
          <div>
            <label className="text-[11px] font-medium text-[var(--text-muted)] block mb-1">
              Entry Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-[var(--text-muted)] block mb-1">
              Date
            </label>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
              <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-transparent text-xs font-medium text-[var(--text-primary)] focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-[var(--text-muted)] block mb-1">
              Lab or Clinic
            </label>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
              <Building2 className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Optional"
                value={labName}
                onChange={(e) => setLabName(e.target.value)}
                className="w-full bg-transparent text-xs font-medium text-[var(--text-primary)] focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              Biomarkers
            </span>
            <button
              onClick={handleAddRow}
              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:underline tap-target cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add row
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {rows.map((row) => {
              const flag = evaluateResultFlag(row.value, row.refLow, row.refHigh);
              return (
                <div
                  key={row.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)]"
                >
                  <div className="flex-1 w-full">
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleMarkerSelect(row.id, e.target.value);
                        }
                      }}
                      className="w-full px-2 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden mb-1"
                      defaultValue=""
                    >
                      <option value="" disabled>Select known biomarker or custom name below</option>
                      {Object.values(METRIC_DICTIONARY).map((def) => (
                        <option key={def.canonicalKey} value={def.canonicalKey}>
                          {def.displayName} ({def.standardUnit})
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Biomarker Name"
                      value={row.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setRows((prev) =>
                          prev.map((r) => (r.id === row.id ? { ...r, name: val } : r))
                        );
                      }}
                      className="w-full px-2 py-1 rounded bg-transparent border-b border-[var(--border-subtle)] focus:border-[var(--accent)] focus:outline-hidden text-xs font-medium text-[var(--text-primary)]"
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="w-20">
                      <label className="text-[10px] text-[var(--text-muted)] block sm:hidden">Value</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="Value"
                        value={row.value || ""}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setRows((prev) =>
                            prev.map((r) => (r.id === row.id ? { ...r, value: val } : r))
                          );
                        }}
                        className="w-full text-right px-2 py-1 rounded bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] focus:outline-hidden"
                      />
                    </div>

                    <div className="w-16">
                      <label className="text-[10px] text-[var(--text-muted)] block sm:hidden">Unit</label>
                      <input
                        type="text"
                        placeholder="Unit"
                        value={row.unit}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRows((prev) =>
                            prev.map((r) => (r.id === row.id ? { ...r, unit: val } : r))
                          );
                        }}
                        className="w-full px-2 py-1 rounded bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
                      />
                    </div>

                    <div className="w-20 hidden sm:flex justify-center">
                      <Badge variant={flag} size="sm">
                        {flag === "high" ? "High" : flag === "low" ? "Low" : flag === "borderline" ? "Borderline" : "Normal"}
                      </Badge>
                    </div>

                    {rows.length > 1 && (
                      <button
                        onClick={() => handleRemoveRow(row.id)}
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-500 transition-colors tap-target cursor-pointer"
                        aria-label="Delete row"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)]">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave}>
            Save entry
          </Button>
        </div>
      </div>
    </Modal>
  );
}
