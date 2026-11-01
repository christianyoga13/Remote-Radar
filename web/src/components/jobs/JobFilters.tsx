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
  } = useDashboard();

  // Compute job counts per company
  const companyCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const j of jobs) {
      counts[j.company_id] = (counts[j.company_id] || 0) + 1;
    }
    return counts;
  }, [jobs]);

  // Sort companies: highest job count first, then alphabetical
  const sortedCompanies = useMemo(() => {
    return [...companies].sort((a, b) => {
      const countA = companyCounts[a.id] || 0;
      const countB = companyCounts[b.id] || 0;
      if (countB !== countA) return countB - countA;
      return a.name.localeCompare(b.name);
    });
  }, [companies, companyCounts]);

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Main Filter Dropdowns & Search */}
      <div className="filters-bar">
        <input
          type="search"
          placeholder="Search role, stack, company..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ minWidth: 220, flex: 1 }}
        />
        <select
          value={locFilter}
          onChange={(e) =>
            setLocFilter(e.target.value as LocationClass | "all")
          }
        >
          <option value="eligible">Location: Eligible (ID/APAC/Global)</option>
          <option value="unknown">Location: Unknown</option>
          <option value="restricted">Location: Restricted (US/EU Only)</option>
          <option value="all">Location: All</option>
        </select>
        <select
          value={levelFilter}
          onChange={(e) =>
            setLevelFilter(e.target.value as SeniorityLevel)
          }
        >
          <option value="all">Level: All</option>
          <option value="junior">Level: Junior / Entry</option>
          <option value="mid">Level: Mid / Regular</option>
          <option value="senior">Level: Senior</option>
          <option value="lead">Level: Lead / Staff / Principal</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as JobStatus | "all")
          }
        >
          <option value="all">Status: All</option>
          <option value="new">Status: New</option>
          <option value="saved">Status: Saved</option>
          <option value="applied">Status: Applied</option>
          <option value="ignored">Status: Ignored</option>
        </select>
        <select
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
        >
          <option value="all">Company: All ({jobs.length})</option>
          {sortedCompanies.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.name} ({companyCounts[c.id] || 0})
            </option>
          ))}
        </select>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: "var(--muted)",
          }}
        >
          Min Score:
          <input
            type="number"
            min={0}
            max={100}
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value) || 0)}
            style={{ width: 64 }}
          />
        </label>
      </div>

      {/* Interactive Horizontal Scrollable Company Pills Bar */}
      <div className="company-pills-container">
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
                onClick={() =>
                  setCompanyFilter(isSelected ? "all" : String(c.id))
                }
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

