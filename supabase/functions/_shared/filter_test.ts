import { assertEquals } from "@std/assert";
import { classifyLocation, computeMatchScore } from "./filter.ts";
import { LocationRulesSettings, ProfileSettings } from "./types.ts";

const rules: LocationRulesSettings = {
  eligible: ["worldwide", "anywhere", "global", "apac", "asia", "southeast asia", "indonesia"],
  restricted: [
    "us only",
    "eu only",
    "uk only",
    "must reside in",
    "work authorization",
    "no visa sponsorship",
    "no visa support",
  ],
};

const profile: ProfileSettings = {
  roles: ["fullstack", "frontend", "backend", "software engineer"],
  stack: ["typescript", "react", "next.js", "go", "postgres"],
  levels: ["senior", "staff"],
  blacklist: ["unpaid", "security clearance"],
  min_score: 35,
  max_fail_count: 5,
};

Deno.test("classifyLocation table-driven tests (ARCHITECTURE.md section 10)", () => {
  const cases = [
    {
      name: "EU Berlin office with no visa support is restricted",
      job: {
        title: "Backend Engineer",
        location: "Berlin, Germany",
        description: "EU; Berlin Office, no visa support.",
        remote: true,
      },
      expected: "restricted",
    },
    {
      name: "Worldwide remote is eligible",
      job: {
        title: "Senior Fullstack Engineer",
        location: "Remote - Worldwide",
        description: "Work from anywhere.",
        remote: true,
      },
      expected: "eligible",
    },
    {
      name: "US-only remote is restricted",
      job: {
        title: "Frontend Engineer",
        location: "Remote (US Only)",
        description: "We are hiring across the United States.",
        remote: true,
      },
      expected: "restricted",
    },
    {
      name: "Generic remote without region keywords is unknown",
      job: {
        title: "Software Engineer",
        location: "Remote",
        description: "Join our distributed engineering team.",
        remote: true,
      },
      expected: "unknown",
    },
  ];

  for (const tc of cases) {
    assertEquals(classifyLocation(tc.job, rules), tc.expected, tc.name);
  }
});

Deno.test("computeMatchScore rewards role + stack and zeroes restricted or blacklisted jobs", () => {
  const eligibleScore = computeMatchScore(
    {
      title: "Senior Fullstack Engineer",
      location: "Remote - APAC / Indonesia",
      description: "Building with TypeScript, React, Next.js, and Go.",
      remote: true,
    },
    profile,
    "eligible",
  );
  assertEquals(eligibleScore >= 80, true);

  const restrictedScore = computeMatchScore(
    {
      title: "Senior Fullstack Engineer",
      location: "Remote - US Only",
      description: "TypeScript, React, Next.js",
      remote: true,
    },
    profile,
    "restricted",
  );
  assertEquals(restrictedScore, 0);
});
