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
    <div className="modal-backdrop">
      <div className="modal-dialog">
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
              <span>📄</span> Smart CV Profiler
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted)" }}>
              Upload your CV to automatically configure target roles, skills, and rescore vacancies.
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn"
            style={{ padding: "4px 8px", fontSize: 13, cursor: "pointer" }}
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div style={{
            background: "var(--danger-dim)",
            border: "1px solid var(--danger)",
            color: "var(--danger)",
            borderRadius: 6,
            padding: "8px 12px",
            fontSize: 12,
            marginBottom: 16,
          }}>
            {errorMsg}
          </div>
        )}

        {!parseResult ? (
          /* Step 1: Upload or Paste */
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => setIsPasteMode(false)}
                className={`btn ${!isPasteMode ? "btn-primary" : ""}`}
                style={{ flex: 1, padding: "8px" }}
              >
                Upload PDF / Document
              </button>
              <button
                type="button"
                onClick={() => setIsPasteMode(true)}
                className={`btn ${isPasteMode ? "btn-primary" : ""}`}
                style={{ flex: 1, padding: "8px" }}
              >
                Paste CV Text
              </button>
            </div>

            {!isPasteMode ? (
              <label className="dropzone">
                <input
                  type="file"
                  accept=".pdf,.txt,.md"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const selected = e.target.files?.[0];
                    if (selected) handleFileUpload(selected);
                  }}
                  disabled={isProcessing}
                />
                <div style={{ fontSize: 32, marginBottom: 8 }}>
                  {isProcessing ? "⏳" : "📎"}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                  {isProcessing ? "Analyzing your CV..." : "Click or drag & drop your CV here"}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                  Supports PDF, Markdown, or plain text
                </div>
              </label>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste your CV text, resume summary, or LinkedIn 'About' section here..."
                  rows={6}
                  style={{ width: "100%", fontFamily: "monospace", fontSize: 12 }}
                />
                <button
                  type="button"
                  onClick={handleProcessPastedText}
                  disabled={isProcessing || !pastedText.trim()}
                  className="btn btn-primary"
                  style={{ padding: "8px 14px", width: "100%" }}
                >
                  {isProcessing ? "Analyzing Text..." : "Analyze & Extract Skills"}
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Step 2: Review & Modify Extracted Skills */
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{
              background: "var(--bg)",
              border: "1px solid var(--border)",
              padding: "10px 14px",
              borderRadius: 8,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>
                  {file?.name || "Pasted CV text"}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>
                  Extracted {parseResult.wordCount} words • Found {extractedRoles.length} roles, {extractedStack.length} skills
                </div>
              </div>
              <button
                type="button"
                onClick={() => setParseResult(null)}
                className="btn"
                style={{ fontSize: 11, padding: "4px 8px" }}
              >
                Re-upload
              </button>
            </div>

            {/* Target Roles */}
            <div>
              <label className="field-label">
                Target Roles Detected ({extractedRoles.length})
              </label>
              <div className="chip-group">
                {extractedRoles.map((role, idx) => (
                  <span key={idx} className="chip">
                    {role}
                    <button type="button" onClick={() => removeRole(idx)}>✕</button>
                  </span>
                ))}
                {extractedRoles.length === 0 && (
                  <span style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>
                    No roles detected
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <input
                  type="text"
                  placeholder="+ Add role (e.g. Backend Engineer)"
                  value={newRoleInput}
                  onChange={(e) => setNewRoleInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addRole())}
                  style={{ flex: 1 }}
                />
                <button type="button" onClick={addRole} className="btn">
                  Add
                </button>
              </div>
            </div>

            {/* Tech Stack */}
            <div>
              <label className="field-label">
                Tech Stack / Skills Detected ({extractedStack.length})
              </label>
              <div className="chip-group" style={{ maxHeight: 150, overflowY: "auto" }}>
                {extractedStack.map((skill, idx) => (
                  <span key={idx} className="chip chip-cyan">
                    {skill}
                    <button type="button" onClick={() => removeStack(idx)}>✕</button>
                  </span>
                ))}
                {extractedStack.length === 0 && (
                  <span style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>
                    No skills detected
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <input
                  type="text"
                  placeholder="+ Add skill (e.g. Next.js, Redis)"
                  value={newStackInput}
                  onChange={(e) => setNewStackInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addStack())}
                  style={{ flex: 1 }}
                />
                <button type="button" onClick={addStack} className="btn">
                  Add
                </button>
              </div>
            </div>

            {/* Seniority Levels */}
            {extractedLevels.length > 0 && (
              <div>
                <label className="field-label">Seniority Level Detected</label>
                <div className="chip-group">
                  {extractedLevels.map((lvl, idx) => (
                    <span key={idx} className="chip chip-amber">
                      {lvl}
                      <button type="button" onClick={() => removeLevel(idx)}>✕</button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Options */}
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                <span style={{ color: "var(--muted)" }}>Save mode:</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => setMergeMode("merge")}
                    className={`btn ${mergeMode === "merge" ? "btn-active" : ""}`}
                  >
                    Merge with existing ({currentStack.length} skills)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMergeMode("replace")}
                    className={`btn ${mergeMode === "replace" ? "btn-active" : ""}`}
                  >
                    Replace profile
                  </button>
                </div>
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text)", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={triggerRescore}
                  onChange={(e) => setTriggerRescore(e.target.checked)}
                />
                <span>Recalculate match score for all 830+ vacancies in database</span>
              </label>
            </div>

            {/* Footer Buttons */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
              <button type="button" onClick={onClose} className="btn">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={isApplying || (extractedRoles.length === 0 && extractedStack.length === 0)}
                className="btn btn-primary"
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
