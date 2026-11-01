export type LocationClass = "eligible" | "restricted" | "unknown";
export type JobStatus = "new" | "saved" | "applied" | "ignored";
export type AtsType =
  | "greenhouse"
  | "lever"
  | "ashby"
  | "workable"
  | "smartrecruiters"
  | "recruitee"
  | "remotive"
  | "arbeitnow";

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
  companies?: {
    name: string;
    ats: AtsType;
    slug: string;
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
