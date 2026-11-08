"use client";

import React from "react";
import { useDashboard } from "@/hooks/useDashboard";
import { TelemetryStatCards } from "./TelemetryStatCards";
import { JobFilters } from "./JobFilters";
import { JobCard } from "./JobCard";

export function JobList() {
  const {
    jobs,
    filteredJobs,
    companies,
    companyFilter,
    locFilter,
    setLocFilter,
    minScore,
    setMinScore,
    search,
    setSearch,
  } = useDashboard();

  const selectedCompany = companies.find((c) => String(c.id) === companyFilter);
  const companyJobsCount =
    companyFilter !== "all"
      ? jobs.filter((j) => String(j.company_id) === companyFilter).length
      : 0;

  return (
    <section>
      {/* 4 Telemetry Stat KPI Cards (DESIGN.md Section 4.3) */}
      <TelemetryStatCards />

      {/* Primary Toolbar & Filters */}
      <JobFilters />

      {filteredJobs.length === 0 ? (
        <div
          className="card"
          style={{
            padding: "32px 24px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          {companyJobsCount > 0 ? (
            <>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: "var(--text)",
                }}
              >
                Terdapat {companyJobsCount} lowongan dari{" "}
                <span style={{ color: "var(--accent)" }}>
                  {selectedCompany?.name || "perusahaan ini"}
                </span>{" "}
                di database.
              </div>
              <p
                style={{
                  color: "var(--muted)",
                  fontSize: 13,
                  maxWidth: 580,
                  lineHeight: 1.6,
                }}
              >
                Lowongan saat ini tersembunyi karena filter{" "}
                <strong>
                  Location ({locFilter})
                </strong>{" "}
                dan/atau{" "}
                <strong>Min Score ({minScore})</strong>. Lowongan non-tech atau yang belum ditandai remote memiliki skor di bawah ambang batas pencocokan CV.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setLocFilter("all");
                  setMinScore(0);
                  setSearch("");
                }}
                style={{ marginTop: 4, padding: "8px 18px" }}
              >
                🔓 Tampilkan Semua {companyJobsCount} Lowongan {selectedCompany?.name} (Set Location: All & Min Score: 0)
              </button>
            </>
          ) : (
            <>
              <div style={{ color: "var(--muted)", fontSize: 14 }}>
                Tidak ada lowongan yang sesuai dengan kriteria filter saat ini.
              </div>
              {(locFilter !== "all" || minScore > 0 || search.trim() !== "") && (
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setLocFilter("all");
                    setMinScore(0);
                    setSearch("");
                  }}
                  style={{ fontSize: 13, padding: "6px 14px" }}
                >
                  Reset Filter (Location: All & Min Score: 0)
                </button>
              )}
            </>
          )}
        </div>
      ) : (
        filteredJobs.map((job) => <JobCard key={job.id} job={job} />)
      )}
    </section>
  );
}

