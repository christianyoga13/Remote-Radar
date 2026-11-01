"use client";

import React from "react";
import Link from "next/link";
import { Navbar } from "./Navbar";

export function Header() {
  return (
    <header className="topbar">
      <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
        <div className="brand">
          <div className="brand-dot" />
          <div>
            <h1>Remote Radar</h1>
            <span>
              Direct ATS Vacancy Monitor · Indonesia / APAC Eligible Filter
            </span>
          </div>
        </div>
      </Link>
      <Navbar />
    </header>
  );
}
