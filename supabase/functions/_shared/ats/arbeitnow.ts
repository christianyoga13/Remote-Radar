import { Adapter, fetchJsonWithRetry, Job, looksRemote, truncateDescription } from "../types.ts";

interface ArbeitnowJob {
  slug: string;
  title: string;
  company_name: string;
  location?: string;
  remote?: boolean;
  url: string;
  description?: string;
  created_at?: number;
}

interface ArbeitnowResponse {
  data?: ArbeitnowJob[];
}

export const arbeitnowAdapter: Adapter = {
  name: "arbeitnow",
  async fetchJobs(_slug: string, signal: AbortSignal): Promise<Job[]> {
    const url = "https://www.arbeitnow.com/api/job-board-api";
    const data = await fetchJsonWithRetry<ArbeitnowResponse>(url, signal);

    return (data.data || [])
      .filter((j) => j.remote || looksRemote(j.location || "") || looksRemote(j.title || ""))
      .map((j) => ({
        externalId: j.slug,
        title: j.title || "Untitled Role",
        location: j.location || "Remote",
        remote: true,
        department: null,
        url: j.url,
        description: truncateDescription(j.description),
        postedAt: j.created_at ? new Date(j.created_at * 1000).toISOString() : null,
      }));
  },
};
