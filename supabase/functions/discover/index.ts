import { createServiceClient } from "../_shared/db.ts";
import { AtsName, DEFAULT_USER_AGENT } from "../_shared/types.ts";

export interface DiscoveredCompany {
  name: string;
  ats: AtsName;
  slug: string;
  careers_url: string;
  region?: string | null;
  remote_policy?: string | null;
  source: string;
}

export interface RemoteInTechCompany {
  title: string;
  slug: string;
  website?: string;
  careers_url?: string;
  region?: string;
  remote_policy?: string;
}

const ATS_PATTERNS: Array<{
  ats: AtsName;
  regex: RegExp;
  buildUrl: (slug: string) => string;
}> = [
  {
    ats: "greenhouse",
    regex: /https?:\/\/(?:boards|job-boards)\.greenhouse\.io\/([a-zA-Z0-9_-]+)/g,
    buildUrl: (slug) => `https://boards.greenhouse.io/${slug}`,
  },
  {
    ats: "lever",
    regex: /https?:\/\/jobs\.lever\.co\/([a-zA-Z0-9_-]+)/g,
    buildUrl: (slug) => `https://jobs.lever.co/${slug}`,
  },
  {
    ats: "ashby",
    regex: /https?:\/\/jobs\.ashbyhq\.com\/([a-zA-Z0-9._-]+)/g,
    buildUrl: (slug) => `https://jobs.ashbyhq.com/${slug}`,
  },
];

export function extractSlugsFromText(text: string): DiscoveredCompany[] {
  const found = new Map<string, DiscoveredCompany>();

  for (const { ats, regex, buildUrl } of ATS_PATTERNS) {
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const slug = match[1].toLowerCase().replace(/\/$/, "");
      if (!slug || slug === "embed" || slug === "api") continue;
      const key = `${ats}:${slug}`;
      if (!found.has(key)) {
        const prettyName = slug
          .split(/[-_]/)
          .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
          .join(" ");
        found.set(key, {
          name: prettyName || slug,
          ats,
          slug,
          careers_url: buildUrl(slug),
          source: "hn",
        });
      }
    }
  }

  return Array.from(found.values());
}

/**
 * Parses company markdown frontmatter from remoteintech/remote-jobs.
 */
export function parseRemoteInTechCompany(markdown: string): RemoteInTechCompany | null {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const yamlBlock = match[1];

  const getValue = (key: string): string | undefined => {
    const lineMatch = yamlBlock.match(new RegExp(`^${key}:\\s*["']?([^"'\\r\\n]+)["']?`, "m"));
    return lineMatch ? lineMatch[1].trim() : undefined;
  };

  const title = getValue("title");
  const slug = getValue("slug");
  if (!title || !slug) return null;

  return {
    title,
    slug,
    website: getValue("website"),
    careers_url: getValue("careers_url"),
    region: getValue("region")?.toLowerCase(),
    remote_policy: getValue("remote_policy")?.toLowerCase(),
  };
}

/**
 * Direct ATS URL extraction from careers_url
 */
export function resolveAtsFromUrl(url: string): { ats: AtsName; slug: string } | null {
  if (!url) return null;

  const gh = url.match(/https?:\/\/(?:boards|job-boards)\.greenhouse\.io\/([a-zA-Z0-9_-]+)/i);
  if (gh && gh[1] && gh[1].toLowerCase() !== "embed" && gh[1].toLowerCase() !== "api") {
    return { ats: "greenhouse", slug: gh[1].toLowerCase() };
  }

  const lever = url.match(/https?:\/\/jobs\.lever\.co\/([a-zA-Z0-9_-]+)/i);
  if (lever && lever[1]) {
    return { ats: "lever", slug: lever[1].toLowerCase() };
  }

  const ashby = url.match(/https?:\/\/jobs\.ashbyhq\.com\/([a-zA-Z0-9._-]+)/i);
  if (ashby && ashby[1]) {
    return { ats: "ashby", slug: ashby[1].toLowerCase() };
  }

  return null;
}

/**
 * Fallback ATS inspection from HTML content (inspecting embed/script tags)
 */
export function resolveAtsFromHtml(html: string): { ats: AtsName; slug: string } | null {
  const gh = html.match(/(?:boards|job-boards)\.greenhouse\.io\/(?:embed\/job_board\/js\?for=|)([a-zA-Z0-9_-]+)/i);
  if (gh && gh[1] && gh[1].toLowerCase() !== "embed" && gh[1].toLowerCase() !== "api") {
    return { ats: "greenhouse", slug: gh[1].toLowerCase() };
  }

  const lever = html.match(/jobs\.lever\.co\/([a-zA-Z0-9_-]+)/i);
  if (lever && lever[1]) {
    return { ats: "lever", slug: lever[1].toLowerCase() };
  }

  const ashby = html.match(/(?:jobs\.ashbyhq\.com|api\.ashbyhq\.com\/posting-api\/job-board)\/([a-zA-Z0-9._-]+)/i);
  if (ashby && ashby[1]) {
    return { ats: "ashby", slug: ashby[1].toLowerCase() };
  }

  return null;
}

async function defaultFetchHtml(url: string, signal: AbortSignal): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": Deno.env.get("USER_AGENT") || DEFAULT_USER_AGENT },
    signal,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  // Cut down HTML text to avoid Edge Function CPU memory blowups
  return text.slice(0, 50_000);
}

/**
 * Multi-tier ATS resolver: direct URL regex first, then 1x HTML inspection if custom domain.
 */
export async function resolveAtsWithFallback(
  careersUrl: string,
  fetchFn: (url: string, signal: AbortSignal) => Promise<string> = defaultFetchHtml,
): Promise<{ ats: AtsName; slug: string; careers_url: string } | null> {
  const direct = resolveAtsFromUrl(careersUrl);
  if (direct) {
    return { ...direct, careers_url: careersUrl };
  }

  try {
    const html = await fetchFn(careersUrl, AbortSignal.timeout(5_000));
    const detected = resolveAtsFromHtml(html);
    if (detected) {
      return { ...detected, careers_url: careersUrl };
    }
  } catch {
    // Ignore fetch error, keep moving
  }

  return null;
}

/**
 * Edge Function discover:
 * 1. Algolia HN "Ask HN: Who is hiring?" comments.
 * 2. remoteintech/remote-jobs GitHub repository (worldwide/APAC remote-first companies).
 */
Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const expectedSecret = Deno.env.get("CRON_SECRET");
  const providedSecret = req.headers.get("x-cron-secret");
  if (!expectedSecret || providedSecret !== expectedSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createServiceClient();
  const body = await req.json().catch(() => ({}));
  const sourceMode: "all" | "hn" | "remoteintech" = body.source || "all";

  const discoveredCompanies: DiscoveredCompany[] = [];
  const errors: string[] = [];

  // 1. Discovery from remoteintech/remote-jobs GitHub repo
  if (sourceMode === "all" || sourceMode === "remoteintech") {
    try {
      const githubUrl = "https://api.github.com/repos/remoteintech/remote-jobs/contents/src/companies";
      const ghHeaders = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": Deno.env.get("USER_AGENT") || DEFAULT_USER_AGENT,
      };

      const res = await fetch(githubUrl, {
        headers: ghHeaders,
        signal: AbortSignal.timeout(10_000),
      });

      if (res.ok) {
        const files = (await res.json()) as Array<{ name: string; download_url: string }>;
        // Sample/batch up to 25 files per run to stay well within CPU & rate limit boundaries
        const sampleFiles = files.filter((f) => f.name.endsWith(".md")).slice(0, 25);

        for (const file of sampleFiles) {
          try {
            const rawRes = await fetch(file.download_url, {
              headers: ghHeaders,
              signal: AbortSignal.timeout(5_000),
            });
            if (!rawRes.ok) continue;
            const content = await rawRes.text();
            const comp = parseRemoteInTechCompany(content);
            if (!comp || !comp.careers_url) continue;

            // Strict filter agreed during /grill-me
            const isEligibleRegion = comp.region === "worldwide" || comp.region === "asia-pacific";
            const isEligiblePolicy = comp.remote_policy === "fully-remote" || comp.remote_policy === "remote-first";
            if (!isEligibleRegion || !isEligiblePolicy) continue;

            const resolved = await resolveAtsWithFallback(comp.careers_url);
            if (resolved) {
              discoveredCompanies.push({
                name: comp.title,
                ats: resolved.ats,
                slug: resolved.slug,
                careers_url: comp.careers_url,
                region: comp.region,
                remote_policy: comp.remote_policy,
                source: "remoteintech",
              });
            }
          } catch (fileErr) {
            errors.push(`file ${file.name}: ${fileErr instanceof Error ? fileErr.message : String(fileErr)}`);
          }
        }
      } else {
        errors.push(`remoteintech GitHub API returned ${res.status}`);
      }
    } catch (remoteErr) {
      errors.push(`remoteintech error: ${remoteErr instanceof Error ? remoteErr.message : String(remoteErr)}`);
    }
  }

  // 2. Discovery from HN "Who is hiring"
  if (sourceMode === "all" || sourceMode === "hn") {
    try {
      const searchUrl =
        "https://hn.algolia.com/api/v1/search_by_date?tags=comment&query=ashbyhq.com%20OR%20greenhouse.io%20OR%20lever.co&hitsPerPage=60";
      const res = await fetch(searchUrl, {
        headers: { "User-Agent": Deno.env.get("USER_AGENT") || DEFAULT_USER_AGENT },
        signal: AbortSignal.timeout(10_000),
      });

      if (res.ok) {
        const payload = (await res.json()) as { hits?: Array<{ comment_text?: string }> };
        const combinedText = (payload.hits || []).map((h) => h.comment_text || "").join("\n");
        const hnDiscovered = extractSlugsFromText(combinedText);
        discoveredCompanies.push(...hnDiscovered);
      } else {
        errors.push(`Algolia HN API returned ${res.status}`);
      }
    } catch (hnErr) {
      errors.push(`hn error: ${hnErr instanceof Error ? hnErr.message : String(hnErr)}`);
    }
  }

  // Save discovered companies to DB (active = false until verified by collect)
  if (discoveredCompanies.length > 0) {
    await supabase.from("companies").upsert(
      discoveredCompanies.map((c) => ({
        name: c.name,
        ats: c.ats,
        slug: c.slug,
        careers_url: c.careers_url,
        region: c.region ?? null,
        remote_policy: c.remote_policy ?? null,
        source: c.source,
        active: false,
        last_status: `discovered via ${c.source} (inactive until verified)`,
      })),
      { onConflict: "ats,slug", ignoreDuplicates: true },
    );
  }

  return new Response(
    JSON.stringify({
      ok: true,
      discovered_count: discoveredCompanies.length,
      companies: discoveredCompanies,
      errors: errors.length > 0 ? errors : undefined,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
