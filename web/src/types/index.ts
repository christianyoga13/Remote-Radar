export type LocationClass = "eligible" | "restricted" | "unknown";
export type JobStatus = "new" | "saved" | "applied" | "ignored";
export type SeniorityLevel = "all" | "junior" | "mid" | "senior" | "lead";
export type SortOption =
  | "score_desc"
  | "published_desc"
  | "published_asc"
  | "score_asc";

export function detectJobLevel(
  title: string,
  description?: string | null
): "junior" | "mid" | "senior" | "lead" {
  const t = title.toLowerCase();

  // 1. High-confidence keywords in title
  if (/\b(lead|principal|staff|director|head|architect|vp|chief)\b/i.test(t)) {
    return "lead";
  }
  if (/\b(senior|sr\.?|sr)\b/i.test(t)) {
    return "senior";
  }
  if (/\b(junior|jr\.?|jr|entry[- ]?level|intern|internship|associate|graduate|trainee)\b/i.test(t)) {
    return "junior";
  }

  // 2. Check early description if title has no explicit level prefix
  if (description) {
    const d = description.slice(0, 1000).toLowerCase();
    if (/\b(junior|entry[- ]?level|internship|trainee)\b/i.test(d)) {
      return "junior";
    }
    if (/\b(staff engineer|principal engineer|team lead|lead engineer|tech lead)\b/i.test(d)) {
      return "lead";
    }
    if (/\b(senior engineer|senior developer|senior software|senior frontend|senior backend)\b/i.test(d)) {
      return "senior";
    }
  }

  // 3. Standard / Mid-level role
  return "mid";
}
export type AtsType =
  | "greenhouse"
  | "lever"
  | "ashby"
  | "workable"
  | "smartrecruiters"
  | "recruitee"
  | "remotive"
  | "arbeitnow"
  | "custom_html";

export interface Company {
  id: number;
  name: string;
  ats: AtsType;
  slug: string;
  careers_url: string | null;
  active: boolean;
  fail_count: number;
  last_status: string | null;
  last_fetched_at: string | null;
  region?: string | null;
  remote_policy?: string | null;
  source?: string | null;
}

export interface JobRow {
  id: number;
  company_id: number;
  external_id: string;
  title: string;
  location_raw: string | null;
  location_class: LocationClass;
  is_remote: boolean;
  department: string | null;
  url: string;
  description: string | null;
  posted_at: string | null;
  first_seen_at: string;
  last_seen_at: string;
  closed_at: string | null;
  match_score: number | null;
  notified_at: string | null;
  status: JobStatus;
  timezone_note?: string | null;
  is_async?: boolean;
  companies?: {
    name: string;
    ats: AtsType;
    slug: string;
    region?: string | null;
    remote_policy?: string | null;
  };
}

export interface RunRow {
  id: number;
  started_at: string;
  finished_at: string | null;
  companies_ok: number;
  companies_failed: number;
  jobs_new: number;
  jobs_closed: number;
  notes: string | null;
}

export interface ProfileSettings {
  roles: string[];
  stack: string[];
  levels: string[];
  blacklist: string[];
  min_score: number;
  max_fail_count: number;
}

export interface LocationRulesSettings {
  eligible: string[];
  restricted: string[];
}
