"use client";

import React, { useMemo } from "react";
import { JobRow, JobStatus, detectJobLevel } from "@/types";
import { useDashboard } from "@/hooks/useDashboard";

interface JobCardProps {
  job: JobRow;
}

export function JobCard({ job }: JobCardProps) {
  const { expandedJobId, setExpandedJobId, updateJobStatus } = useDashboard();
  const isExpanded = expandedJobId === job.id;
  const detectedLevel = detectJobLevel(job.title, job.description);

  // Compute 2-letter avatar initials from company name
  const companyName = job.companies?.name || `Company #${job.company_id}`;
  const initials = useMemo(() => {
    const clean = companyName.trim();
    if (clean.length <= 2) return clean.toUpperCase();
    const parts = clean.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  }, [companyName]);

  // Extract relevant tech tags from title & description
  const techTags = useMemo(() => {
    const keywords = [
      "Go",
      "Golang",
      "React",
      "Next.js",
      "TypeScript",
      "JavaScript",
      "Flutter",
      "PostgreSQL",
      "Postgres",
      "Docker",
      "Kubernetes",
      "AWS",
      "Python",
      "Rust",
      "Tailwind",
      "Node.js",
      "GraphQL",
      "Distributed Systems",
    ];
    const text = `${job.title} ${job.description || ""}`.toLowerCase();
    const found: string[] = [];
    for (const kw of keywords) {
      if (text.includes(kw.toLowerCase()) && !found.includes(kw)) {
        found.push(kw);
      }
      if (found.length >= 5) break;
    }
    return found;
  }, [job.title, job.description]);

  const timeAgo = useMemo(() => {
    const d = new Date(job.first_seen_at);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60));
    if (diffHours < 1) return "Just now";
    if (diffHours === 1) return "1 hour ago";
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }, [job.first_seen_at]);

  const atsLabel = job.companies?.ats ? job.companies.ats.toUpperCase() : "ATS";

  return (
    <article className="cyber-card">
      <div className="cyber-card-main">
        {/* Company Avatar Initial */}
        <div className="cyber-avatar" title={companyName}>
          {initials}
        </div>

        {/* Content Body */}
        <div className="cyber-content">
          {/* Header Row: Title & Actions */}
          <div className="cyber-title-row">
            <div>
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="cyber-job-title"
              >
                {job.title} ↗
              </a>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  marginTop: 2,
                }}
              >
                <strong style={{ color: "var(--text-primary)" }}>{companyName}</strong>
                <span>·</span>
                <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 11, color: "var(--text-tertiary)" }}>
                  {job.external_id}
                </span>
                <span>·</span>
                <span>{job.location_raw || "Remote"}</span>
              </div>
            </div>

            {/* Direct Actions Toolbar */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn"
                style={{
                  background: "var(--primary-muted)",
                  borderColor: "rgba(6, 182, 212, 0.4)",
                  color: "var(--primary)",
                  fontWeight: 600,
                  fontSize: 11,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  textDecoration: "none",
                }}
              >
                <span>Lamar Langsung</span>
                <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>

              {/* Quick Status Buttons */}
              <button
                className={`btn ${job.status === "saved" ? "btn-active" : ""}`}
                onClick={() => updateJobStatus(job.id, job.status === "saved" ? "new" : "saved")}
                title="Save/Bookmark (S)"
                style={{ padding: "5px 7px" }}
              >
                <svg width="13" height="13" fill={job.status === "saved" ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>

              <button
                className={`btn ${job.status === "applied" ? "btn-active" : ""}`}
                onClick={() => updateJobStatus(job.id, job.status === "applied" ? "new" : "applied")}
                title="Mark as Applied (A)"
                style={{ padding: "5px 7px", color: job.status === "applied" ? "var(--status-emerald)" : undefined }}
              >
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </button>

              <button
                className={`btn ${job.status === "ignored" ? "btn-active" : ""}`}
                onClick={() => updateJobStatus(job.id, job.status === "ignored" ? "new" : "ignored")}
                title="Ignore job"
                style={{ padding: "5px 7px", color: job.status === "ignored" ? "var(--status-rose)" : undefined }}
              >
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Badges Row */}
          <div className="cyber-badges-row">
            <span
              className={`badge badge-${job.location_class}`}
              style={
                job.location_class === "eligible"
                  ? { background: "rgba(16, 185, 129, 0.15)", color: "#34d399", border: "1px solid rgba(16, 185, 129, 0.3)" }
                  : {}
              }
            >
              ● {job.location_class === "eligible" ? "Eligible Indonesia - Worldwide" : job.location_class.toUpperCase()}
            </span>

            <span
              className="badge"
              style={{
                background: "rgba(6, 182, 212, 0.15)",
                color: "var(--primary)",
                border: "1px solid rgba(6, 182, 212, 0.3)",
              }}
            >
              Match {job.match_score ?? 0}%
            </span>

            {job.timezone_note && (
              <span
                className="badge"
                style={{
                  background: "rgba(59, 130, 246, 0.15)",
                  color: "#60a5fa",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                }}
              >
                {job.timezone_note}
              </span>
            )}

            <span className={`badge badge-${detectedLevel}`}>
              {detectedLevel.toUpperCase()}
            </span>

            <span
              className="badge"
              style={{
                background: "var(--surface-container)",
                color: "var(--text-tertiary)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              {timeAgo} · {atsLabel}
            </span>
          </div>

          {/* Description Snippet / Preview */}
          {job.description && (
            <p
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                lineHeight: 1.5,
                marginTop: 6,
                marginBottom: 6,
                cursor: "pointer",
              }}
              onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
            >
              {isExpanded
                ? job.description
                : job.description.length > 220
                ? `${job.description.slice(0, 220)}... `
                : job.description}
              <span style={{ color: "var(--primary)", fontSize: 11, fontWeight: 500 }}>
                {isExpanded ? " [Show less]" : " [Read more]"}
              </span>
            </p>
          )}

          {/* Tech Stack Tags Row */}
          {techTags.length > 0 && (
            <div className="cyber-tags-row">
              {techTags.map((tag) => (
                <span key={tag} className="cyber-tag">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Footer Metadata */}
          <div className="cyber-footer">
            <span>
              {job.notified_at ? (
                <span style={{ color: "var(--primary)" }}>
                  TELEGRAM DISPATCHED - {new Date(job.notified_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} WIB
                </span>
              ) : (
                <span>QUEUED FOR TELEGRAM DISPATCH</span>
              )}
            </span>
            <span>
              Last seen: {new Date(job.last_seen_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
