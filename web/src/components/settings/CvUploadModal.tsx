"use client";

import React, { useState } from "react";
import { analyzeCvText, extractTextFromPdf, CvParseResult } from "../../utils/cvParser";

interface CvUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyProfile: (
    data: { roles: string[]; stack: string[]; levels: string[] },
    mergeMode: "merge" | "replace",
    triggerRescore: boolean,
  ) => Promise<void>;
  currentRoles: string[];
  currentStack: string[];
  currentLevels: string[];
}

export function CvUploadModal({
  isOpen,
  onClose,
  onApplyProfile,
  currentRoles,
  currentStack,
  currentLevels,
}: CvUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseResult, setParseResult] = useState<CvParseResult | null>(null);
  const [isPasteMode, setIsPasteMode] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Editable lists in preview
  const [extractedRoles, setExtractedRoles] = useState<string[]>([]);
  const [extractedStack, setExtractedStack] = useState<string[]>([]);
  const [extractedLevels, setExtractedLevels] = useState<string[]>([]);
  const [newRoleInput, setNewRoleInput] = useState("");
  const [newStackInput, setNewStackInput] = useState("");

  const [mergeMode, setMergeMode] = useState<"merge" | "replace">("merge");
  const [triggerRescore, setTriggerRescore] = useState(true);
  const [isApplying, setIsApplying] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setErrorMsg(null);
    setIsProcessing(true);

    try {
      let rawText = "";
      if (uploadedFile.type === "application/pdf" || uploadedFile.name.endsWith(".pdf")) {
        rawText = await extractTextFromPdf(uploadedFile);
      } else {
        rawText = await uploadedFile.text();
      }

      if (!rawText || rawText.trim().length < 20) {
        throw new Error("Could not extract readable text from this file. Please try pasting the text instead.");
      }

      const result = analyzeCvText(rawText);
      setParseResult(result);
      setExtractedRoles(result.roles);
      setExtractedStack(result.stack);
      setExtractedLevels(result.levels);
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to parse CV");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcessPastedText = () => {
    if (!pastedText.trim()) return;
    setErrorMsg(null);
    setIsProcessing(true);

    try {
      const result = analyzeCvText(pastedText);
      setParseResult(result);
      setExtractedRoles(result.roles);
      setExtractedStack(result.stack);
      setExtractedLevels(result.levels);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to analyze text");
    } finally {
      setIsProcessing(false);
    }
  };

  const removeRole = (index: number) => {
    setExtractedRoles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeStack = (index: number) => {
    setExtractedStack((prev) => prev.filter((_, i) => i !== index));
  };

  const removeLevel = (index: number) => {
    setExtractedLevels((prev) => prev.filter((_, i) => i !== index));
  };

  const addRole = () => {
    if (newRoleInput.trim() && !extractedRoles.includes(newRoleInput.trim())) {
      setExtractedRoles((prev) => [...prev, newRoleInput.trim()]);
      setNewRoleInput("");
    }
  };

  const addStack = () => {
    if (newStackInput.trim() && !extractedStack.includes(newStackInput.trim())) {
      setExtractedStack((prev) => [...prev, newStackInput.trim()]);
      setNewStackInput("");
    }
  };

  const handleApply = async () => {
    setIsApplying(true);
    try {
      await onApplyProfile(
        {
          roles: extractedRoles,
          stack: extractedStack,
          levels: extractedLevels,
        },
        mergeMode,
        triggerRescore,
      );
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to save profile and rescore");
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>📄</span> Smart CV Profiler
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Upload your CV to automatically configure target roles, skills, and rescore vacancies.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl p-1 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs">
            {errorMsg}
          </div>
        )}

        {!parseResult ? (
          /* Step 1: Upload or Paste */
          <div className="mt-6 space-y-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsPasteMode(false)}
                className={`flex-1 py-2 text-xs font-medium rounded-xl transition-all ${
                  !isPasteMode
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/30"
                    : "bg-slate-800/60 text-slate-400 hover:text-white"
                }`}
              >
                Upload PDF / Document
              </button>
              <button
                type="button"
                onClick={() => setIsPasteMode(true)}
                className={`flex-1 py-2 text-xs font-medium rounded-xl transition-all ${
                  isPasteMode
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/30"
                    : "bg-slate-800/60 text-slate-400 hover:text-white"
                }`}
              >
                Paste CV Text
              </button>
            </div>

            {!isPasteMode ? (
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-2xl p-8 cursor-pointer transition-all bg-slate-800/30 hover:bg-slate-800/50 group">
                <input
                  type="file"
                  accept=".pdf,.txt,.md"
                  className="hidden"
                  onChange={(e) => {
                    const selected = e.target.files?.[0];
                    if (selected) handleFileUpload(selected);
                  }}
                  disabled={isProcessing}
                />
                <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center text-2xl mb-3 group-hover:scale-110 group-hover:bg-emerald-500/10 text-emerald-400 transition-all border border-slate-700">
                  {isProcessing ? "⏳" : "📎"}
                </div>
                <p className="text-sm font-semibold text-slate-200">
                  {isProcessing ? "Analyzing your CV..." : "Click or drag & drop your CV here"}
                </p>
                <p className="text-xs text-slate-400 mt-1">Supports PDF, Markdown, or plain text</p>
              </label>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste your CV text, resume summary, or LinkedIn 'About' section here..."
                  rows={6}
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono resize-none"
                />
                <button
                  type="button"
                  onClick={handleProcessPastedText}
                  disabled={isProcessing || !pastedText.trim()}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-emerald-900/20"
                >
                  {isProcessing ? "Analyzing Text..." : "Analyze & Extract Skills"}
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Step 2: Review & Modify Extracted Skills */
          <div className="mt-6 space-y-5">
            <div className="flex items-center justify-between bg-slate-950/50 border border-slate-800 p-3 rounded-xl">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 text-lg">✓</span>
                <div>
                  <p className="text-xs font-semibold text-white">
                    {file?.name || "Pasted CV text"}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Extracted {parseResult.wordCount} words • Found {extractedRoles.length} roles, {extractedStack.length} skills
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setParseResult(null)}
                className="text-xs text-slate-400 hover:text-white underline"
              >
                Re-upload
              </button>
            </div>

            {/* Target Roles */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">
                Target Roles Detected ({extractedRoles.length})
              </label>
              <div className="flex flex-wrap gap-1.5 p-3 bg-slate-950/50 border border-slate-800 rounded-xl min-h-[46px] items-center">
                {extractedRoles.map((role, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-2.5 py-1 rounded-lg"
                  >
                    {role}
                    <button
                      type="button"
                      onClick={() => removeRole(idx)}
                      className="hover:text-rose-400 text-[10px]"
                    >
                      ✕
                    </button>
                  </span>
                ))}
                {extractedRoles.length === 0 && (
                  <span className="text-xs text-slate-500 italic">No role detected yet</span>
                )}
              </div>
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  placeholder="+ Add extra role (e.g. Backend Engineer)"
                  value={newRoleInput}
                  onChange={(e) => setNewRoleInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addRole())}
                  className="flex-1 bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={addRole}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-white rounded-xl"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Tech Stack */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">
                Tech Stack / Skills Detected ({extractedStack.length})
              </label>
              <div className="flex flex-wrap gap-1.5 p-3 bg-slate-950/50 border border-slate-800 rounded-xl max-h-40 overflow-y-auto items-center">
                {extractedStack.map((skill, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 text-xs bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 px-2.5 py-1 rounded-lg"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeStack(idx)}
                      className="hover:text-rose-400 text-[10px]"
                    >
                      ✕
                    </button>
                  </span>
                ))}
                {extractedStack.length === 0 && (
                  <span className="text-xs text-slate-500 italic">No skills detected</span>
                )}
              </div>
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  placeholder="+ Add extra skill (e.g. Next.js, Redis)"
                  value={newStackInput}
                  onChange={(e) => setNewStackInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addStack())}
                  className="flex-1 bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={addStack}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-white rounded-xl"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Seniority Levels */}
            {extractedLevels.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-2">
                  Seniority Level Detected
                </label>
                <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-950/50 border border-slate-800 rounded-xl items-center">
                  {extractedLevels.map((lvl, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 text-xs bg-amber-500/10 border border-amber-500/30 text-amber-300 px-2.5 py-1 rounded-lg"
                    >
                      {lvl}
                      <button
                        type="button"
                        onClick={() => removeLevel(idx)}
                        className="hover:text-rose-400 text-[10px]"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Action options */}
            <div className="pt-2 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Save mode:</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMergeMode("merge")}
                    className={`px-3 py-1 rounded-lg border transition-all ${
                      mergeMode === "merge"
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                        : "border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    Merge with existing ({currentStack.length} skills)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMergeMode("replace")}
                    className={`px-3 py-1 rounded-lg border transition-all ${
                      mergeMode === "replace"
                        ? "bg-rose-500/20 border-rose-500 text-rose-300"
                        : "border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    Replace profile
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={triggerRescore}
                  onChange={(e) => setTriggerRescore(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-emerald-500"
                />
                <span>Recalculate match score for all 800+ existing jobs in database</span>
              </label>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={isApplying || (extractedRoles.length === 0 && extractedStack.length === 0)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-emerald-900/30 flex items-center gap-2"
              >
                {isApplying ? "Updating & Rescoring..." : "Apply to Profile & Save"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
