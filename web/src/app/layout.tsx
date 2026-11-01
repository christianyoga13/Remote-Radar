import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers/Providers";
import { Header } from "@/components/layout/Header";
import { AuthBanner } from "@/components/auth/AuthBanner";

export const metadata: Metadata = {
  title: "Remote Radar — Direct ATS Vacancy Monitor",
  description:
    "Personal remote job vacancy monitor powered by Supabase Edge Functions & pg_cron.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="container">
            <Header />
            <AuthBanner />
            <main>{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
