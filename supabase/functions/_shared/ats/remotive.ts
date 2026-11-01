import { Adapter, fetchJsonWithRetry, Job, truncateDescription } from "../types.ts";

interface RemotiveJob {
  id: number;
  url: string;
  title: string;
  company_name: string;
  candidate_required_location?: string;
  description?: string;
  publication_date?: string;
}

interface RemotiveResponse {
  jobs?: RemotiveJob[];
}

export const remotiveAdapter: Adapter = {
  name: "remotive",
  async fetchJobs(slug: string, signal: AbortSignal): Promise<Job[]> {
    const category = slug && slug !== "all" && slug !== "remote" ? slug : "software-dev";
    const url = `https://remotive.com/api/remote-jobs?category=${category}&limit=100`;
    const data = await fetchJsonWithRetry<RemotiveResponse>(url, signal);

    return (data.jobs || []).map((j) => ({
      externalId: String(j.id),
      title: j.title || "Untitled Role",
      location: j.candidate_required_location || "Worldwide (Remote)",
      remote: true,
      department: "Software Development",
      url: j.url,
      description: truncateDescription(j.description),
      postedAt: j.publication_date || null,
    }));
  },
};
