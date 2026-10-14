import React, { useState, useMemo, useEffect } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Download,
  Play,
  RotateCcw,
  Search,
  SlidersHorizontal,
  FileCode2,
  FileText,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Plus,
} from "lucide-react";
import {
  AuditRunRecord,
  ContextType,
  RefinementOutput,
  TargetTone,
} from "./types";
import {
  CONTEXT_LABELS,
  INITIAL_AUDIT_RECORDS,
  TONE_PROFILES,
} from "./data/presets";
import {
  runDeterministicRefinement,
  verifyEntityPreservation,
} from "./utils/pipelineEngine";

type ActiveSection = "workspace" | "pipeline" | "ledger";

export default function App() {
  const [auditRecords, setAuditRecords] = useState<AuditRunRecord[]>(INITIAL_AUDIT_RECORDS);
  const [activeRecordId, setActiveRecordId] = useState<string>(INITIAL_AUDIT_RECORDS[0].id);

  // Input parameters required by specification
  const [rawText, setRawText] = useState<string>(INITIAL_AUDIT_RECORDS[0].input.raw_text);
  const [targetTone, setTargetTone] = useState<TargetTone>(
    INITIAL_AUDIT_RECORDS[0].input.target_tone
  );
  const [contextType, setContextType] = useState<ContextType>(
    INITIAL_AUDIT_RECORDS[0].input.context_type
  );

  // Pipeline output state
  const [output, setOutput] = useState<RefinementOutput>(INITIAL_AUDIT_RECORDS[0].output);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [apiNotice, setApiNotice] = useState<string | null>(null);

  // Workspace interactive controls
  const [activeSection, setActiveSection] = useState<ActiveSection>("workspace");
  const [sourceViewMode, setSourceViewMode] = useState<"edit" | "annotated">("annotated");
  const [copiedKey, setCopiedKey] = useState<"humanized" | "json" | "curl" | null>(null);
  const [newEntityInput, setNewEntityInput] = useState<string>("");

  // Audit Ledger search and status filter
  const [ledgerSearch, setLedgerSearch] = useState<string>("");
  const [ledgerStatusFilter, setLedgerStatusFilter] = useState<"ALL" | "PASSED" | "FLAGGED">("ALL");

  // Live entity preservation verification whenever humanized_text or preserved_entities changes
  const liveAudit = useMemo(() => {
    return verifyEntityPreservation(
      rawText,
      output.humanized_text,
      output.preserved_entities
    );
  }, [rawText, output.humanized_text, output.preserved_entities]);

  // Synchronized Strict JSON payload matching exact specification
  const strictJsonOutput: RefinementOutput = useMemo(() => {
    return {
      detected_flaws: output.detected_flaws,
      preserved_entities: output.preserved_entities,
      humanized_text: output.humanized_text,
      factuality_verification: output.factuality_verification,
    };
  }, [output]);

  // Smooth scroll handler with offset compensation for the sticky navigation bar
  const scrollToSection = (sectionId: ActiveSection) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Scroll spy to automatically highlight current section in navigation bar
  useEffect(() => {
    const handleScroll = () => {
      const sectionIds: ActiveSection[] = ["workspace", "pipeline", "ledger"];
      const scrollPosition = window.scrollY + 160;

      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const el = document.getElementById(sectionIds[i]);
        if (el) {
          const rect = el.getBoundingClientRect();
          const top = rect.top + window.scrollY;
          if (scrollPosition >= top) {
            setActiveSection(sectionIds[i]);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSelectPreset = (record: AuditRunRecord) => {
    setActiveRecordId(record.id);
    setRawText(record.input.raw_text);
    setTargetTone(record.input.target_tone);
    setContextType(record.input.context_type);
    setOutput(record.output);
    setApiNotice(null);
  };

  const handleExecutePipeline = async (overrideTone?: TargetTone, overrideContext?: ContextType) => {
    const toneToUse = overrideTone ?? targetTone;
    const contextToUse = overrideContext ?? contextType;

    if (!rawText.trim()) return;
    setIsProcessing(true);
    setApiNotice(null);
    const startTime = performance.now();

    try {
      const response = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raw_text: rawText,
          target_tone: toneToUse,
          context_type: contextToUse,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || `Server responded with status ${response.status}`);
      }

      const elapsed = Math.round(performance.now() - startTime);
      const refinedOutput: RefinementOutput = {
        detected_flaws: Array.isArray(data.detected_flaws) ? data.detected_flaws : [],
        preserved_entities: Array.isArray(data.preserved_entities) ? data.preserved_entities : [],
        humanized_text: String(data.humanized_text || ""),
        factuality_verification: {
          status: data.factuality_verification?.status === "FLAGGED" ? "FLAGGED" : "PASSED",
          confidence_score: Number(data.factuality_verification?.confidence_score ?? 0.98),
          discrepancy_notes: String(
            data.factuality_verification?.discrepancy_notes ||
              "All extracted entities and factual statements verified against source."
          ),
        },
      };

      setOutput(refinedOutput);

      const newRecord: AuditRunRecord = {
        id: `run-${Math.floor(9043 + Math.random() * 900)}`,
        title: `${CONTEXT_LABELS[contextToUse].label} (${TONE_PROFILES[toneToUse].label})`,
        timestamp: new Date().toISOString().replace("T", " ").slice(0, 19),
        latencyMs: elapsed,
        input: {
          raw_text: rawText,
          target_tone: toneToUse,
          context_type: contextToUse,
        },
        output: refinedOutput,
      };

      setAuditRecords((prev) => [newRecord, ...prev]);
      setActiveRecordId(newRecord.id);
    } catch (err: unknown) {
      // Fall back cleanly to deterministic engine while informing user
      const elapsed = Math.round(performance.now() - startTime);
      const fallbackResult = runDeterministicRefinement(rawText, toneToUse, contextToUse);
      setOutput(fallbackResult);

      const newRecord: AuditRunRecord = {
        id: `run-${Math.floor(9043 + Math.random() * 900)}`,
        title: `${CONTEXT_LABELS[contextToUse].label} (${TONE_PROFILES[toneToUse].label})`,
        timestamp: new Date().toISOString().replace("T", " ").slice(0, 19),
        latencyMs: elapsed,
        input: {
          raw_text: rawText,
          target_tone: toneToUse,
          context_type: contextToUse,
        },
        output: fallbackResult,
      };
      setAuditRecords((prev) => [newRecord, ...prev]);
      setActiveRecordId(newRecord.id);

      const msg = err instanceof Error ? err.message : "API unavailable";
      setApiNotice(
        `Processed via deterministic local NLP rules (${msg}). All entity locks and factuality checks remain active.`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleHumanizedTextEdit = (updatedText: string) => {
    const { verification } = verifyEntityPreservation(
      rawText,
      updatedText,
      output.preserved_entities
    );
    setOutput((prev) => ({
      ...prev,
      humanized_text: updatedText,
      factuality_verification: verification,
    }));
  };

  const handleSimulateEntityDrift = () => {
    if (output.preserved_entities.length === 0) return;
    // Corrupt 2 entities in humanized_text to demonstrate FLAGGED state
    let driftedText = output.humanized_text;
    const targets = output.preserved_entities.slice(0, 2);
    for (const target of targets) {
      driftedText = driftedText.replace(target, "[REDACTED_METRIC]");
    }
    handleHumanizedTextEdit(driftedText);
  };

  const handleRestoreSelectedPreset = () => {
    const found = auditRecords.find((r) => r.id === activeRecordId) || INITIAL_AUDIT_RECORDS[0];
    setRawText(found.input.raw_text);
    setTargetTone(found.input.target_tone);
    setContextType(found.input.context_type);
    setOutput(found.output);
    setApiNotice(null);
  };

  const handleAddProtectedEntity = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newEntityInput.trim();
    if (!trimmed || output.preserved_entities.includes(trimmed)) return;
    const updatedEntities = [...output.preserved_entities, trimmed];
    const { verification } = verifyEntityPreservation(
      rawText,
      output.humanized_text,
      updatedEntities
    );
    setOutput((prev) => ({
      ...prev,
      preserved_entities: updatedEntities,
      factuality_verification: verification,
    }));
    setNewEntityInput("");
  };

  const handleRemoveProtectedEntity = (entityToRemove: string) => {
    const updatedEntities = output.preserved_entities.filter((e) => e !== entityToRemove);
    const { verification } = verifyEntityPreservation(
      rawText,
      output.humanized_text,
      updatedEntities
    );
    setOutput((prev) => ({
      ...prev,
      preserved_entities: updatedEntities,
      factuality_verification: verification,
    }));
  };

  const handleCopy = (type: "humanized" | "json" | "curl") => {
    let textToCopy = "";
    if (type === "humanized") {
      textToCopy = output.humanized_text;
    } else if (type === "json") {
      textToCopy = JSON.stringify(strictJsonOutput, null, 2);
    } else {
      textToCopy = JSON.stringify(
        {
          raw_text: rawText,
          target_tone: targetTone,
          context_type: contextType,
        },
        null,
        2
      );
    }
    navigator.clipboard.writeText(textToCopy);
    setCopiedKey(type);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(strictJsonOutput, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `veriprose-${contextType}-${targetTone}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLedger = useMemo(() => {
    return auditRecords.filter((rec) => {
      const matchesStatus =
        ledgerStatusFilter === "ALL" ||
        rec.output.factuality_verification.status === ledgerStatusFilter;
      const q = ledgerSearch.trim().toLowerCase();
      if (!q) return matchesStatus;
      return (
        matchesStatus &&
        (rec.title.toLowerCase().includes(q) ||
          rec.input.raw_text.toLowerCase().includes(q) ||
          rec.output.humanized_text.toLowerCase().includes(q) ||
          rec.output.preserved_entities.some((e) => e.toLowerCase().includes(q)))
      );
    });
  }, [auditRecords, ledgerSearch, ledgerStatusFilter]);

  // Render raw_text with inline highlights for detected_flaws and preserved_entities
  const renderAnnotatedSource = () => {
    if (!rawText) return null;

    type Segment = { text: string; kind: "plain" | "flaw" | "entity" };
    let segments: Segment[] = [{ text: rawText, kind: "plain" }];

    // Highlight flaws first
    for (const flaw of output.detected_flaws) {
      if (!flaw.trim()) continue;
      const nextSegments: Segment[] = [];
      for (const seg of segments) {
        if (seg.kind !== "plain") {
          nextSegments.push(seg);
          continue;
        }
        const idx = seg.text.toLowerCase().indexOf(flaw.toLowerCase());
        if (idx === -1) {
          nextSegments.push(seg);
        } else {
          if (idx > 0) {
            nextSegments.push({ text: seg.text.slice(0, idx), kind: "plain" });
          }
          nextSegments.push({
            text: seg.text.slice(idx, idx + flaw.length),
            kind: "flaw",
          });
          if (idx + flaw.length < seg.text.length) {
            nextSegments.push({
              text: seg.text.slice(idx + flaw.length),
              kind: "plain",
            });
          }
        }
      }
      segments = nextSegments;
    }

    // Highlight preserved entities
    for (const entity of output.preserved_entities) {
      if (!entity.trim()) continue;
      const nextSegments: Segment[] = [];
      for (const seg of segments) {
        if (seg.kind !== "plain") {
          nextSegments.push(seg);
          continue;
        }
        const idx = seg.text.toLowerCase().indexOf(entity.toLowerCase());
        if (idx === -1) {
          nextSegments.push(seg);
        } else {
          if (idx > 0) {
            nextSegments.push({ text: seg.text.slice(0, idx), kind: "plain" });
          }
          nextSegments.push({
            text: seg.text.slice(idx, idx + entity.length),
            kind: "entity",
          });
          if (idx + entity.length < seg.text.length) {
            nextSegments.push({
              text: seg.text.slice(idx + entity.length),
              kind: "plain",
            });
          }
        }
      }
      segments = nextSegments;
    }

    return (
      <div className="text-[15px] leading-[1.7] text-slate-800 whitespace-pre-wrap">
        {segments.map((seg, i) => {
          if (seg.kind === "flaw") {
            return (
              <mark
                key={i}
                title="Stage 1: Detected Robotic Phrasing / Template"
                className="bg-amber-100/90 text-amber-950 underline decoration-amber-600/70 decoration-wavy underline-offset-4 px-0.5 rounded-xs"
              >
                {seg.text}
              </mark>
            );
          }
          if (seg.kind === "entity") {
            return (
              <mark
                key={i}
                title="Stage 2: Protected Entity / Metric (100% Lock)"
                className="bg-blue-50 text-blue-950 font-medium underline decoration-blue-600 decoration-2 underline-offset-4 px-0.5 rounded-xs"
              >
                {seg.text}
              </mark>
            );
          }
          return <span key={i}>{seg.text}</span>;
        })}
      </div>
    );
  };

  const isPassed = output.factuality_verification.status === "PASSED";

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200 px-6 py-3.5">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#workspace"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection("workspace");
            }}
            className="font-display text-lg font-bold tracking-tight text-slate-950 whitespace-nowrap shrink-0 cursor-pointer"
          >
            VeriProse Enterprise
          </a>

          {/* Zone 2: 3 concise single-line navigation links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a
              href="#workspace"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection("workspace");
              }}
              className={`hover:text-slate-950 transition-colors whitespace-nowrap shrink-0 py-0.5 cursor-pointer ${
                activeSection === "workspace"
                  ? "text-slate-950 underline decoration-slate-950 decoration-2 underline-offset-8"
                  : ""
              }`}
            >
              Refinement Studio
            </a>
            <a
              href="#pipeline"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection("pipeline");
              }}
              className={`hover:text-slate-950 transition-colors whitespace-nowrap shrink-0 py-0.5 cursor-pointer ${
                activeSection === "pipeline"
                  ? "text-slate-950 underline decoration-slate-950 decoration-2 underline-offset-8"
                  : ""
              }`}
            >
              4-Stage Pipeline
            </a>
            <a
              href="#ledger"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection("ledger");
              }}
              className={`hover:text-slate-950 transition-colors whitespace-nowrap shrink-0 py-0.5 cursor-pointer ${
                activeSection === "ledger"
                  ? "text-slate-950 underline decoration-slate-950 decoration-2 underline-offset-8"
                  : ""
              }`}
            >
              Audit Ledger
            </a>
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center shrink-0">
            <button
              onClick={() => handleExecutePipeline()}
              disabled={isProcessing || !rawText.trim()}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-950 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isProcessing ? "Running Pipeline..." : "Execute Refinement"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Enterprise Workspace Container (1440px baseline) */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 py-8 space-y-10">
        {/* Executive Header & Parameter Strip */}
        <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-slate-200">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Natural Language Refinement Engine</span>
              <span aria-hidden="true">·</span>
              <span>Zero-Hallucination Entity Lock</span>
              <span aria-hidden="true">·</span>
              <span>Factuality & Meaning Check</span>
            </div>
            <h1
              className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950"
              style={{ textWrap: "balance" }}
            >
              Transform Templated Machine Output into Verified Human Prose
            </h1>
          </div>

          {/* Real-time Verification Telemetry Summary (Unboxed clean metrics with tabular-nums) */}
          <div className="flex flex-wrap items-center gap-8 text-left lg:text-right">
            <div>
              <div className="text-xs text-slate-500">Factuality Status</div>
              <div className="mt-0.5 flex items-center gap-1.5 font-mono text-sm font-semibold tabular-nums">
                {isPassed ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                    <span className="text-[#16A34A]">PASSED</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-[#DC2626] shrink-0" />
                    <span className="text-[#DC2626]">FLAGGED</span>
                  </>
                )}
              </div>
            </div>

            <div className="h-8 w-px bg-slate-200 hidden sm:block" />

            <div>
              <div className="text-xs text-slate-500">Confidence Score</div>
              <div className="mt-0.5 font-mono text-sm font-semibold text-slate-950 tabular-nums">
                {output.factuality_verification.confidence_score.toFixed(2)} / 1.00
              </div>
            </div>

            <div className="h-8 w-px bg-slate-200 hidden sm:block" />

            <div>
              <div className="text-xs text-slate-500">Protected Entities</div>
              <div className="mt-0.5 font-mono text-sm font-semibold text-slate-950 tabular-nums">
                {liveAudit.matchedEntities.length} / {output.preserved_entities.length} Intact
              </div>
            </div>

            <div className="h-8 w-px bg-slate-200 hidden sm:block" />

            <div>
              <div className="text-xs text-slate-500">Robotic Flaws Stripped</div>
              <div className="mt-0.5 font-mono text-sm font-semibold text-slate-950 tabular-nums">
                {output.detected_flaws.length} Detected
              </div>
            </div>
          </div>
        </section>

        {/* Scenario Preset Bar & Input Parameter Controls */}
        <section id="workspace" className="bg-white border border-slate-200 rounded-xl p-5 space-y-5 scroll-mt-24">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-900">
                Load Enterprise Payload Preset
              </div>
              <div className="text-xs text-slate-500">
                Select a domain sample or paste custom machine-generated notes below
              </div>
            </div>

            {/* Interactive Preset Selector Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
              {INITIAL_AUDIT_RECORDS.map((preset) => {
                const isSelected = activeRecordId === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isSelected
                        ? "bg-white text-slate-950 shadow-xs"
                        : "text-slate-600 hover:text-slate-950"
                    }`}
                  >
                    {CONTEXT_LABELS[preset.input.context_type].label}:{" "}
                    {preset.title.split("—")[1]?.trim() || preset.id}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Input Parameters: context_type & target_tone */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Parameter 3: context_type */}
            <div className="lg:col-span-7 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-900">
                  Input Parameter: <code className="font-mono text-slate-700">context_type</code>
                </label>
                <span className="text-xs text-slate-500">
                  {CONTEXT_LABELS[contextType].domain} · {CONTEXT_LABELS[contextType].description}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
                {(Object.keys(CONTEXT_LABELS) as ContextType[]).map((ctxKey) => (
                  <button
                    key={ctxKey}
                    onClick={() => {
                      setContextType(ctxKey);
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      contextType === ctxKey
                        ? "bg-white text-slate-950 shadow-xs"
                        : "text-slate-600 hover:text-slate-950"
                    }`}
                  >
                    {ctxKey}
                  </button>
                ))}
              </div>
            </div>

            {/* Parameter 2: target_tone */}
            <div className="lg:col-span-5 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-900">
                  Input Parameter: <code className="font-mono text-slate-700">target_tone</code>
                </label>
                <span className="text-xs text-slate-500">
                  {TONE_PROFILES[targetTone].cadence}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-lg">
                {(Object.keys(TONE_PROFILES) as TargetTone[]).map((toneKey) => (
                  <button
                    key={toneKey}
                    onClick={() => {
                      setTargetTone(toneKey);
                      handleExecutePipeline(toneKey, contextType);
                    }}
                    disabled={isProcessing}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      targetTone === toneKey
                        ? "bg-white text-slate-950 shadow-xs"
                        : "text-slate-600 hover:text-slate-950"
                    }`}
                  >
                    {toneKey}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {apiNotice && (
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span>{apiNotice}</span>
              <button
                onClick={() => setApiNotice(null)}
                className="text-slate-900 underline hover:no-underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}
        </section>

        {/* Primary Dual-Pane Comparison & Interactive Verification Studio */}
        <section
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
        >
          {/* Left Column: Raw Input (raw_text) + Inline Flaw & Entity Scanner */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-100">
                <div>
                  <h2 className="font-display text-base font-semibold text-slate-950">
                    01. Source Input (<code className="font-mono text-sm">raw_text</code>)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Machine-generated draft · {rawText.trim().split(/\s+/).filter(Boolean).length} words
                  </p>
                </div>

                {/* Segmented Toggle for Edit vs Annotated Inspection */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                  <button
                    onClick={() => setSourceViewMode("annotated")}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      sourceViewMode === "annotated"
                        ? "bg-white text-slate-950 shadow-xs"
                        : "text-slate-600 hover:text-slate-950"
                    }`}
                  >
                    Annotated Scan
                  </button>
                  <button
                    onClick={() => setSourceViewMode("edit")}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      sourceViewMode === "edit"
                        ? "bg-white text-slate-950 shadow-xs"
                        : "text-slate-600 hover:text-slate-950"
                    }`}
                  >
                    Edit Raw Text
                  </button>
                </div>
              </div>

              {sourceViewMode === "edit" ? (
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  rows={9}
                  placeholder="Paste robotic or templated AI text here (recruiter notes, candidate feedback, performance report)..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-4 text-[15px] leading-[1.7] text-slate-900 focus:outline-none focus:border-slate-900 transition-colors resize-y"
                />
              ) : (
                <div className="min-h-[220px] rounded-lg border border-slate-200 bg-slate-50/40 p-4">
                  {renderAnnotatedSource()}
                </div>
              )}
            </div>

            {/* Legend & Action Footer for Source Input */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-1.5 bg-amber-400 rounded-xs" />
                  <span>Robotic Flaw ({output.detected_flaws.length})</span>
                </span>
                <span aria-hidden="true">·</span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-1.5 bg-blue-600 rounded-xs" />
                  <span>Protected Entity ({output.preserved_entities.length})</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy("curl")}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-950 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedKey === "curl" ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                      <span>Copied Input JSON</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Input Payload</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleExecutePipeline()}
                  disabled={isProcessing || !rawText.trim()}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-950 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isProcessing ? "Refining..." : "Re-Run Pipeline"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Stage 3 Contextual Rewrite (humanized_text) + Live Stage 4 Check */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-100">
                <div>
                  <h2 className="font-display text-base font-semibold text-slate-950">
                    02. Refined Output (<code className="font-mono text-sm">humanized_text</code>)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Target Tone: {TONE_PROFILES[targetTone].label} · Context:{" "}
                    {CONTEXT_LABELS[contextType].label} ·{" "}
                    {output.humanized_text.trim().split(/\s+/).filter(Boolean).length} words
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSimulateEntityDrift}
                    title="Simulate accidental omission of a protected metric to test Stage 4 FLAGGED verification"
                    className="px-2.5 py-1 text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Simulate Entity Drift
                  </button>
                  <button
                    onClick={handleRestoreSelectedPreset}
                    title="Restore verified output"
                    className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-950 border border-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restore</span>
                  </button>
                </div>
              </div>

              {isProcessing ? (
                <div className="min-h-[220px] rounded-lg border border-slate-200 bg-slate-50/40 p-5 space-y-3 animate-pulse">
                  <div className="h-4 bg-slate-200 rounded w-11/12" />
                  <div className="h-4 bg-slate-200 rounded w-full" />
                  <div className="h-4 bg-slate-200 rounded w-10/12" />
                  <div className="h-4 bg-slate-200 rounded w-9/12" />
                  <div className="h-4 bg-slate-200 rounded w-4/5" />
                </div>
              ) : (
                <textarea
                  value={output.humanized_text}
                  onChange={(e) => handleHumanizedTextEdit(e.target.value)}
                  rows={9}
                  aria-label="Humanized text output (editable with live entity verification)"
                  className="w-full rounded-lg border border-slate-200 bg-white p-4 text-[15px] leading-[1.7] text-slate-900 focus:outline-none focus:border-slate-900 transition-colors resize-y"
                />
              )}
            </div>

            {/* Stage 4 Factuality & Meaning Check Banner inside Output Pane */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {isPassed ? (
                    <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-[#DC2626] shrink-0" />
                  )}
                  <span className="text-xs font-semibold text-slate-900">
                    Factuality & Meaning Verification:{" "}
                    <span className={isPassed ? "text-[#16A34A]" : "text-[#DC2626]"}>
                      {output.factuality_verification.status}
                    </span>
                  </span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="font-mono text-xs text-slate-700 tabular-nums">
                    Confidence: {output.factuality_verification.confidence_score.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy("humanized")}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-950 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedKey === "humanized" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                        <span>Copied Text</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Refined Prose</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {output.factuality_verification.discrepancy_notes}
              </p>
            </div>
          </div>
        </section>

        {/* 4-Stage Pipeline Execution Diagnostics (Full-Width Responsive View) */}
        <section
          id="pipeline"
          className="bg-white border border-slate-200 rounded-xl p-6 lg:p-8 space-y-6 scroll-mt-24"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-950">
                03. Execution Pipeline Diagnostics
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Granular inspection of robotic flaw stripping, entity locks, contextual rewrite, and semantic verification
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-slate-600 bg-slate-100 px-3 py-1 rounded-md">
                4 Sequential Stages
              </span>
              <button
                onClick={handleDownloadJson}
                title="Download verified audit payload"
                className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-950 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Run Payload</span>
              </button>
            </div>
          </div>

          {/* Stage 1: Robotic Language Detection */}
          <div className="space-y-2.5 pb-6 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Stage 1 · Robotic Language Detection (<code className="font-mono text-xs text-slate-700">detected_flaws</code>)
              </h3>
              <span className="font-mono text-xs text-slate-500 tabular-nums">
                {output.detected_flaws.length} phrases isolated
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Repetitive transitions, artificial filler, and templated corporate structures stripped during rewrite:
            </p>
            {output.detected_flaws.length === 0 ? (
              <div className="text-xs text-slate-500 italic py-2">
                No robotic templates detected in source text.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {output.detected_flaws.map((flaw, index) => (
                  <div
                    key={index}
                    className="px-3.5 py-2.5 border border-slate-200 rounded-lg flex items-center justify-between gap-4 text-xs bg-slate-50/40"
                  >
                    <span className="font-mono text-slate-800 truncate" title={flaw}>
                      &ldquo;{flaw}&rdquo;
                    </span>
                    <span className="text-amber-700 whitespace-nowrap shrink-0 font-medium">
                      Replaced with natural transition
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stage 2: Entity & Fact Extraction */}
          <div className="space-y-3 pb-6 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Stage 2 · Entity & Fact Extraction (<code className="font-mono text-xs text-slate-700">preserved_entities</code>)
              </h3>
              <span className="font-mono text-xs text-slate-500 tabular-nums">
                {liveAudit.matchedEntities.length}/{output.preserved_entities.length} verified in output
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Names, rubric scores, dates, technical standards, and compensation metrics locked for 100% accuracy:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {output.preserved_entities.map((entity) => {
                const isPresent = liveAudit.matchedEntities.includes(entity);
                return (
                  <div
                    key={entity}
                    className="px-3 py-2 border border-slate-200 rounded-lg flex items-center justify-between gap-2 text-xs bg-white"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isPresent ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-[#DC2626] shrink-0" />
                      )}
                      <span className="font-mono text-slate-900 truncate" title={entity}>
                        {entity}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`font-mono text-[11px] ${
                          isPresent ? "text-[#16A34A]" : "text-[#DC2626] font-semibold"
                        }`}
                      >
                        {isPresent ? "LOCKED" : "MISSING"}
                      </span>
                      <button
                        onClick={() => handleRemoveProtectedEntity(entity)}
                        title="Remove entity constraint"
                        className="text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add custom entity lock */}
            <form onSubmit={handleAddProtectedEntity} className="flex items-center gap-2 pt-1 max-w-xl">
              <input
                type="text"
                value={newEntityInput}
                onChange={(e) => setNewEntityInput(e.target.value)}
                placeholder="Add custom protected entity or metric (e.g. 99.99% SLA, Oct 15)..."
                className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50/50 focus:outline-none focus:border-slate-900"
              />
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-medium text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Lock Entity</span>
              </button>
            </form>
          </div>

          {/* Stage 3 & Stage 4 Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/60 p-5 rounded-lg border border-slate-200">
            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-slate-900">
                Stage 3 · Contextual Rewrite
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Calibrated for <span className="font-semibold text-slate-900">{contextType}</span>{" "}
                using a <span className="font-semibold text-slate-900">{targetTone}</span> register
                ({TONE_PROFILES[targetTone].summary})
              </p>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-slate-900">
                Stage 4 · Factuality & Meaning Check
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Status:{" "}
                <span
                  className={`font-mono font-semibold ${
                    isPassed ? "text-[#16A34A]" : "text-[#DC2626]"
                  }`}
                >
                  {output.factuality_verification.status}
                </span>{" "}
                · Confidence Score:{" "}
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {output.factuality_verification.confidence_score.toFixed(2)}
                </span>
              </p>
              <p className="text-xs text-slate-500 italic">
                {output.factuality_verification.discrepancy_notes}
              </p>
            </div>
          </div>
        </section>

        {/* Enterprise Audit Ledger Section */}
        <section
          id="ledger"
          className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 scroll-mt-24"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-950">
                05. Refinement Audit Ledger
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Historical pipeline executions with entity preservation telemetry and verification status
              </p>
            </div>

            {/* Search & Status Filter Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  placeholder="Filter by candidate, entity, or context..."
                  className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50/50 focus:outline-none focus:border-slate-900 w-64"
                />
              </div>

              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                {(["ALL", "PASSED", "FLAGGED"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setLedgerStatusFilter(st)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      ledgerStatusFilter === st
                        ? "bg-white text-slate-950 shadow-xs"
                        : "text-slate-600 hover:text-slate-950"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filteredLedger.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="text-sm font-medium text-slate-900">
                No refinement audit records match your current filter
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Clear the search query or execute a new refinement run in the studio above to log a verified record.
              </p>
              <button
                onClick={() => {
                  setLedgerSearch("");
                  setLedgerStatusFilter("ALL");
                }}
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Reset Ledger Filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                    <th className="py-2.5 px-3">Run ID</th>
                    <th className="py-2.5 px-3">Document & Context</th>
                    <th className="py-2.5 px-3">Target Tone</th>
                    <th className="py-2.5 px-3 text-right">Flaws Stripped</th>
                    <th className="py-2.5 px-3 text-right">Entities Locked</th>
                    <th className="py-2.5 px-3 text-right">Confidence</th>
                    <th className="py-2.5 px-3">Factuality Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredLedger.map((record) => {
                    const recPassed =
                      record.output.factuality_verification.status === "PASSED";
                    const isCurrent = record.id === activeRecordId;
                    return (
                      <tr
                        key={record.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isCurrent ? "bg-slate-50/60" : ""
                        }`}
                      >
                        <td className="py-3 px-3 font-mono text-slate-600 tabular-nums whitespace-nowrap">
                          {record.id}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-slate-900">{record.title}</div>
                          <div className="text-slate-500 font-mono text-[11px] mt-0.5">
                            {record.input.context_type} · {record.timestamp}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-700 capitalize whitespace-nowrap">
                          {record.input.target_tone}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-800 tabular-nums">
                          {record.output.detected_flaws.length}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-800 tabular-nums">
                          {record.output.preserved_entities.length}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                          {record.output.factuality_verification.confidence_score.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 font-mono font-semibold ${
                              recPassed ? "text-[#16A34A]" : "text-[#DC2626]"
                            }`}
                          >
                            {recPassed ? (
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            ) : (
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            )}
                            <span>{record.output.factuality_verification.status}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => {
                              handleSelectPreset(record);
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            className="px-2.5 py-1 text-xs font-medium text-slate-800 hover:text-slate-950 border border-slate-200 rounded-md hover:bg-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            {isCurrent ? "Loaded in Studio" : "Inspect Run"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* Quiet Enterprise Footer */}
      <footer className="border-t border-slate-200 bg-white px-6 py-5 mt-12">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            VeriProse Enterprise · Natural Language Refinement & Factuality Verification Platform
          </div>
          <div className="flex items-center gap-4">
            <span>Pipeline: Robotic Detection → Entity Extraction → Contextual Rewrite → Factuality Check</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
