"use client";

import React from "react";
import { useDashboard } from "@/hooks/useDashboard";

export function SettingsEditor() {
  const {
    profileJson,
    setProfileJson,
    locRulesJson,
    setLocRulesJson,
    handleSaveSettings,
    settingsMsg,
  } = useDashboard();

  return (
    <section>
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

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
        <button className="btn btn-primary" onClick={handleSaveSettings}>
          Save Settings to Database
        </button>
        {settingsMsg && (
          <span style={{ fontSize: 13, color: "var(--accent)" }}>
            {settingsMsg}
          </span>
        )}
      </div>
    </section>
  );
}
