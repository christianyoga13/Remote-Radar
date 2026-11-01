import { getAdapter } from "../_shared/ats/index.ts";
import { createServiceClient, loadSettings } from "../_shared/db.ts";
import { classifyLocation, computeMatchScore } from "../_shared/filter.ts";
import { NotifiableJob, sendTelegramDigest } from "../_shared/telegram.ts";
import { CompanyRow, truncateDescription } from "../_shared/types.ts";

const BATCH_SIZE = 8;
const REQUEST_TIMEOUT_MS = 10_000;

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Step 1: Validate x-cron-secret header (mandatory when deployed with --no-verify-jwt)
  const expectedSecret = Deno.env.get("CRON_SECRET");
  const providedSecret = req.headers.get("x-cron-secret");
  if (!expectedSecret || providedSecret !== expectedSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createServiceClient();
  const startedAt = new Date().toISOString();

  // Create run record upfront
  const { data: runRow } = await supabase
    .from("runs")
    .insert({ started_at: startedAt })
    .select("id")
    .single();
  const runId: number | undefined = runRow?.id;

  let companiesOk = 0;
  let companiesFailed = 0;
  let jobsNew = 0;
  let jobsClosed = 0;
  const notes: string[] = [];

  try {
    // Step 2 & 3: Claim up to 8 companies and load settings
    const [{ data: companiesData, error: claimErr }, settings] = await Promise.all([
      supabase.rpc("claim_companies", { batch_size: BATCH_SIZE }),
      loadSettings(supabase),
    ]);

    if (claimErr) {
      throw new Error(`claim_companies failed: ${claimErr.message}`);
    }

    const companies = (companiesData || []) as CompanyRow[];

    // Step 4: Fetch ATS endpoints in parallel with 10s timeout per company
    const outcomes = await Promise.allSettled(
      companies.map(async (company) => {
        const adapter = getAdapter(company.ats);
        if (!adapter) {
          throw new Error(`Unsupported ATS adapter: ${company.ats}`);
        }
        const signal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
        const fetchedJobs = await adapter.fetchJobs(company.slug, signal);
        return { company, fetchedJobs };
      }),
    );

    // Step 5, 6, 7: Process results per company without letting one failure abort the batch
    for (let i = 0; i < outcomes.length; i++) {
      const outcome = outcomes[i];
      const company = companies[i];

      if (outcome.status === "rejected") {
        companiesFailed++;
        const errMsg = outcome.reason instanceof Error
          ? outcome.reason.message
          : String(outcome.reason);
        const nextFailCount = (company.fail_count || 0) + 1;
        const shouldDeactivate = nextFailCount >= settings.profile.max_fail_count;

        await supabase
          .from("companies")
          .update({
            fail_count: nextFailCount,
            last_status: `error: ${errMsg.slice(0, 240)}`,
            active: shouldDeactivate ? false : company.active,
          })
          .eq("id", company.id);

        notes.push(`${company.name}: ${errMsg.slice(0, 120)}`);
        continue;
      }

      const { fetchedJobs } = outcome.value;
      const nowIso = new Date().toISOString();

      // Fetch existing active external_ids and archived tombstones for this company
      const [{ data: existingRows }, { data: tombstoneRows }] = await Promise.all([
        supabase
          .from("jobs")
          .select("id, external_id, closed_at")
          .eq("company_id", company.id),
        supabase
          .from("job_tombstones")
          .select("external_id")
          .eq("company_id", company.id),
      ]);

      const existingMap = new Map<string, { id: number; closed_at: string | null }>();
      for (const r of existingRows || []) {
        existingMap.set(r.external_id, { id: r.id, closed_at: r.closed_at });
      }
      const tombstoneSet = new Set<string>(
        (tombstoneRows || []).map((t: { external_id: string }) => t.external_id),
      );

      const seenExternalIds = new Set<string>();
      const upsertPayload = fetchedJobs.map((job) => {
        seenExternalIds.add(job.externalId);
        const isTombstoned = tombstoneSet.has(job.externalId);
        if (!existingMap.has(job.externalId) && !isTombstoned) {
          jobsNew++;
        }
        const locationClass = classifyLocation(job, settings.locationRules);
        const matchScore = computeMatchScore(job, settings.profile, locationClass);

        return {
          company_id: company.id,
          external_id: job.externalId,
          title: job.title,
          location_raw: job.location,
          location_class: locationClass,
          is_remote: job.remote,
          department: job.department ?? null,
          url: job.url,
          description: truncateDescription(job.description) ?? null,
          posted_at: job.postedAt ?? null,
          last_seen_at: nowIso,
          closed_at: null,
          match_score: matchScore,
          ...(isTombstoned ? { notified_at: nowIso } : {}),
        };
      });

      if (upsertPayload.length > 0) {
        const { error: upsertErr } = await supabase
          .from("jobs")
          .upsert(upsertPayload, { onConflict: "company_id,external_id" });
        if (upsertErr) {
          companiesFailed++;
          notes.push(`${company.name} upsert error: ${upsertErr.message}`);
          continue;
        }
      }

      // Close jobs that disappeared from the company's current ATS feed
      const idsToClose: number[] = [];
      for (const [extId, row] of existingMap.entries()) {
        if (!seenExternalIds.has(extId) && row.closed_at === null) {
          idsToClose.push(row.id);
        }
      }
      if (idsToClose.length > 0) {
        await supabase
          .from("jobs")
          .update({ closed_at: nowIso })
          .in("id", idsToClose);
        jobsClosed += idsToClose.length;
      }

      await supabase
        .from("companies")
        .update({
          fail_count: 0,
          last_status: `ok (${fetchedJobs.length} jobs)`,
        })
        .eq("id", company.id);

      companiesOk++;
    }

    // Step 8: Atomically claim unnotified jobs and send Telegram digest
    const { data: claimedJobs, error: claimJobsErr } = await supabase.rpc(
      "claim_unnotified_jobs",
      { min_score: settings.profile.min_score },
    );

    if (claimJobsErr) {
      notes.push(`claim_unnotified_jobs error: ${claimJobsErr.message}`);
    } else if (claimedJobs && claimedJobs.length > 0) {
      const list = claimedJobs as NotifiableJob[];
      const sent = await sendTelegramDigest(list, AbortSignal.timeout(REQUEST_TIMEOUT_MS));
      if (!sent) {
        // Roll back notified_at = null so the next run retries delivery
        const failedIds = list.map((j) => j.id);
        await supabase
          .from("jobs")
          .update({ notified_at: null })
          .in("id", failedIds);
        notes.push(`telegram delivery failed; rolled back ${failedIds.length} jobs`);
      }
    }

    // Step 9: Finalize run log
    const finishedAt = new Date().toISOString();
    if (runId) {
      await supabase
        .from("runs")
        .update({
          finished_at: finishedAt,
          companies_ok: companiesOk,
          companies_failed: companiesFailed,
          jobs_new: jobsNew,
          jobs_closed: jobsClosed,
          notes: notes.length > 0 ? notes.join("; ").slice(0, 1000) : null,
        })
        .eq("id", runId);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        companies_ok: companiesOk,
        companies_failed: companiesFailed,
        jobs_new: jobsNew,
        jobs_closed: jobsClosed,
        notes,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (runId) {
      await supabase
        .from("runs")
        .update({
          finished_at: new Date().toISOString(),
          companies_ok: companiesOk,
          companies_failed: companiesFailed,
          jobs_new: jobsNew,
          jobs_closed: jobsClosed,
          notes: `fatal: ${msg}`,
        })
        .eq("id", runId);
    }
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
