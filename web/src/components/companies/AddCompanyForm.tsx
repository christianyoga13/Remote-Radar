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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;
    await handleAddCompany(name, ats, slug, careersUrl);
    setName("");
    setSlug("");
    setCareersUrl("");
  }

  return (
    <form onSubmit={onSubmit} className="filters-bar">
      <input
        type="text"
        placeholder="Company name (e.g. Linear)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <select
        value={ats}
        onChange={(e) => setAts(e.target.value as AtsType)}
      >
        <option value="ashby">Ashby</option>
        <option value="greenhouse">Greenhouse</option>
        <option value="lever">Lever</option>
        <option value="remotive">Remotive (Public Feed)</option>
        <option value="arbeitnow">Arbeitnow (Public Feed)</option>
      </select>
      <input
        type="text"
        placeholder="ATS slug (e.g. linear)"
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        required
      />
      <input
        type="url"
        placeholder="Careers URL (optional)"
        value={careersUrl}
        onChange={(e) => setCareersUrl(e.target.value)}
        style={{ flex: 1 }}
      />
      <button type="submit" className="btn btn-primary">
        + Add Company
      </button>
    </form>
  );
}
