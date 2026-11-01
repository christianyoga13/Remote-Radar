import { Adapter, DEFAULT_USER_AGENT, Job, looksRemote, MAX_RESPONSE_BYTES, truncateDescription } from "../types.ts";

/**
 * Adapter for scraping and parsing vacancies directly from custom corporate /careers pages.
 * Supports:
 * 1. Schema.org JSON-LD (application/ld+json) JobPosting objects (widely used by corporate sites).
 * 2. Embedded SSR State (__NEXT_DATA__ or React/Nuxt state payloads).
 * 3. Heuristic HTML anchor & job card extraction.
 */
export const customHtmlAdapter: Adapter = {
  name: "custom_html",
  async fetchJobs(slugOrUrl: string, signal: AbortSignal): Promise<Job[]> {
    const targetUrl = slugOrUrl.startsWith("http://") || slugOrUrl.startsWith("https://")
      ? slugOrUrl
      : `https://${slugOrUrl}`;

    const headers = {
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7",
      "User-Agent": Deno.env.get("USER_AGENT") || DEFAULT_USER_AGENT,
    };

    const res = await fetch(targetUrl, { headers, signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} from ${targetUrl}`);
    }

    const html = await res.text();
    if (html.length > MAX_RESPONSE_BYTES) {
      throw new Error(`Response exceeded ${MAX_RESPONSE_BYTES} chars from ${targetUrl}`);
    }

    const jobs: Job[] = [];
    const seenIds = new Set<string>();

    // Strategy 1: Check Schema.org JSON-LD (application/ld+json)
    const jsonLdMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    for (const match of jsonLdMatches) {
      try {
        const parsed = JSON.parse(match[1]);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of items) {
          if (item?.["@type"] === "JobPosting") {
            const externalId = String(item.identifier?.value || item.identifier || item.url || item.title);
            if (!seenIds.has(externalId)) {
              seenIds.add(externalId);
              const title = String(item.title || "Untitled Role");
              const loc = typeof item.jobLocation === "string"
                ? item.jobLocation
                : item.jobLocation?.address?.addressLocality ||
                  item.jobLocation?.address?.addressCountry ||
                  (item.applicantLocationRequirements ? "Remote" : "Flexible");

              const url = item.url ? new URL(item.url, targetUrl).href : targetUrl;
              const isRemote = Boolean(
                item.jobLocationType === "TELECOMMUTE" ||
                item.applicantLocationRequirements ||
                looksRemote(title, loc)
              );

              jobs.push({
                externalId,
                title,
                location: loc,
                remote: isRemote,
                url,
                description: truncateDescription(item.description),
                postedAt: item.datePosted ? new Date(item.datePosted).toISOString() : undefined,
              });
            }
          }
        }
      } catch {
        // Continue to next match
      }
    }

    if (jobs.length > 0) {
      return jobs;
    }

    // Strategy 2: Check Next.js / Nuxt embedded state (__NEXT_DATA__)
    const nextDataMatch = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
    if (nextDataMatch) {
      try {
        const nextData = JSON.parse(nextDataMatch[1]);
        const candidateLists = findJobArraysInObject(nextData);
        for (const list of candidateLists) {
          for (const item of list) {
            const title = item.title || item.name || item.jobTitle || item.position;
            if (title && typeof title === "string" && title.length < 120) {
              const id = String(item.id || item.slug || item.jobId || title);
              if (!seenIds.has(id)) {
                seenIds.add(id);
                const loc = String(item.location || item.city || item.country || "Remote");
                const url = item.url || item.applyUrl || item.link || targetUrl;
                jobs.push({
                  externalId: id,
                  title: title.trim(),
                  location: loc,
                  remote: looksRemote(title, loc, item.isRemote || item.remote),
                  url: new URL(url, targetUrl).href,
                  description: truncateDescription(item.description || item.summary),
                  postedAt: item.postedAt || item.createdAt || undefined,
                });
              }
            }
          }
        }
      } catch {
        // Fallback to HTML link heuristics
      }
    }

    if (jobs.length > 0) {
      return jobs;
    }

    // Strategy 3: Heuristic HTML Link Extraction (matches links like /job/, /career/, /position/, /vacancy/)
    const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    for (const match of html.matchAll(linkRegex)) {
      const href = match[1];
      const rawInner = match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

      // Check if href indicates a job post and has reasonable title text length
      const isJobLink = /\/(job|careers?|positions?|vacanc(y|ies)|openings?)\/[a-z0-9_-]+/i.test(href) ||
        /\b(jobId|positionId)=[0-9]+/i.test(href);

      if (isJobLink && rawInner.length > 4 && rawInner.length < 100) {
        // Avoid utility navigation links like "View all jobs", "Careers", etc.
        const lower = rawInner.toLowerCase();
        if (
          lower === "apply now" ||
          lower === "view details" ||
          lower.includes("all jobs") ||
          lower.includes("privacy policy")
        ) {
          continue;
        }

        const fullUrl = new URL(href, targetUrl).href;
        if (!seenIds.has(fullUrl)) {
          seenIds.add(fullUrl);
          jobs.push({
            externalId: fullUrl,
            title: rawInner,
            location: "Career Page",
            remote: looksRemote(rawInner, "Career Page"),
            url: fullUrl,
            description: undefined,
          });
        }
      }
    }

    return jobs;
  },
};

/**
 * Recursively scans an object for arrays of job-like objects
 */
function findJobArraysInObject(obj: unknown, depth = 0): Record<string, unknown>[][] {
  if (depth > 5 || !obj || typeof obj !== "object") return [];

  const results: Record<string, unknown>[][] = [];

  if (Array.isArray(obj)) {
    if (obj.length > 0 && obj.every((item) => item && typeof item === "object" && ("title" in item || "jobTitle" in item || "position" in item))) {
      results.push(obj as Record<string, unknown>[]);
    }
    for (const item of obj) {
      results.push(...findJobArraysInObject(item, depth + 1));
    }
  } else {
    for (const val of Object.values(obj)) {
      results.push(...findJobArraysInObject(val, depth + 1));
    }
  }

  return results;
}
