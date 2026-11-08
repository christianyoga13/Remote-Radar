"use client";

import React from "react";
import { useDashboard } from "@/hooks/useDashboard";
import { AddCompanyForm } from "./AddCompanyForm";

export function CompanyTable() {
  const {
    companies,
    toggleCompanyActive,
    triggerManualFetch,
    isFetchingJobs,
    triggerSyncRemoteInTech,
    isSyncingRemoteInTech,
    fetchStatusMessage,
  } = useDashboard();

  return (
    <section>
      <AddCompanyForm />

      {/* Sync from remoteintech & Status Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
            Monitored Companies ({companies.length})
          </h2>
          <span className="badge" style={{ background: "var(--primary-muted)", color: "var(--primary)" }}>
            {companies.filter((c) => c.active).length} Active
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            className="btn-primary-batch"
            onClick={() => triggerSyncRemoteInTech()}
            disabled={isSyncingRemoteInTech}
            title="Discover & sync worldwide remote companies from remoteintech GitHub"
          >
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{isSyncingRemoteInTech ? "Syncing remoteintech..." : "Sync from remoteintech"}</span>
          </button>
        </div>
      </div>

      {fetchStatusMessage && (
        <div
          style={{
            padding: "8px 12px",
            background: "var(--surface-container)",
            border: "1px solid var(--border-subtle)",
            borderRadius: 6,
            fontSize: 12,
            fontFamily: "var(--font-mono, monospace)",
            color: "var(--primary)",
            marginBottom: 12,
          }}
        >
          {fetchStatusMessage}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>ATS / Slug</th>
              <th>Region & Policy</th>
              <th>Last Fetched</th>
              <th>Last Status</th>
              <th>Fails</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.id}>
                <td>
                  <strong>{c.name}</strong>
                  {c.careers_url && (
                    <div>
                      <a
                        href={c.careers_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 11 }}
                      >
                        Career Page ↗
                      </a>
                    </div>
                  )}
                </td>
                <td>
                  <code>
                    {c.ats}:{c.slug}
                  </code>
                </td>
                <td>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    {c.region && (
                      <span className="badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399", fontSize: 10 }}>
                        🌍 {c.region}
                      </span>
                    )}
                    {c.remote_policy && (
                      <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                        {c.remote_policy}
                      </span>
                    )}
                    {c.source && (
                      <span style={{ fontSize: 10, fontFamily: "var(--font-mono, monospace)", color: "var(--text-muted)" }}>
                        src: {c.source}
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  {c.last_fetched_at ? (
                    new Date(c.last_fetched_at).toLocaleString()
                  ) : (
                    <span style={{ color: "var(--muted)", fontStyle: "italic", fontSize: 12 }}>
                      Belum pernah
                    </span>
                  )}
                </td>
                <td
                  style={{
                    color: c.last_status?.startsWith("error")
                      ? "var(--danger)"
                      : "var(--muted)",
                  }}
                >
                  {c.last_status || "—"}
                </td>
                <td>{c.fail_count}</td>
                <td>
                  <button
                    className={`btn ${c.active ? "btn-active" : ""}`}
                    onClick={() => toggleCompanyActive(c)}
                  >
                    {c.active ? "Active" : "Paused"}
                  </button>
                </td>
                <td>
                  <button
                    className={`btn ${!c.last_fetched_at ? "btn-primary" : ""}`}
                    title={`Fetch jobs from ${c.name} immediately`}
                    disabled={isFetchingJobs}
                    onClick={() => triggerManualFetch(c.id)}
                    style={{ whiteSpace: "nowrap" }}
                  >
                    ⚡ Fetch Now
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
