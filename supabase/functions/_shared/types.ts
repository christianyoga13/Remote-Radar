export type AtsName = "greenhouse" | "lever" | "ashby";

export type LocationClass = "eligible" | "restricted" | "unknown";

export interface Job {
  externalId: string;
  title: string;
  location: string;
  remote: boolean;
  department?: string;
  url: string;
  description?: string;
  postedAt?: string;
}

export interface Adapter {
  name: AtsName;
  fetchJobs(slug: string, signal: AbortSignal): Promise<Job[]>;
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

export interface AppSettings {
  profile: ProfileSettings;
  locationRules: LocationRulesSettings;
}

export interface CompanyRow {
  id: number;
  name: string;
  ats: AtsName;
  slug: string;
  careers_url: string | null;
  active: boolean;
  fail_count: number;
  last_status: string | null;
  last_fetched_at: string | null;
}

export const MAX_DESCRIPTION_CHARS = 4000;
export const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
export const DEFAULT_USER_AGENT = "RemoteRadar/0.1 (+https://github.com/christian/remote-radar)";

export function truncateDescription(text?: string | null): string | undefined {
  if (!text) return undefined;
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  return trimmed.length > MAX_DESCRIPTION_CHARS
    ? trimmed.slice(0, MAX_DESCRIPTION_CHARS)
    : trimmed;
}

export function looksRemote(title: string, location: string, explicitRemote?: boolean): boolean {
  if (explicitRemote === true) return true;
  const hay = `${title} ${location}`.toLowerCase();
  return (
    hay.includes("remote") ||
    hay.includes("anywhere") ||
    hay.includes("worldwide") ||
    hay.includes("distributed") ||
    hay.includes("work from home")
  );
}

/**
 * Fetches JSON with User-Agent, AbortSignal, single retry on 429/5xx respecting Retry-After,
 * and response size cap so a huge payload never exhausts the 2s Edge Function CPU limit.
 */
export async function fetchJsonWithRetry<T>(url: string, signal: AbortSignal): Promise<T> {
  const headers = {
    "Accept": "application/json",
    "User-Agent": Deno.env.get("USER_AGENT") || DEFAULT_USER_AGENT,
  };

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url, { headers, signal });
    if ((res.status === 429 || res.status >= 500) && attempt === 0) {
      const retryAfterSec = Number(res.headers.get("retry-after") || "1");
      const delayMs = Math.min(Math.max(retryAfterSec, 1) * 1000, 3000);
      await new Promise((r) => setTimeout(r, delayMs));
      continue;
    }
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} from ${url}`);
    }
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("json")) {
      throw new Error(`Unexpected content-type '${contentType}' from ${url}`);
    }
    const text = await res.text();
    if (text.length > MAX_RESPONSE_BYTES) {
      throw new Error(`Response exceeded ${MAX_RESPONSE_BYTES} chars from ${url}`);
    }
    return JSON.parse(text) as T;
  }

  throw new Error(`Exhausted retries for ${url}`);
}
