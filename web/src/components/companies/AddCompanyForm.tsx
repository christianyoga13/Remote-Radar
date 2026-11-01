"use client";

import React, { useState } from "react";
import { AtsType } from "@/types";
import { useDashboard } from "@/hooks/useDashboard";

export function AddCompanyForm() {
  const { handleAddCompany } = useDashboard();
  const [name, setName] = useState("");
  const [ats, setAts] = useState<AtsType>("ashby");
  const [slug, setSlug] = useState("");
  const [careersUrl, setCareersUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    setIsSubmitting(true);
    setFeedback(null);

    const savedName = name.trim();
    const result = await handleAddCompany(savedName, ats, slug, careersUrl);
    setIsSubmitting(false);

    if (result.ok) {
      setName("");
      setSlug("");
      setCareersUrl("");
      setFeedback({
        type: "success",
        message: `✅ Perusahaan "${savedName}" berhasil disimpan ke Supabase! Anda bisa langsung klik tombol "⚡ Fetch Now" di tabel bawah untuk mengambil lowongan terbarunya.`,
      });
    } else {
      setFeedback({
        type: "error",
        message: `❌ Gagal menyimpan perusahaan: ${result.message || "Terjadi kesalahan"}`,
      });
    }
  }

  return (
    <div style={{ marginBottom: 16 }}>
      {feedback && (
        <div
          style={{
            padding: "10px 14px",
            marginBottom: 12,
            borderRadius: 6,
            fontSize: 13,
            lineHeight: 1.5,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background:
              feedback.type === "success"
                ? "rgba(34, 197, 94, 0.12)"
                : "rgba(239, 68, 68, 0.12)",
            border: `1px solid ${
              feedback.type === "success"
                ? "rgba(34, 197, 94, 0.3)"
                : "rgba(239, 68, 68, 0.3)"
            }`,
            color:
              feedback.type === "success"
                ? "var(--accent)"
                : "var(--danger, #f87171)",
          }}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            style={{
              background: "none",
              border: "none",
              color: "inherit",
              cursor: "pointer",
              fontSize: 14,
              marginLeft: 12,
            }}
          >
            ✕
          </button>
        </div>
      )}

      <form onSubmit={onSubmit} className="filters-bar">
        <input
          type="text"
          placeholder="Company name (e.g. Linear)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={isSubmitting}
        />
        <select
          value={ats}
          onChange={(e) => setAts(e.target.value as AtsType)}
          disabled={isSubmitting}
        >
          <option value="ashby">Ashby</option>
          <option value="greenhouse">Greenhouse</option>
          <option value="lever">Lever</option>
          <option value="remotive">Remotive (Public Feed)</option>
          <option value="arbeitnow">Arbeitnow (Public Feed)</option>
          <option value="custom_html">Direct Career Page (HTML/SPA)</option>
        </select>
        <input
          type="text"
          placeholder={
            ats === "custom_html"
              ? "Career URL (e.g. https://careers.company.com)"
              : "ATS slug (e.g. linear)"
          }
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          required
          disabled={isSubmitting}
          style={{ flex: ats === "custom_html" ? 1 : undefined }}
        />
        <input
          type="url"
          placeholder="Careers URL (optional)"
          value={careersUrl}
          onChange={(e) => setCareersUrl(e.target.value)}
          disabled={isSubmitting}
          style={{ flex: 1 }}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting}
          style={{ minWidth: 120 }}
        >
          {isSubmitting ? "Menyimpan..." : "+ Add Company"}
        </button>
      </form>
    </div>
  );
}

