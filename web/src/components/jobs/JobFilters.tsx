"use client";

import React, { useMemo } from "react";
import { LocationClass, JobStatus, SeniorityLevel } from "@/types";
import { useDashboard } from "@/hooks/useDashboard";

export function JobFilters() {
  const {
    search,
    setSearch,
    locFilter,
    setLocFilter,
    statusFilter,
    setStatusFilter,
    levelFilter,
    setLevelFilter,
    companyFilter,
    setCompanyFilter,
    minScore,
    setMinScore,
    companies,
    jobs,
    filteredJobs,
    triggerManualFetch,
    isFetchingJobs,
  } = useDashboard();

  // Location counts
  const locCounts = useMemo(() => {
    return {
      all: jobs.length,
      eligible: jobs.filter((j) => j.location_class === "eligible").length,
      unknown: jobs.filter((j) => j.location_class === "unknown").length,
      restricted: jobs.filter((j) => j.location_class === "restricted").length,
    };
  }, [jobs]);

  // Compute job counts per company
  const companyCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const j of jobs) {
      counts[j.company_id] = (counts[j.company_id] || 0) + 1;
    }
    return counts;
  }, [jobs]);

  const sortedCompanies = useMemo(() => {
    return [...companies].sort((a, b) => {
      const countA = companyCounts[a.id] || 0;
      const countB = companyCounts[b.id] || 0;
      if (countB !== countA) return countB - countA;
      return a.name.localeCompare(b.name);
    });
  }, [companies, companyCounts]);

  const quickStacks = [
    { label: "Go / Golang", query: "go" },
    { label: "React / Next.js", query: "react" },
    { label: "Flutter", query: "flutter" },
    { label: "PostgreSQL", query: "postgres" },
    { label: "Fullstack", query: "fullstack" },
    { label: "TypeScript", query: "typescript" },
  ];

  function handleExportCsv() {
    if (filteredJobs.length === 0) return;
    const headers = ["ID", "Company", "Title", "Location", "Classification", "Score", "Timezone", "URL"];
    const rows = filteredJobs.map((j) => [
      j.id,
      `"${(j.companies?.name || "").replace(/"/g, '""')}"`,
      `"${(j.title || "").replace(/"/g, '""')}"`,
      `"${(j.location_raw || "").replace(/"/g, '""')}"`,
      j.location_class,
      j.match_score ?? 0,
      `"${(j.timezone_note || "").replace(/"/g, '""')}"`,
      j.url,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `remote-radar-jobs-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div style={{ marginBottom: 18 }}>
      {/* Primary Search Bar with Action Buttons */}
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        <div style={{ position: "relative", flex: 1, minWidth: 260 }}>
          <input
            type="search"
            placeholder="Filter by title, stack (e.g. Go, React, Flutter), or company... (⌘K)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 12px",
              background: "var(--surface-container-low)",
              borderColor: "var(--border-subtle)",
              borderRadius: 6,
              fontSize: 13,
            }}
          />
        </div>

        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value as SeniorityLevel)}
          style={{
            padding: "8px 12px",
            background: "var(--surface-container-low)",
            borderColor: "var(--border-subtle)",
            borderRadius: 6,
            fontSize: 12,
          }}
        >
          <option value="all">Level: All</option>
          <option value="junior">Junior / Entry</option>
          <option value="mid">Mid / Regular</option>
          <option value="senior">Senior</option>
          <option value="lead">Lead / Staff</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as JobStatus | "all")}
          style={{
            padding: "8px 12px",
            background: "var(--surface-container-low)",
            borderColor: "var(--border-subtle)",
            borderRadius: 6,
            fontSize: 12,
          }}
        >
          <option value="all">Status: All</option>
          <option value="new">New</option>
          <option value="saved">Saved</option>
          <option value="applied">Applied</option>
          <option value="ignored">Ignored</option>
        </select>

        <button
          type="button"
          className="btn"
          onClick={handleExportCsv}
          title="Export current filtered jobs to CSV"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px" }}
        >
          <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Export CSV</span>
        </button>

        <button
          type="button"
          className="btn-primary-batch"
          onClick={() => triggerManualFetch()}
          disabled={isFetchingJobs}
          title="Trigger immediate ATS fetch batch"
        >
          <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>{isFetchingJobs ? "Triggering..." : "Trigger Batch Run"}</span>
        </button>
      </div>

      {/* Segmented Location Filter Pills (DESIGN.md 4.2) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexWrap: "wrap",
          padding: "4px 0",
        }}
      >
        <button
          type="button"
          className={`company-pill ${locFilter === "all" ? "active" : ""}`}
          onClick={() => setLocFilter("all")}
        >
          <span>Semua ({locCounts.all})</span>
        </button>
        <button
          type="button"
          className={`company-pill ${locFilter === "eligible" ? "active" : ""}`}
          onClick={() => setLocFilter("eligible")}
          style={
            locFilter === "eligible"
              ? { borderColor: "var(--status-emerald)", color: "var(--status-emerald)", background: "rgba(16, 185, 129, 0.15)" }
              : {}
          }
        >
          <div className="telemetry-pulse-dot" />
          <span>Eligible Indonesia / Global ({locCounts.eligible})</span>
        </button>
        <button
          type="button"
          className={`company-pill ${locFilter === "unknown" ? "active" : ""}`}
          onClick={() => setLocFilter("unknown")}
          style={locFilter === "unknown" ? { borderColor: "var(--status-amber)", color: "var(--status-amber)" } : {}}
        >
          <span>Unknown ({locCounts.unknown})</span>
        </button>
        <button
          type="button"
          className={`company-pill ${locFilter === "restricted" ? "active" : ""}`}
          onClick={() => setLocFilter("restricted")}
          style={locFilter === "restricted" ? { borderColor: "var(--status-rose)", color: "var(--status-rose)" } : {}}
        >
          <span>Restricted/US ({locCounts.restricted})</span>
        </button>
      </div>

      {/* Quick Tech Stack Filter Chips Bar */}
      <div className="quick-stack-bar">
        <span className="quick-stack-label">Stack Filter:</span>
        {quickStacks.map((st) => {
          const isActive = search.toLowerCase().includes(st.query);
          return (
            <button
              key={st.label}
              type="button"
              className={`quick-stack-chip ${isActive ? "active" : ""}`}
              onClick={() => {
                if (isActive) {
                  setSearch(search.replace(new RegExp(st.query, "gi"), "").trim());
                } else {
                  setSearch(search ? `${search} ${st.query}` : st.query);
                }
              }}
            >
              {st.label}
            </button>
          );
        })}
      </div>

      {/* Interactive Horizontal Scrollable Company Pills Bar */}
      <div className="company-pills-container" style={{ marginTop: 8 }}>
        <div className="company-pills-bar">
          <button
            type="button"
            className={`company-pill ${companyFilter === "all" ? "active" : ""}`}
            onClick={() => setCompanyFilter("all")}
          >
            <span>All Companies</span>
            <span className="company-pill-count">{jobs.length}</span>
          </button>
          {sortedCompanies.map((c) => {
            const count = companyCounts[c.id] || 0;
            const isSelected = companyFilter === String(c.id);
            return (
              <button
                key={c.id}
                type="button"
                className={`company-pill ${isSelected ? "active" : ""}`}
                onClick={() => setCompanyFilter(isSelected ? "all" : String(c.id))}
                title={`Filter ${c.name} (${c.ats}) — ${count} lowongan`}
              >
                <span>{c.name}</span>
                <span className="company-pill-count">{count}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
