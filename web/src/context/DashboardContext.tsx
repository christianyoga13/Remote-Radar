"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import {
  AtsType,
  Company,
  JobRow,
  JobStatus,
  LocationClass,
  LocationRulesSettings,
  ProfileSettings,
  RunRow,
  SeniorityLevel,
  detectJobLevel,
} from "@/types";
import {
  DEMO_COMPANIES,
  DEMO_JOBS,
  DEMO_LOCATION_RULES,
  DEMO_PROFILE,
  DEMO_RUNS,
} from "@/lib/demo-data";

interface DashboardContextType {
  // Auth state
  userEmail: string | null;
  loginEmail: string;
  setLoginEmail: (v: string) => void;
  authMsg: string | null;
  loading: boolean;
  isConfigured: boolean;

  // Data
  jobs: JobRow[];
  companies: Company[];
  runs: RunRow[];
  profile: ProfileSettings;
  locationRules: LocationRulesSettings;

  // Job filters
  locFilter: LocationClass | "all";
  setLocFilter: (v: LocationClass | "all") => void;
  statusFilter: JobStatus | "all";
  setStatusFilter: (v: JobStatus | "all") => void;
  levelFilter: SeniorityLevel;
  setLevelFilter: (v: SeniorityLevel) => void;
  companyFilter: string;
  setCompanyFilter: (v: string) => void;
  minScore: number;
  setMinScore: (v: number) => void;
  search: string;
  setSearch: (v: string) => void;
  expandedJobId: number | null;
  setExpandedJobId: React.Dispatch<React.SetStateAction<number | null>>;
  filteredJobs: JobRow[];

  // Settings JSON state
  profileJson: string;
  setProfileJson: (v: string) => void;
  locRulesJson: string;
  setLocRulesJson: (v: string) => void;
  settingsMsg: string | null;

  // Manual Fetch State
  isFetchingJobs: boolean;
  fetchStatusMessage: string | null;
  triggerManualFetch: (
    companyId?: number
  ) => Promise<{ ok: boolean; message: string }>;

  // CV Profiler & Rescoring
  isRescoring: boolean;
  applyCvProfileAndRescore: (
    newSkills: { roles: string[]; stack: string[]; levels: string[] },
    mode: "merge" | "replace",
    triggerRescore: boolean
  ) => Promise<{ ok: boolean; message: string }>;
  rescoreAllJobs: () => Promise<{ ok: boolean; message: string }>;

  // Actions
  fetchAllFromSupabase: () => Promise<void>;
  handleMagicLinkLogin: (e: React.FormEvent) => Promise<void>;
  handleSignOut: () => Promise<void>;
  updateJobStatus: (jobId: number, status: JobStatus) => Promise<void>;
  handleAddCompany: (
    name: string,
    ats: AtsType,
    slug: string,
    careersUrl?: string
  ) => Promise<void>;
  toggleCompanyActive: (comp: Company) => Promise<void>;
  handleSaveSettings: () => Promise<void>;
}

const DashboardContext = createContext<DashboardContextType | null>(null);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [authMsg, setAuthMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Data state
  const [jobs, setJobs] = useState<JobRow[]>(DEMO_JOBS);
  const [companies, setCompanies] = useState<Company[]>(DEMO_COMPANIES);
  const [runs, setRuns] = useState<RunRow[]>(DEMO_RUNS);
  const [profile, setProfile] = useState<ProfileSettings>(DEMO_PROFILE);
  const [locationRules, setLocationRules] =
    useState<LocationRulesSettings>(DEMO_LOCATION_RULES);

  // Job filters
  const [locFilter, setLocFilter] = useState<LocationClass | "all">("eligible");
  const [statusFilter, setStatusFilter] = useState<JobStatus | "all">("all");
  const [levelFilter, setLevelFilter] = useState<SeniorityLevel>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [minScore, setMinScore] = useState<number>(35);
  const [search, setSearch] = useState<string>("");
  const [expandedJobId, setExpandedJobId] = useState<number | null>(null);

  // Settings JSON
  const [profileJson, setProfileJson] = useState(() =>
    JSON.stringify(DEMO_PROFILE, null, 2)
  );
  const [locRulesJson, setLocRulesJson] = useState(() =>
    JSON.stringify(DEMO_LOCATION_RULES, null, 2)
  );
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;

    // Fetch live data immediately for public / anon viewing
    fetchAllFromSupabase();

    supabase.auth.getSession().then(({ data }) => {
      const email = data.session?.user?.email ?? null;
      setUserEmail(email);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const email = session?.user?.email ?? null;
      setUserEmail(email);
      if (email) {
        fetchAllFromSupabase();
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  async function fetchAllFromSupabase() {
    if (!supabase) return;
    setLoading(true);
    try {
      const [jobsRes, compRes, runsRes, setRes] = await Promise.all([
        supabase
          .from("jobs")
          .select("*, companies(name, ats, slug)")
          .is("closed_at", null)
          .order("first_seen_at", { ascending: false })
          .limit(200),
        supabase
          .from("companies")
          .select("*")
          .order("name", { ascending: true }),
        supabase
          .from("runs")
          .select("*")
          .order("started_at", { ascending: false })
          .limit(50),
        supabase.from("settings").select("key, value"),
      ]);

      if (jobsRes.data) setJobs(jobsRes.data as JobRow[]);
      if (compRes.data) setCompanies(compRes.data as Company[]);
      if (runsRes.data) setRuns(runsRes.data as RunRow[]);
      if (setRes.data) {
        for (const row of setRes.data) {
          if (row.key === "profile") {
            setProfile(row.value as ProfileSettings);
            setProfileJson(JSON.stringify(row.value, null, 2));
          } else if (row.key === "location_rules") {
            setLocationRules(row.value as LocationRulesSettings);
            setLocRulesJson(JSON.stringify(row.value, null, 2));
          }
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLinkLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !loginEmail.trim()) return;
    setAuthMsg("Sending magic link...");
    const { error } = await supabase.auth.signInWithOtp({
      email: loginEmail.trim(),
    });
    setAuthMsg(
      error
        ? `Login error: ${error.message}`
        : "Check your email (or local Inbucket at :54324) for the magic link!"
    );
  }

  async function handleSignOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUserEmail(null);
  }

  async function updateJobStatus(jobId: number, status: JobStatus) {
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, status } : j))
    );
    if (supabase && userEmail) {
      await supabase.from("jobs").update({ status }).eq("id", jobId);
    }
  }

  async function handleAddCompany(
    name: string,
    ats: AtsType,
    slug: string,
    careersUrl?: string
  ) {
    const trimmedName = name.trim();
    const trimmedSlug = slug.trim().toLowerCase();
    if (!trimmedName || !trimmedSlug) return;

    const defaultUrl =
      careersUrl?.trim() ||
      (ats === "greenhouse"
        ? `https://boards.greenhouse.io/${trimmedSlug}`
        : ats === "lever"
        ? `https://jobs.lever.co/${trimmedSlug}`
        : `https://jobs.ashbyhq.com/${trimmedSlug}`);

    if (supabase && userEmail) {
      const { data, error } = await supabase
        .from("companies")
        .insert({
          name: trimmedName,
          ats,
          slug: trimmedSlug,
          careers_url: defaultUrl,
          active: true,
        })
        .select("*")
        .single();
      if (!error && data) {
        setCompanies((prev) => [...prev, data as Company]);
      }
    } else {
      setCompanies((prev) => [
        ...prev,
        {
          id: Date.now(),
          name: trimmedName,
          ats,
          slug: trimmedSlug,
          careers_url: defaultUrl,
          active: true,
          fail_count: 0,
          last_status: "pending first batch",
          last_fetched_at: null,
        },
      ]);
    }
  }

  async function toggleCompanyActive(comp: Company) {
    const nextActive = !comp.active;
    setCompanies((prev) =>
      prev.map((c) =>
        c.id === comp.id
          ? { ...c, active: nextActive, fail_count: nextActive ? 0 : c.fail_count }
          : c
      )
    );
    if (supabase && userEmail) {
      await supabase
        .from("companies")
        .update({
          active: nextActive,
          fail_count: nextActive ? 0 : comp.fail_count,
        })
        .eq("id", comp.id);
    }
  }

  const [isRescoring, setIsRescoring] = useState(false);

  async function rescoreAllJobs(): Promise<{ ok: boolean; message: string }> {
    if (!supabase) return { ok: false, message: "Supabase not connected" };
    setIsRescoring(true);
    try {
      const { data, error } = await supabase.rpc("rescore_jobs");
      if (error) throw error;
      await fetchAllFromSupabase();
      const count = (data as { rescored_jobs?: number })?.rescored_jobs ?? 0;
      const msg = `Successfully rescored ${count} jobs with updated profile!`;
      setSettingsMsg(msg);
      return { ok: true, message: msg };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setSettingsMsg(`Rescore error: ${msg}`);
      return { ok: false, message: msg };
    } finally {
      setIsRescoring(false);
    }
  }

  async function applyCvProfileAndRescore(
    newSkills: { roles: string[]; stack: string[]; levels: string[] },
    mode: "merge" | "replace",
    triggerRescore: boolean
  ): Promise<{ ok: boolean; message: string }> {
    setIsRescoring(true);
    try {
      const current = profile;
      let finalRoles: string[];
      let finalStack: string[];
      let finalLevels: string[];

      if (mode === "merge") {
        finalRoles = Array.from(new Set([...current.roles, ...newSkills.roles]));
        finalStack = Array.from(new Set([...current.stack, ...newSkills.stack]));
        finalLevels = Array.from(new Set([...current.levels, ...newSkills.levels]));
      } else {
        finalRoles = newSkills.roles.length > 0 ? newSkills.roles : current.roles;
        finalStack = newSkills.stack.length > 0 ? newSkills.stack : current.stack;
        finalLevels = newSkills.levels.length > 0 ? newSkills.levels : current.levels;
      }

      const updatedProfile: ProfileSettings = {
        ...current,
        roles: finalRoles,
        stack: finalStack,
        levels: finalLevels,
      };

      setProfile(updatedProfile);
      setProfileJson(JSON.stringify(updatedProfile, null, 2));

      if (supabase) {
        const { error } = await supabase.rpc("update_profile_and_rescore", {
          p_profile: updatedProfile,
          p_trigger_rescore: triggerRescore,
        });
        if (error) {
          console.warn("RPC update_profile_and_rescore error, fallback:", error);
          await supabase.from("settings").upsert({
            key: "profile",
            value: updatedProfile,
            updated_at: new Date().toISOString(),
          });
          if (triggerRescore) {
            await supabase.rpc("rescore_jobs");
          }
        }
        await fetchAllFromSupabase();
      }

      const msg = triggerRescore
        ? `CV applied! ${finalRoles.length} roles & ${finalStack.length} skills saved, and all jobs rescored.`
        : `CV profile saved! Updated ${finalRoles.length} roles and ${finalStack.length} skills.`;
      setSettingsMsg(msg);
      return { ok: true, message: msg };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setSettingsMsg(`Error applying CV: ${msg}`);
      return { ok: false, message: msg };
    } finally {
      setIsRescoring(false);
    }
  }

  async function handleSaveSettings() {
    setSettingsMsg(null);
    try {
      const parsedProfile = JSON.parse(profileJson) as ProfileSettings;
      const parsedRules = JSON.parse(locRulesJson) as LocationRulesSettings;
      setProfile(parsedProfile);
      setLocationRules(parsedRules);

      if (supabase) {
        // Use RPC to update and optionally rescore
        const { error } = await supabase.rpc("update_profile_and_rescore", {
          p_profile: parsedProfile,
          p_trigger_rescore: true,
        });
        if (error) {
          // Fallback if direct table update needed
          await supabase.from("settings").upsert([
            { key: "profile", value: parsedProfile, updated_at: new Date().toISOString() },
            { key: "location_rules", value: parsedRules, updated_at: new Date().toISOString() },
          ]);
        }
        await fetchAllFromSupabase();
      }
      setSettingsMsg(
        "Settings saved! Vacancies rescored and next collect batch will use updated rules."
      );
    } catch (err) {
      setSettingsMsg(
        `Invalid JSON: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  const [isFetchingJobs, setIsFetchingJobs] = useState(false);
  const [fetchStatusMessage, setFetchStatusMessage] = useState<string | null>(null);

  async function triggerManualFetch(
    companyId?: number
  ): Promise<{ ok: boolean; message: string }> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const cronSecret = process.env.NEXT_PUBLIC_CRON_SECRET;
    if (!supabaseUrl) {
      const msg = "Supabase URL not configured";
      setFetchStatusMessage(msg);
      return { ok: false, message: msg };
    }

    setIsFetchingJobs(true);
    setFetchStatusMessage(
      companyId
        ? `Fetching company #${companyId}...`
        : "Triggering batch fetch (8 companies)..."
    );

    try {
      const session = supabase
        ? (await supabase.auth.getSession()).data.session
        : null;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (cronSecret) {
        headers["x-cron-secret"] = cronSecret;
      }
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`${supabaseUrl}/functions/v1/collect`, {
        method: "POST",
        headers,
        body: JSON.stringify(companyId ? { company_id: companyId } : {}),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        const err = data.error || `Error ${res.status}`;
        setFetchStatusMessage(`Fetch failed: ${err}`);
        return { ok: false, message: err };
      }

      const summary = `Fetch done: ${data.companies_ok || 0} OK, ${
        data.companies_failed || 0
      } failed. +${data.jobs_new || 0} new jobs!`;
      setFetchStatusMessage(summary);

      await fetchAllFromSupabase();
      setTimeout(() => setFetchStatusMessage(null), 6000);
      return { ok: true, message: summary };
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      setFetchStatusMessage(`Network error: ${err}`);
      return { ok: false, message: err };
    } finally {
      setIsFetchingJobs(false);
    }
  }

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return jobs.filter((j) => {
      if (locFilter !== "all" && j.location_class !== locFilter) return false;
      if (statusFilter !== "all" && j.status !== statusFilter) return false;
      if (levelFilter !== "all") {
        const detected = detectJobLevel(j.title, j.description);
        if (detected !== levelFilter) return false;
      }
      if (companyFilter !== "all" && String(j.company_id) !== companyFilter) {
        return false;
      }
      if ((j.match_score ?? 0) < minScore) return false;
      if (q) {
        const hay = `${j.title} ${j.companies?.name || ""} ${
          j.location_raw || ""
        } ${j.description || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [jobs, locFilter, statusFilter, levelFilter, companyFilter, minScore, search]);

  const value = {
    userEmail,
    loginEmail,
    setLoginEmail,
    authMsg,
    loading,
    isConfigured: isSupabaseConfigured,
    jobs,
    companies,
    runs,
    profile,
    locationRules,
    locFilter,
    setLocFilter,
    statusFilter,
    setStatusFilter,
    levelFilter,
    setLevelFilter,
    companyFilter,
    setCompanyFilter,
    minScore,
    setMinScore,
    search,
    setSearch,
    expandedJobId,
    setExpandedJobId,
    filteredJobs,
    profileJson,
    setProfileJson,
    locRulesJson,
    setLocRulesJson,
    settingsMsg,
    isFetchingJobs,
    fetchStatusMessage,
    triggerManualFetch,
    fetchAllFromSupabase,
    handleMagicLinkLogin,
    handleSignOut,
    updateJobStatus,
    handleAddCompany,
    toggleCompanyActive,
    handleSaveSettings,
    isRescoring,
    applyCvProfileAndRescore,
    rescoreAllJobs,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard(): DashboardContextType {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
}
