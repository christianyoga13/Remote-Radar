"use client";

import React from "react";
import { useDashboard } from "@/hooks/useDashboard";
import { JobFilters } from "./JobFilters";
import { JobCard } from "./JobCard";

export function JobList() {
  const { filteredJobs } = useDashboard();

  return (
    <section>
      <JobFilters />

      {filteredJobs.length === 0 ? (
        <div className="card" style={{ color: "var(--muted)" }}>
          No vacancies match the current filter criteria.
        </div>
      ) : (
        filteredJobs.map((job) => <JobCard key={job.id} job={job} />)
      )}
    </section>
  );
}
