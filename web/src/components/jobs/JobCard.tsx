"use client";

import React from "react";
import { JobRow, JobStatus, detectJobLevel } from "@/types";
import { useDashboard } from "@/hooks/useDashboard";

interface JobCardProps {
  job: JobRow;
}

export function JobCard({ job }: JobCardProps) {
  const { expandedJobId, setExpandedJobId, updateJobStatus } = useDashboard();
  const isExpanded = expandedJobId === job.id;
  const detectedLevel = detectJobLevel(job.title, job.description);

  return (
    <article className="card">
      <div className="job-header">
        <div>
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 15, fontWeight: 600 }}
          >
            {job.title} ↗
          </a>
          <div className="job-meta">
            <strong style={{ color: "var(--text)" }}>
              {job.companies?.name || `Company #${job.company_id}`}
            </strong>
            <span>·</span>
            <span>{job.location_raw || "Remote"}</span>
            {job.department && (
              <>
                <span>·</span>
                <span>{job.department}</span>
              </>
            )}
            <span>·</span>
            <span>
              Seen {new Date(job.first_seen_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <span
            className={`badge badge-${detectedLevel}`}
            title={`Seniority level: ${detectedLevel.toUpperCase()}`}
          >
            {detectedLevel.toUpperCase()}
          </span>
          <span
            className={`badge badge-${job.location_class}`}
            title="Location classification from settings.location_rules"
          >
            {job.location_class}
          </span>
          <span
            className="badge"
            style={{
              background: "var(--surface-hover)",
              border: "1px solid var(--border)",
            }}
          >
            Score: {job.match_score ?? 0}
          </span>
        </div>
      </div>

      {isExpanded && job.description && (
        <p
          style={{
            marginTop: 12,
            padding: 12,
            background: "var(--bg)",
            borderRadius: 6,
            fontSize: 13,
            color: "var(--muted)",
            whiteSpace: "pre-wrap",
          }}
        >
          {job.description}
        </p>
      )}

      <div className="job-actions">
        {(["new", "saved", "applied", "ignored"] as JobStatus[]).map((st) => (
          <button
            key={st}
            className={`btn ${job.status === st ? "btn-active" : ""}`}
            onClick={() => updateJobStatus(job.id, st)}
          >
            {st.toUpperCase()}
          </button>
        ))}
        {job.description && (
          <button
            className="btn"
            onClick={() =>
              setExpandedJobId(isExpanded ? null : job.id)
            }
          >
            {isExpanded ? "Hide Description" : "View Description"}
          </button>
        )}
      </div>
    </article>
  );
}
