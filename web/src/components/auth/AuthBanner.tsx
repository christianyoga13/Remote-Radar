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

  if (!userEmail) {
    return (
      <div className="banner">
        <form
          onSubmit={handleMagicLinkLogin}
          style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}
        >
          <strong>Supabase Auth (RLS Protected):</strong>
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
      </div>
    );
  }

  return (
    <div className="banner" style={{ borderLeftColor: "var(--accent)" }}>
      <div>
        Signed in as <strong>{userEmail}</strong>{" "}
        {loading && "(Syncing...)"}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn" onClick={fetchAllFromSupabase}>
          Refresh
        </button>
        <button className="btn" onClick={handleSignOut}>
          Sign Out
        </button>
      </div>
    </div>
  );
}
