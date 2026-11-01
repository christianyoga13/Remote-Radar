import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { AppSettings, LocationRulesSettings, ProfileSettings } from "./types.ts";

const DEFAULT_PROFILE: ProfileSettings = {
  roles: [
    "fullstack",
    "full stack",
    "full-stack",
    "frontend",
    "front-end",
    "backend",
    "back-end",
    "software engineer",
    "product engineer",
    "go developer",
    "react",
    "next.js",
    "flutter",
  ],
  stack: ["typescript", "react", "next.js", "go", "golang", "flutter", "postgres", "supabase"],
  levels: ["senior", "mid", "staff", "lead"],
  blacklist: ["unpaid", "intern", "security clearance", "us citizen"],
  min_score: 35,
  max_fail_count: 5,
};

const DEFAULT_LOCATION_RULES: LocationRulesSettings = {
  eligible: [
    "worldwide",
    "anywhere",
    "global",
    "apac",
    "asia",
    "southeast asia",
    "indonesia",
  ],
  restricted: [
    "us only",
    "u.s. only",
    "eu only",
    "uk only",
    "must reside in",
    "work authorization",
    "no visa sponsorship",
    "no visa support",
  ],
};

// Isolate-level settings cache to save DB roundtrips and CPU (ARCHITECTURE.md 5.3).
let cachedSettings: { value: AppSettings; expiresAt: number } | null = null;
const SETTINGS_TTL_MS = 3 * 60 * 1000;

export function createServiceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in Edge Function runtime");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function loadSettings(supabase: SupabaseClient): Promise<AppSettings> {
  const now = Date.now();
  if (cachedSettings && cachedSettings.expiresAt > now) {
    return cachedSettings.value;
  }

  const { data, error } = await supabase.from("settings").select("key, value");
  if (error) {
    console.warn("Failed to load settings table, falling back to defaults:", error.message);
    return { profile: DEFAULT_PROFILE, locationRules: DEFAULT_LOCATION_RULES };
  }

  let profile = DEFAULT_PROFILE;
  let locationRules = DEFAULT_LOCATION_RULES;

  for (const row of data || []) {
    if (row.key === "profile" && row.value) {
      profile = { ...DEFAULT_PROFILE, ...(row.value as Partial<ProfileSettings>) };
    } else if (row.key === "location_rules" && row.value) {
      locationRules = {
        ...DEFAULT_LOCATION_RULES,
        ...(row.value as Partial<LocationRulesSettings>),
      };
    }
  }

  const result = { profile, locationRules };
  cachedSettings = { value: result, expiresAt: now + SETTINGS_TTL_MS };
  return result;
}
