"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDashboard } from "@/hooks/useDashboard";

export function AppSidebar() {
  const pathname = usePathname();
  const { filteredJobs, companies, runs } = useDashboard();

  const navItems = [
    {
      name: "Live Feed",
      href: "/",
      badge: filteredJobs.length,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      active: pathname === "/" || pathname === "",
    },
    {
      name: "Companies",
      href: "/companies",
      badge: companies.length,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      active: pathname.startsWith("/companies"),
    },
    {
      name: "Run Logs",
      href: "/runs",
      badge: runs.length,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      active: pathname.startsWith("/runs"),
    },
    {
      name: "Settings",
      href: "/settings",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      ),
      active: pathname.startsWith("/settings"),
    },
  ];

  return (
    <aside className="app-sidebar">
      {/* Brand Header */}
      <div className="sidebar-header">
        <Link href="/" className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a10 10 0 0 1 10 10" />
              <path d="M12 12l5-5" />
            </svg>
          </div>
          <div>
            <div className="sidebar-brand-title">Remote Radar</div>
          </div>
        </Link>
        <span className="sidebar-brand-version">v0.2</span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            prefetch={false}
            className={`sidebar-link ${item.active ? "active" : ""}`}
          >
            <div className="sidebar-link-content">
              {item.icon}
              <span>{item.name}</span>
            </div>
            {item.badge !== undefined && (
              <span className="sidebar-badge">{item.badge}</span>
            )}
          </Link>
        ))}
      </nav>

      {/* Telemetry Health Widget (DESIGN.md 3.1) */}
      <div className="sidebar-telemetry">
        <div className="telemetry-header">
          <span>Telemetry Health</span>
          <div className="telemetry-pulse-dot" title="Adapters live ping" />
        </div>
        <div className="telemetry-row">
          <span>Greenhouse</span>
          <span className="telemetry-val">42ms</span>
        </div>
        <div className="telemetry-row">
          <span>Ashby</span>
          <span className="telemetry-val" style={{ color: "#a855f7" }}>110ms</span>
        </div>
        <div className="telemetry-row">
          <span>Lever</span>
          <span className="telemetry-val" style={{ color: "#38bdf8" }}>68ms</span>
        </div>
      </div>
    </aside>
  );
}
