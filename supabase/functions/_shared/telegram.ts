export interface NotifiableJob {
  id: number;
  company_name: string;
  title: string;
  location_raw: string | null;
  location_class: string;
  match_score: number | null;
  url: string;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function formatTelegramDigest(jobs: NotifiableJob[]): string {
  const header = `<b>Remote Radar: ${jobs.length} new matching job(s)</b>\n`;
  const lines = jobs.map((j, idx) => {
    const badge = j.location_class === "eligible" ? "[ELIGIBLE]" : "[UNKNOWN]";
    const loc = j.location_raw ? escapeHtml(j.location_raw) : "Remote";
    const score = j.match_score ?? 0;
    return `${idx + 1}. <b>${escapeHtml(j.company_name)}</b> — <a href="${escapeHtml(j.url)}">${
      escapeHtml(j.title)
    }</a>\n   ${badge} ${loc} · Score: <b>${score}</b>`;
  });
  return `${header}\n${lines.join("\n\n")}`;
}

export async function sendTelegramDigest(
  jobs: NotifiableJob[],
  signal: AbortSignal,
): Promise<boolean> {
  if (jobs.length === 0) return true;

  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = Deno.env.get("TELEGRAM_CHAT_ID");
  if (!token || !chatId) {
    // When running locally without Telegram configured, skip network call but log clearly.
    console.warn("TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set; skipping Telegram dispatch.");
    return true;
  }

  const text = formatTelegramDigest(jobs);
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
    signal,
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    console.error(`Telegram sendMessage failed (${res.status}): ${errBody}`);
    return false;
  }
  return true;
}
