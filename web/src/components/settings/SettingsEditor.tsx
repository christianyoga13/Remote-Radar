"use client";

import React, { useState } from "react";
import { useDashboard } from "@/hooks/useDashboard";
import { CvUploadModal } from "./CvUploadModal";

export function SettingsEditor() {
  const {
    profile,
    profileJson,
    setProfileJson,
    locRulesJson,
    setLocRulesJson,
    handleSaveSettings,
    settingsMsg,
    isRescoring,
    applyCvProfileAndRescore,
    rescoreAllJobs,
  } = useDashboard();

  const [isCvModalOpen, setIsCvModalOpen] = useState(false);

  return (
    <section className="space-y-6">
      {/* Smart CV Profiler Banner */}
      <div className="card" style={{
        background: "linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(6, 182, 212, 0.08) 100%)",
        borderColor: "rgba(16, 185, 129, 0.25)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "18px 22px",
        flexWrap: "wrap",
      }}>
        <div style={{ maxWidth: 580 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 20 }}>📄</span>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#fff" }}>
              Smart CV Profiler (Auto Matcher)
            </h3>
            <span style={{
              fontSize: 10,
              fontWeight: 600,
              textTransform: "uppercase",
              padding: "2px 8px",
              borderRadius: 6,
              background: "rgba(16, 185, 129, 0.2)",
              color: "#34d399",
            }}>
              New Feature
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "#94a3b8", lineHeight: 1.5 }}>
            Upload your CV (PDF or text). The system will automatically extract your technical skills, target roles, and seniority level, then recalculate match scores for all 830+ vacancies in the database.
          </p>
        </div>

        <button
          className="btn btn-primary"
          style={{
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            boxShadow: "0 4px 14px rgba(16, 185, 129, 0.35)",
            padding: "10px 18px",
            fontWeight: 600,
          }}
          onClick={() => setIsCvModalOpen(true)}
        >
          <span>⚡</span> Upload CV / Auto-Configure
        </button>
      </div>

      {/* Grid of JSON editors */}
      <div className="grid-2">
        <div className="card">
          <label className="field-label">
            settings.profile (Roles, Stack, Levels, Blacklist, Min Score)
          </label>
          <textarea
            rows={16}
            style={{ width: "100%", fontFamily: "monospace" }}
            value={profileJson}
            onChange={(e) => setProfileJson(e.target.value)}
          />
        </div>

        <div className="card">
          <label className="field-label">
            settings.location_rules (Eligible & Restricted Keywords)
          </label>
          <textarea
            rows={16}
            style={{ width: "100%", fontFamily: "monospace" }}
            value={locRulesJson}
            onChange={(e) => setLocRulesJson(e.target.value)}
          />
        </div>
      </div>

      {/* Action footer */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
        <button className="btn btn-primary" onClick={handleSaveSettings}>
          Save Settings & Rescore Database
        </button>

        <button
          className="btn btn-outline"
          onClick={() => rescoreAllJobs()}
          disabled={isRescoring}
          style={{ opacity: isRescoring ? 0.6 : 1 }}
        >
          {isRescoring ? "Recalculating Scores..." : "🔄 Rescore All Vacancies Now"}
        </button>

        {settingsMsg && (
          <span style={{ fontSize: 13, color: "var(--accent)" }}>
            {settingsMsg}
          </span>
        )}
      </div>

      {/* CV Upload Modal */}
      <CvUploadModal
        isOpen={isCvModalOpen}
        onClose={() => setIsCvModalOpen(false)}
        onApplyProfile={async (extracted, mode, triggerRescore) => {
          await applyCvProfileAndRescore(extracted, mode, triggerRescore);
        }}
        currentRoles={profile.roles || []}
        currentStack={profile.stack || []}
        currentLevels={profile.levels || []}
      />
    </section>
  );
}
