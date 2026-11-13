import * as cheerio from "cheerio";

const USER_AGENT = "TuyenDungCVBot/1.0 (+single-page import requested by recruiter)";
const FETCH_TIMEOUT_MS = 10_000;

/**
 * This helper is only used for one-off, HR-initiated imports of a single,
 * already-known public URL (e.g. a candidate's personal portfolio page they
 * shared). It never follows links or repeats requests, so it is not a
 * crawler. It still honours robots.txt "Disallow" rules for the exact path
 * requested, as a courtesy check before fetching.
 */
export async function fetchSinglePageText(rawUrl: string): Promise<{ text: string; title: string }> {
  const url = new URL(rawUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("URL không hợp lệ. Chỉ hỗ trợ http/https.");
  }

  const allowed = await isPathAllowedByRobots(url);
  if (!allowed) {
    throw new Error(
      "Trang này có robots.txt chặn thu thập nội dung tự động. Vui lòng tải CV lên trực tiếp thay vì import qua link."
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let html: string;
  try {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`Không tải được trang (HTTP ${res.status}).`);
    }
    html = await res.text();
  } finally {
    clearTimeout(timeout);
  }

  const $ = cheerio.load(html);
  $("script, style, noscript, nav, footer").remove();

  const title = $("title").first().text().trim();
  const text = $("body").text().replace(/\s+\n/g, "\n").replace(/[ \t]+/g, " ").trim();

  return { text, title };
}

async function isPathAllowedByRobots(url: URL): Promise<boolean> {
  try {
    const robotsUrl = new URL("/robots.txt", url.origin);
    const res = await fetch(robotsUrl.toString(), {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) return true;

    const body = await res.text();
    const disallowedPaths = parseDisallowRulesForAllAgents(body);

    return !disallowedPaths.some((path) => path && url.pathname.startsWith(path));
  } catch {
    // If robots.txt can't be fetched/parsed, err on the side of allowing
    // this single manually-supplied URL rather than blocking the user.
    return true;
  }
}

function parseDisallowRulesForAllAgents(robotsTxt: string): string[] {
  const lines = robotsTxt.split("\n").map((l) => l.trim());
  const disallowed: string[] = [];
  let inWildcardGroup = false;

  for (const line of lines) {
    if (/^user-agent\s*:/i.test(line)) {
      const agent = line.split(":")[1]?.trim();
      inWildcardGroup = agent === "*";
      continue;
    }
    if (inWildcardGroup && /^disallow\s*:/i.test(line)) {
      const path = line.split(":")[1]?.trim();
      if (path) disallowed.push(path);
    }
  }

  return disallowed;
}
