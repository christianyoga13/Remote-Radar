import { createServiceClient } from "../_shared/db.ts";
import { AtsName, DEFAULT_USER_AGENT } from "../_shared/types.ts";

interface DiscoveredCompany {
  name: string;
  ats: AtsName;
  slug: string;
  careers_url: string;
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
        });
      }
    }
  }

  return Array.from(found.values());
}

/**
 * Weekly slug discovery from Algolia HN "Ask HN: Who is hiring?" comments (ARCHITECTURE.md 3.2).
 * Inserts discovered companies with active = false until verified.
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
  const headers = {
    "Accept": "application/json",
    "User-Agent": Deno.env.get("USER_AGENT") || DEFAULT_USER_AGENT,
  };

  try {
    const searchUrl =
      "https://hn.algolia.com/api/v1/search_by_date?tags=comment&query=ashbyhq.com%20OR%20greenhouse.io%20OR%20lever.co&hitsPerPage=100";
    const res = await fetch(searchUrl, {
      headers,
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      throw new Error(`Algolia HN API returned ${res.status}`);
    }

    const payload = (await res.json()) as {
      hits?: Array<{ comment_text?: string }>;
    };
    const combinedText = (payload.hits || [])
      .map((h) => h.comment_text || "")
      .join("\n");

    const discovered = extractSlugsFromText(combinedText);
    if (discovered.length > 0) {
      await supabase.from("companies").upsert(
        discovered.map((c) => ({
          name: c.name,
          ats: c.ats,
          slug: c.slug,
          careers_url: c.careers_url,
          active: false,
          last_status: "discovered (inactive until verified)",
        })),
        { onConflict: "ats,slug", ignoreDuplicates: true },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, discovered_count: discovered.length }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
