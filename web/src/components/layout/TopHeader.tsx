"use client";

import React from "react";
import { useDashboard } from "@/hooks/useDashboard";

export function TopHeader() {
  const { userEmail, fetchAllFromSupabase, setSearch } = useDashboard();

  return (
    <header className="top-telemetry-header">
      {/* Status Cluster */}
      <div className="header-status-cluster">
        <div className="status-indicator-pill">
          <div className="telemetry-pulse-dot" />
          <span>pg_cron: Active</span>
        </div>
        <span style={{ color: "var(--text-tertiary)" }}>|</span>
        <span style={{ color: "var(--text-secondary)" }}>
          <strong style={{ color: "var(--text-primary)" }}>3</strong> ATS Adapters Live
        </span>
        <span style={{ color: "var(--text-tertiary)" }}>|</span>
        <span style={{ color: "var(--status-emerald)" }}>
          ✅ Indonesia/WIB Filter: ON
        </span>
      </div>

      {/* Stream Telemetry Line */}
      <div className="header-stream-line">
        <span>● STREAM: ONLINE</span>
        <span style={{ opacity: 0.5 }}>·</span>
        <span>ATS SYNC POOL 04</span>
        <span style={{ opacity: 0.5 }}>·</span>
        <span style={{ color: "var(--primary)" }}>TG Dispatch: @remoteradar_bot (WIB)</span>
      </div>

      {/* Utility Cluster */}
      <div className="header-utility-cluster">
        <button
          className="command-bar-hint"
          onClick={() => {
            const input = document.querySelector('input[type="text"]') as HTMLInputElement | null;
            if (input) input.focus();
          }}
          title="Quick Find"
        >
          <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span>Quick Find</span>
          <span className="kbd-badge">⌘K</span>
        </button>

        <button
          className="btn"
          onClick={() => fetchAllFromSupabase()}
          title="Refresh telemetry & feed"
          style={{ padding: "5px 8px" }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>

        <div className="user-identity-pill">
          <div className="user-avatar-dot" />
          <span>{userEmail ? userEmail.split("@")[0] : "Christian Admin"}</span>
        </div>
      </div>
    </header>
  );
}
