"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDashboard } from "@/hooks/useDashboard";

export function Navbar() {
  const pathname = usePathname();
  const { filteredJobs, companies, runs } = useDashboard();

  const isJobs = pathname === "/" || pathname === "";
  const isCompanies = pathname.startsWith("/companies");
  const isRuns = pathname.startsWith("/runs");
  const isSettings = pathname.startsWith("/settings");

  return (
    <nav className="tabs">
      <Link
        href="/"
        className={`tab-btn ${isJobs ? "active" : ""}`}
      >
        Vacancies ({filteredJobs.length})
      </Link>
      <Link
        href="/companies"
        className={`tab-btn ${isCompanies ? "active" : ""}`}
      >
        Companies ({companies.length})
      </Link>
      <Link
        href="/runs"
        className={`tab-btn ${isRuns ? "active" : ""}`}
      >
        Runs ({runs.length})
      </Link>
      <Link
        href="/settings"
        className={`tab-btn ${isSettings ? "active" : ""}`}
      >
        Settings
      </Link>
    </nav>
  );
}
