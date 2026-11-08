import {
  Job,
  LocationClass,
  LocationRulesSettings,
  ProfileSettings,
  truncateDescription,
} from "./types.ts";

const EXPLICIT_ELIGIBLE_OVERRIDE = [
  "indonesia",
  "apac",
  "asia",
  "southeast asia",
  "worldwide",
  "anywhere",
  "global",
];

function containsAny(haystackLower: string, needles: string[]): boolean {
  for (const raw of needles) {
    const n = raw.trim().toLowerCase();
    if (n && haystackLower.includes(n)) return true;
  }
  return false;
}

/**
 * Evaluates location eligibility using lowercase substring checks (no backtracking regexes)
 * to stay under the 2s CPU budget (ARCHITECTURE.md 5.3 & 5.5).
 *
 * Rules:
 * 1. If restricted keyword matches -> 'restricted', UNLESS Indonesia/APAC/worldwide is explicitly in title or location.
 * 2. If eligible keyword matches -> 'eligible'.
 * 3. Otherwise -> 'unknown'.
 */
export function classifyLocation(
  job: Pick<Job, "title" | "location" | "description" | "remote">,
  rules: LocationRulesSettings,
): LocationClass {
  const titleLocLower = `${job.title} ${job.location}`.toLowerCase();
  const descLower = (truncateDescription(job.description) || "").toLowerCase();
  const combinedLower = `${titleLocLower} ${descLower}`;

  const hasRestricted = containsAny(combinedLower, rules.restricted);
  const hasEligible = containsAny(combinedLower, rules.eligible);
  const hasExplicitOverrideInTitleOrLoc = containsAny(
    titleLocLower,
    EXPLICIT_ELIGIBLE_OVERRIDE,
  ) && !containsAny(titleLocLower, rules.restricted);

  if (hasRestricted && !hasExplicitOverrideInTitleOrLoc) {
    return "restricted";
  }
  if (hasEligible || hasExplicitOverrideInTitleOrLoc) {
    return "eligible";
  }
  if (!job.remote) {
    return "restricted";
  }
  return "unknown";
}

/**
 * Detects timezone requirements and asynchronous work culture from title and description.
 * Uses lowercase substring matching without backtracking regexes to respect Edge Function CPU limits.
 */
export function detectTimezoneAndAsync(
  job: Pick<Job, "title" | "location" | "description">,
): { timezoneNote?: string; isAsync: boolean } {
  const text = `${job.title} ${job.location} ${(truncateDescription(job.description) || "")}`.toLowerCase();

  const asyncKeywords = [
    "asynchronous",
    "async-first",
    "async first",
    "any timezone",
    "flexible working hours",
    "flexible hours",
    "work anytime",
    "work from anywhere in the world",
    "fully async",
  ];
  const isAsync = containsAny(text, asyncKeywords);

  const usOverlapKeywords = [
    "overlap with est",
    "overlap with pst",
    "overlap with et",
    "overlap with pt",
    "us working hours",
    "us business hours",
    "est hours",
    "pst hours",
    "eastern time",
    "pacific time",
    "americas timezone",
  ];

  const euOverlapKeywords = [
    "overlap with bst",
    "overlap with cet",
    "european hours",
    "uk business hours",
    "cet hours",
    "european timezone",
  ];

  const apacKeywords = [
    "apac",
    "asia-pacific",
    "asia pacific",
    "singapore hours",
    "australia hours",
    "aest",
    "wib",
    "gmt+7",
    "utc+7",
    "utc+8",
  ];

  let timezoneNote: string | undefined;

  if (containsAny(text, apacKeywords)) {
    timezoneNote = "🌏 APAC Friendly";
  } else if (containsAny(text, usOverlapKeywords)) {
    timezoneNote = "Requires US Overlap";
  } else if (containsAny(text, euOverlapKeywords)) {
    timezoneNote = "Requires EU Overlap";
  } else if (isAsync) {
    timezoneNote = "⚡ Async-first / Flexible Hours";
  }

  return { timezoneNote, isAsync };
}

/**
 * Computes a 0-100 match score from role match, tech stack hits, seniority level, and blacklist penalties.
 * Also grants bonus points for async-friendly work and companies verified as worldwide/APAC in remoteintech.
 */
export function computeMatchScore(
  job: Pick<Job, "title" | "location" | "description" | "remote">,
  profile: ProfileSettings,
  locationClass: LocationClass,
  options?: { isAsync?: boolean; companyRegion?: string | null },
): number {
  if (!job.remote || locationClass === "restricted") return 0;

  const titleLower = job.title.toLowerCase();
  const bodyLower = `${titleLower} ${(truncateDescription(job.description) || "").toLowerCase()}`;

  // Blacklist penalty immediately zeroes or heavily penalizes score
  if (containsAny(bodyLower, profile.blacklist)) {
    return 0;
  }

  let score = 0;

  // Role target match in title (up to 45 pts)
  if (containsAny(titleLower, profile.roles)) {
    score += 45;
  } else if (containsAny(bodyLower, profile.roles)) {
    score += 20;
  }

  // Stack matches (12 pts each, up to 36 pts)
  let stackHits = 0;
  for (const tech of profile.stack) {
    const t = tech.trim().toLowerCase();
    if (t && bodyLower.includes(t)) {
      stackHits++;
    }
  }
  score += Math.min(stackHits * 12, 36);

  // Level match (10 pts)
  if (containsAny(titleLower, profile.levels)) {
    score += 10;
  }

  // Location bonus (9 pts for explicit eligible vs unknown)
  if (locationClass === "eligible") {
    score += 9;
  }

  // Async / Flexible timezone bonus (+5 pts)
  if (options?.isAsync) {
    score += 5;
  }

  // Remoteintech verified worldwide/APAC company bonus (+5 pts)
  if (
    options?.companyRegion === "worldwide" ||
    options?.companyRegion === "asia-pacific"
  ) {
    score += 5;
  }

  return Math.max(0, Math.min(100, score));
}
