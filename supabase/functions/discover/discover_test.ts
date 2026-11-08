import { assertEquals } from "@std/assert";
import {
  extractSlugsFromText,
  parseRemoteInTechCompany,
  resolveAtsFromHtml,
  resolveAtsFromUrl,
  resolveAtsWithFallback,
} from "./index.ts";

Deno.test("parseRemoteInTechCompany parses markdown YAML frontmatter", () => {
  const md = `---
title: "Automattic"
slug: automattic
website: https://automattic.com
careers_url: https://automattic.com/work-with-us/
region: worldwide
remote_policy: fully-remote
company_size: large
---
Some markdown content
`;

  const parsed = parseRemoteInTechCompany(md);
  assertEquals(parsed?.title, "Automattic");
  assertEquals(parsed?.slug, "automattic");
  assertEquals(parsed?.careers_url, "https://automattic.com/work-with-us/");
  assertEquals(parsed?.region, "worldwide");
  assertEquals(parsed?.remote_policy, "fully-remote");
});

Deno.test("resolveAtsFromUrl detects direct ATS URLs correctly", () => {
  assertEquals(resolveAtsFromUrl("https://boards.greenhouse.io/gitlab"), {
    ats: "greenhouse",
    slug: "gitlab",
  });
  assertEquals(resolveAtsFromUrl("https://jobs.lever.co/kinsta"), {
    ats: "lever",
    slug: "kinsta",
  });
  assertEquals(resolveAtsFromUrl("https://jobs.ashbyhq.com/plentific"), {
    ats: "ashby",
    slug: "plentific",
  });
  assertEquals(resolveAtsFromUrl("https://example.com/careers"), null);
});

Deno.test("resolveAtsFromHtml inspects embed script/links from custom career pages", () => {
  const greenhouseHtml = `
    <html>
      <head>
        <script src="https://boards.greenhouse.io/embed/job_board/js?for=automattic"></script>
      </head>
    </html>
  `;
  assertEquals(resolveAtsFromHtml(greenhouseHtml), {
    ats: "greenhouse",
    slug: "automattic",
  });

  const ashbyHtml = `
    <div>
      <a href="https://jobs.ashbyhq.com/synthesia">Apply here</a>
    </div>
  `;
  assertEquals(resolveAtsFromHtml(ashbyHtml), {
    ats: "ashby",
    slug: "synthesia",
  });
});

Deno.test("resolveAtsWithFallback combines direct and HTML resolution", async () => {
  // Direct match does not call fetchFn
  const direct = await resolveAtsWithFallback("https://jobs.lever.co/sourcegraph", async () => {
    throw new Error("Should not be called");
  });
  assertEquals(direct?.ats, "lever");
  assertEquals(direct?.slug, "sourcegraph");

  // Fallback match calls fetchFn
  const fallback = await resolveAtsWithFallback("https://example.com/jobs", async () => {
    return `<script src="https://boards.greenhouse.io/embed/job_board/js?for=customco"></script>`;
  });
  assertEquals(fallback?.ats, "greenhouse");
  assertEquals(fallback?.slug, "customco");
});

Deno.test("extractSlugsFromText extracts ATS links from freeform text", () => {
  const text = `
    We are hiring! Check out:
    https://boards.greenhouse.io/acmecorp/jobs/123
    and https://jobs.ashbyhq.com/coolstartup
  `;
  const discovered = extractSlugsFromText(text);
  assertEquals(discovered.length, 2);
  assertEquals(discovered[0].slug, "acmecorp");
  assertEquals(discovered[1].slug, "coolstartup");
});
