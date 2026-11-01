"use client";

import React from "react";
import { DashboardProvider } from "@/context/DashboardContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return <DashboardProvider>{children}</DashboardProvider>;
}
