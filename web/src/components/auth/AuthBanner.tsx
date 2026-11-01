"use client";

import React from "react";
import { useDashboard } from "@/hooks/useDashboard";

export function AuthBanner() {
  const {
    isConfigured,
    userEmail,
    loginEmail,
    setLoginEmail,
    authMsg,
    loading,
    handleMagicLinkLogin,
    handleSignOut,
    fetchAllFromSupabase,
    isFetchingJobs,
    fetchStatusMessage,
    triggerManualFetch,
  } = useDashboard();

  if (!isConfigured) {
    return (
      <div className="banner">
        <div>
          <strong>Demo Preview Mode:</strong> Set{" "}
          <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in{" "}
          <code>web/.env.local</code> to connect to your local or hosted
          Supabase instance.
        </div>
        <span className="badge badge-unknown">Offline Seed Data</span>
      </div>
    );
  }

  return (
    <div
      className="banner"
      style={{
        borderLeftColor: "var(--accent)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        {!userEmail ? (
          <form
            onSubmit={handleMagicLinkLogin}
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <strong>Supabase Auth:</strong>
            <input
              type="email"
              placeholder="owner@example.com"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              required
            />
            <button type="submit" className="btn btn-primary">
              Send Magic Link
            </button>
            {authMsg && <span style={{ fontSize: 12 }}>{authMsg}</span>}
          </form>
        ) : (
          <div>
            Signed in as <strong>{userEmail}</strong>{" "}
            {loading && "(Syncing...)"}
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            className="btn btn-primary"
            disabled={isFetchingJobs}
            onClick={() => triggerManualFetch()}
            style={{ fontWeight: 600 }}
          >
            {isFetchingJobs ? "⚡ Fetching ATS..." : "⚡ Run Batch Fetch (8)"}
          </button>
          <button
            className="btn"
            onClick={fetchAllFromSupabase}
            disabled={loading || isFetchingJobs}
          >
            Refresh UI
          </button>
          {userEmail && (
            <button className="btn" onClick={handleSignOut}>
              Sign Out
            </button>
          )}
        </div>
      </div>

      {fetchStatusMessage && (
        <div
          style={{
            fontSize: 13,
            color: "var(--accent)",
            background: "var(--surface)",
            padding: "6px 12px",
            borderRadius: 4,
            borderLeft: "3px solid var(--accent)",
          }}
        >
          {fetchStatusMessage}
        </div>
      )}
    </div>
  );
}
