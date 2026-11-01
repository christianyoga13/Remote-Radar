import { Adapter, fetchJsonWithRetry, Job, looksRemote, truncateDescription } from "../types.ts";

interface AshbyJobPosting {
  id?: string;
  title?: string;
  department?: string;
  location?: string;
  isRemote?: boolean;
  publishedAt?: string;
  jobUrl?: string;
  descriptionPlain?: string;
}

interface AshbyResponse {
  jobs?: AshbyJobPosting[];
}

export function parseAshbyJobs(data: unknown): Job[] {
  const payload = data as AshbyResponse | null;
  if (!payload || !Array.isArray(payload.jobs)) return [];

  const jobs: Job[] = [];
  for (const item of payload.jobs) {
    if (!item || !item.id || !item.title || !item.jobUrl) continue;
    const location = item.location?.trim() || "Unknown";
    jobs.push({
      externalId: String(item.id),
      title: item.title.trim(),
      location,
      remote: looksRemote(item.title, location, item.isRemote === true),
      department: item.department?.trim(),
      url: item.jobUrl,
      description: truncateDescription(item.descriptionPlain),
      postedAt: item.publishedAt,
    });
  }
  return jobs;
}

export const ashbyAdapter: Adapter = {
  name: "ashby",
  async fetchJobs(slug: string, signal: AbortSignal): Promise<Job[]> {
    const url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(slug)}`;
    const data = await fetchJsonWithRetry<AshbyResponse>(url, signal);
    return parseAshbyJobs(data);
  },
};
