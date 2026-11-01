import { Adapter, fetchJsonWithRetry, Job, looksRemote, truncateDescription } from "../types.ts";

interface GreenhouseJobItem {
  id: number | string;
  title?: string;
  updated_at?: string;
  location?: { name?: string };
  absolute_url?: string;
  departments?: Array<{ name?: string }>;
  content?: string;
}

interface GreenhouseResponse {
  jobs?: GreenhouseJobItem[];
}

export function parseGreenhouseJobs(data: unknown): Job[] {
  const payload = data as GreenhouseResponse | null;
  if (!payload || !Array.isArray(payload.jobs)) return [];

  const jobs: Job[] = [];
  for (const item of payload.jobs) {
    if (!item || item.id == null || !item.title || !item.absolute_url) continue;
    const location = item.location?.name?.trim() || "Unknown";
    const department = item.departments?.[0]?.name?.trim();
    jobs.push({
      externalId: String(item.id),
      title: item.title.trim(),
      location,
      remote: looksRemote(item.title, location),
      department,
      url: item.absolute_url,
      description: truncateDescription(item.content),
      postedAt: item.updated_at,
    });
  }
  return jobs;
}

// Omit ?content=true on routine batches to stay well within the 2-second CPU budget (ARCHITECTURE.md 3.1).
export const greenhouseAdapter: Adapter = {
  name: "greenhouse",
  async fetchJobs(slug: string, signal: AbortSignal): Promise<Job[]> {
    const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs`;
    const data = await fetchJsonWithRetry<GreenhouseResponse>(url, signal);
    return parseGreenhouseJobs(data);
  },
};
