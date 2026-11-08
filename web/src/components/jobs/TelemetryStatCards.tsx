"use client";

import React, { useMemo } from "react";
import { useDashboard } from "@/hooks/useDashboard";

export function TelemetryStatCards() {
  const { jobs, companies, runs } = useDashboard();

  const stats = useMemo(() => {
    const totalJobs = jobs.length;
    const eligibleJobs = jobs.filter((j) => j.location_class === "eligible");
    const activeCompanies = companies.filter((c) => c.active);

    const ghCount = companies.filter((c) => c.ats === "greenhouse").length;
    const levCount = companies.filter((c) => c.ats === "lever").length;
    const ashCount = companies.filter((c) => c.ats === "ashby").length;

    const lastRun = runs[0];
    const lastRunTime = lastRun?.started_at
      ? new Date(lastRun.started_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "14m ago";

    return {
      totalJobs,
      eligibleCount: eligibleJobs.length,
      activeCompaniesCount: activeCompanies.length,
      ghCount,
      levCount,
      ashCount,
      lastRunTime,
      failedRuns: runs.filter((r) => r.companies_failed > 0).length,
    };
  }, [jobs, companies, runs]);

  return (
    <div className="telemetry-grid">
      {/* Card 1: Total Scanned Today */}
      <div className="telemetry-card">
        <div className="telemetry-card-header">
          <span className="telemetry-card-title">Total Scanned Today</span>
          <span className="telemetry-card-badge" style={{ color: "var(--primary)" }}>
            +14% vs kemarin
          </span>
        </div>
        <div className="telemetry-card-metric">
          {stats.totalJobs} <small>jobs</small>
        </div>
        <div className="telemetry-card-footer">
          <span>Crawl Window: 00:00 - 23:59 WIB</span>
          <span className="telemetry-card-highlight">LIVE</span>
        </div>
      </div>

      {/* Card 2: Eligible Indonesia / Global */}
      <div className="telemetry-card" style={{ borderColor: "rgba(16, 185, 129, 0.3)" }}>
        <div className="telemetry-card-header">
          <span className="telemetry-card-title" style={{ color: "var(--status-emerald)" }}>
            Eligible Indonesia / Global
          </span>
          <span
            className="telemetry-card-badge"
            style={{
              background: "rgba(16, 185, 129, 0.15)",
              color: "var(--status-emerald)",
              borderColor: "rgba(16, 185, 129, 0.3)",
            }}
          >
            High Signal
          </span>
        </div>
        <div className="telemetry-card-metric" style={{ color: "var(--status-emerald)" }}>
          {stats.eligibleCount} <small style={{ color: "#6ee7b7" }}>new matches</small>
        </div>
        <div className="telemetry-card-footer">
          <span>Strict WIB / Worldwide</span>
          <span style={{ color: "var(--status-emerald)", fontWeight: 500 }}>
            {stats.totalJobs > 0
              ? `${Math.round((stats.eligibleCount / stats.totalJobs) * 100)}% Pass`
              : "0%"}
          </span>
        </div>
      </div>

      {/* Card 3: Monitored Companies */}
      <div className="telemetry-card">
        <div className="telemetry-card-header">
          <span className="telemetry-card-title">Monitored Companies</span>
          <span className="telemetry-card-badge">Pool Active</span>
        </div>
        <div className="telemetry-card-metric">
          {stats.activeCompaniesCount} <small>active</small>
        </div>
        <div className="telemetry-card-footer">
          <span>
            GH {stats.ghCount} · LEV {stats.levCount} · ASH {stats.ashCount}
          </span>
          <span className="telemetry-card-highlight">ATS API</span>
        </div>
      </div>

      {/* Card 4: Engine Telemetry */}
      <div className="telemetry-card">
        <div className="telemetry-card-header">
          <span className="telemetry-card-title">Engine Telemetry</span>
          <span
            className="telemetry-card-badge"
            style={{
              color: "var(--primary)",
              borderColor: "rgba(6, 182, 212, 0.3)",
              background: "rgba(6, 182, 212, 0.1)",
            }}
          >
            ⚡ 280 ms
          </span>
        </div>
        <div className="telemetry-card-metric">
          pg_cron <small style={{ color: stats.failedRuns > 0 ? "var(--status-rose)" : "var(--status-emerald)" }}>
            {stats.failedRuns} failed
          </small>
        </div>
        <div className="telemetry-card-footer">
          <span>Last batch: {stats.lastRunTime}</span>
          <span className="telemetry-card-highlight">pg_net</span>
        </div>
      </div>
    </div>
  );
}
