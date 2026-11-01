"use client";

import React from "react";
import { useDashboard } from "@/hooks/useDashboard";

export function RunTable() {
  const { runs } = useDashboard();

  return (
    <section>
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Run ID</th>
              <th>Started At</th>
              <th>Duration</th>
              <th>Companies OK / Fail</th>
              <th>New Jobs</th>
              <th>Closed Jobs</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => {
              const durSec =
                r.finished_at && r.started_at
                  ? Math.max(
                      0,
                      Math.round(
                        (new Date(r.finished_at).getTime() -
                          new Date(r.started_at).getTime()) /
                          1000
                      )
                    )
                  : null;
              return (
                <tr key={r.id}>
                  <td>#{r.id}</td>
                  <td>{new Date(r.started_at).toLocaleString()}</td>
                  <td>{durSec !== null ? `${durSec}s` : "Running..."}</td>
                  <td>
                    <span style={{ color: "var(--accent)" }}>
                      {r.companies_ok} OK
                    </span>{" "}
                    /{" "}
                    <span
                      style={{
                        color:
                          r.companies_failed > 0
                            ? "var(--danger)"
                            : "var(--muted)",
                      }}
                    >
                      {r.companies_failed} failed
                    </span>
                  </td>
                  <td>+{r.jobs_new}</td>
                  <td>-{r.jobs_closed}</td>
                  <td style={{ color: "var(--muted)" }}>
                    {r.notes || "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
