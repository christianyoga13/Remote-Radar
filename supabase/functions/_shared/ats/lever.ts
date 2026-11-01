import { Adapter, fetchJsonWithRetry, Job, looksRemote, truncateDescription } from "../types.ts";

interface LeverPosting {
  id?: string;
  text?: string;
  createdAt?: number;
  hostedUrl?: string;
  workplaceType?: string;
  categories?: {
    location?: string;
    team?: string;
    department?: string;
  };
  descriptionPlain?: string;
}

export function parseLeverJobs(data: unknown): Job[] {
  if (!Array.isArray(data)) return [];

  const jobs: Job[] = [];
  for (const raw of data as LeverPosting[]) {
    if (!raw || !raw.id || !raw.text || !raw.hostedUrl) continue;
    const location = raw.categories?.location?.trim() || "Unknown";
    const explicitRemote = raw.workplaceType?.toLowerCase() === "remote";
    const isOnsiteOnly = raw.workplaceType?.toLowerCase() === "onsite" &&
      !looksRemote(raw.text, location);

    jobs.push({
      externalId: String(raw.id),
      title: raw.text.trim(),
      location,
      remote: isOnsiteOnly ? false : looksRemote(raw.text, location, explicitRemote),
      department: raw.categories?.team || raw.categories?.department,
      url: raw.hostedUrl,
      description: truncateDescription(raw.descriptionPlain),
      postedAt: typeof raw.createdAt === "number"
        ? new Date(raw.createdAt).toISOString()
        : undefined,
    });
  }
  return jobs;
}

export const leverAdapter: Adapter = {
  name: "lever",
  async fetchJobs(slug: string, signal: AbortSignal): Promise<Job[]> {
    const url = `https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`;
    const data = await fetchJsonWithRetry<LeverPosting[]>(url, signal);
    return parseLeverJobs(data);
  },
};
