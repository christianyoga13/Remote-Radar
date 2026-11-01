import { assertEquals } from "@std/assert";
import { parseGreenhouseJobs } from "./greenhouse.ts";
import { parseLeverJobs } from "./lever.ts";
import { parseAshbyJobs } from "./ashby.ts";

Deno.test("greenhouse adapter parses fixture and handles empty response", async () => {
  const raw = await Deno.readTextFile(
    new URL("../../../../testdata/greenhouse_example.json", import.meta.url),
  );
  const jobs = parseGreenhouseJobs(JSON.parse(raw));
  assertEquals(jobs.length, 2);
  assertEquals(jobs[0].externalId, "4019283");
  assertEquals(jobs[0].title, "Senior Fullstack Engineer (React / Go)");
  assertEquals(jobs[0].location, "Remote - Worldwide (APAC / EMEA)");
  assertEquals(jobs[0].remote, true);
  assertEquals(jobs[0].url, "https://boards.greenhouse.io/example/jobs/4019283");

  assertEquals(parseGreenhouseJobs({ jobs: [] }), []);
  assertEquals(parseGreenhouseJobs(null), []);
});

Deno.test("lever adapter parses fixture and handles empty response", async () => {
  const raw = await Deno.readTextFile(
    new URL("../../../../testdata/lever_example.json", import.meta.url),
  );
  const jobs = parseLeverJobs(JSON.parse(raw));
  assertEquals(jobs.length, 2);
  assertEquals(jobs[0].externalId, "b7a1f3e0-1234-4567-89ab-cdef01234567");
  assertEquals(jobs[0].title, "Frontend Engineer (Next.js / TypeScript)");
  assertEquals(jobs[0].remote, true);
  assertEquals(jobs[1].remote, false);

  assertEquals(parseLeverJobs([]), []);
  assertEquals(parseLeverJobs({}), []);
});

Deno.test("ashby adapter parses fixture and handles empty response", async () => {
  const raw = await Deno.readTextFile(
    new URL("../../../../testdata/ashby_example.json", import.meta.url),
  );
  const jobs = parseAshbyJobs(JSON.parse(raw));
  assertEquals(jobs.length, 2);
  assertEquals(jobs[0].externalId, "ashby-job-001");
  assertEquals(jobs[0].remote, true);
  assertEquals(jobs[0].url, "https://jobs.ashbyhq.com/example/ashby-job-001");

  assertEquals(parseAshbyJobs({ jobs: [] }), []);
});
