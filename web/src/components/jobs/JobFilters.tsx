"use client";

import React from "react";
import { LocationClass, JobStatus } from "@/types";
import { useDashboard } from "@/hooks/useDashboard";

export function JobFilters() {
  const {
    search,
    setSearch,
    locFilter,
    setLocFilter,
    statusFilter,
    setStatusFilter,
    companyFilter,
    setCompanyFilter,
    minScore,
    setMinScore,
    companies,
  } = useDashboard();

  return (
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
        <option value="all">Company: All</option>
        {companies.map((c) => (
          <option key={c.id} value={String(c.id)}>
            {c.name} ({c.ats})
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
  );
}
