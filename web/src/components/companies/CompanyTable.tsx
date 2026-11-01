"use client";

import React from "react";
import { useDashboard } from "@/hooks/useDashboard";
import { AddCompanyForm } from "./AddCompanyForm";

export function CompanyTable() {
  const { companies, toggleCompanyActive } = useDashboard();

  return (
    <section>
      <AddCompanyForm />

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>ATS / Slug</th>
              <th>Last Fetched</th>
              <th>Last Status</th>
              <th>Fails</th>
              <th>Active</th>
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
                  {c.last_fetched_at
                    ? new Date(c.last_fetched_at).toLocaleString()
                    : "Never"}
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
