import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers/Providers";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { TopHeader } from "@/components/layout/TopHeader";
import { AuthBanner } from "@/components/auth/AuthBanner";

export const metadata: Metadata = {
  title: "Remote Radar — Obsidian Telemetry",
  description:
    "High-density remote developer vacancy monitor and telemetry engine powered by Supabase.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>
          <div className="app-shell">
            <AppSidebar />
            <div className="app-main">
              <TopHeader />
              <div className="viewport-content">
                <AuthBanner />
                <main>{children}</main>
              </div>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
