const DEFAULT_PUBLIC_URL = "https://formpilot-vault-api.vercel.app";
const DEFAULT_WORKER_URL = "https://ai-form-autofill.dd-1107-11107.workers.dev";
const DEFAULT_PAGES_URL = "https://daideguchi.github.io/formpilot-vault";
const DEFAULT_EXTENSION_ID = "kmlcabffhmenjajmlnkkglphjnbaahlf";
const PAID_PLANS = ["plus", "pro", "team"];

const args = new Set(process.argv.slice(2));
const requirePublished = args.has("--require-published");
const requirePaidLicense = args.has("--require-paid-license");
const requireDashboard = args.has("--require-dashboard");

const publicUrl = normalizeBaseUrl(process.env.AFA_PUBLIC_URL || DEFAULT_PUBLIC_URL);
const workerUrl = normalizeBaseUrl(process.env.CLOUDFLARE_WORKER_URL || DEFAULT_WORKER_URL);
const pagesUrl = normalizeBaseUrl(process.env.AFA_GITHUB_PAGES_URL || DEFAULT_PAGES_URL);
const extensionId = String(process.env.CWS_EXTENSION_ID || DEFAULT_EXTENSION_ID).trim();
const devtoolsPort = Number(process.env.CWS_DEVTOOLS_PORT || 9230);

const checks = [];
const blockers = [];
const warnings = [];

await checkHttpJson("vercel_health", `${publicUrl}/api/health`, (body) => body?.ok === true);
await checkHttpJson("cloudflare_health", `${workerUrl}/api/health`, (body) => body?.ok === true && body?.db === true);
await checkHttpPage("github_pages_site", `${pagesUrl}/`, ["FormPilot Vault"]);
await checkChromeStorePublicListing();
await checkChromeStoreDashboard();
await checkPaidLicenseIfProvided();

const report = {
  checked_at: new Date().toISOString(),
  ok: blockers.length === 0,
  mode: {
    require_published: requirePublished,
    require_paid_license: requirePaidLicense,
    require_dashboard: requireDashboard
  },
  checks,
  warnings,
  blockers
};

console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);

async function checkHttpJson(name, url, predicate) {
  try {
    const response = await fetch(url);
    const body = await response.json().catch(() => null);
    const ok = response.ok && predicate(body);
    addCheck(name, ok, { status: response.status, url, body: summarizeBody(body) });
  } catch (error) {
    addCheck(name, false, { url, error: error.message });
  }
}

async function checkHttpPage(name, url, requiredSnippets) {
  try {
    const response = await fetch(url);
    const text = await response.text();
    const missing = requiredSnippets.filter((snippet) => !text.includes(snippet));
    addCheck(name, response.ok && missing.length === 0, {
      status: response.status,
      url,
      missing
    });
  } catch (error) {
    addCheck(name, false, { url, error: error.message });
  }
}

async function checkChromeStorePublicListing() {
  const url = `https://chromewebstore.google.com/detail/${extensionId}`;
  try {
    const response = await fetch(url, { redirect: "follow" });
    const finalUrl = response.url || url;
    const hasEmptyTitle = finalUrl.includes("/empty-title/");
    const published = response.ok && !hasEmptyTitle;
    const details = {
      status: response.status,
      url,
      final_url: finalUrl,
      published
    };
    checks.push({ name: "chrome_store_public_listing", ok: published || !requirePublished, details });
    if (!published) {
      const warning = { name: "chrome_store_not_public_yet", details };
      if (requirePublished) blockers.push(warning);
      else warnings.push(warning);
    }
  } catch (error) {
    addCheck("chrome_store_public_listing", !requirePublished, { url, error: error.message });
  }
}

async function checkChromeStoreDashboard() {
  const result = await readDashboardStatus();
  const ok = result.ok || (!requireDashboard && result.reason === "dashboard_unavailable");
  checks.push({ name: "chrome_store_dashboard_status", ok, details: result });
  if (!result.ok) {
    const item = { name: "chrome_store_dashboard_status_unverified", details: result };
    if (requireDashboard || result.reason === "draft_or_not_submitted") blockers.push(item);
    else warnings.push(item);
  }
}

async function readDashboardStatus() {
  const jsonUrl = `http://127.0.0.1:${devtoolsPort}/json/list`;
  try {
    const targets = await fetch(jsonUrl).then((response) => response.json());
    const target = targets.find((entry) => {
      const url = String(entry.url || "");
      return url.includes(extensionId) && url.includes("/edit") && !url.includes("/package") && !url.includes("/listing");
    }) || targets.find((entry) => String(entry.url || "").includes(extensionId));
    if (!target) {
      return {
        ok: false,
        reason: "dashboard_unavailable",
        devtools_port: devtoolsPort,
        message: "No Chrome Web Store dashboard tab found for this extension id."
      };
    }

    const { chromium } = await import("playwright");
    const browser = await chromium.connectOverCDP(`http://127.0.0.1:${devtoolsPort}`);
    try {
      const page = browser.contexts().flatMap((context) => context.pages())
        .find((candidate) => candidate.url() === target.url)
        || browser.contexts().flatMap((context) => context.pages())
          .find((candidate) => candidate.url().includes(extensionId));
      if (!page) {
        return { ok: false, reason: "dashboard_unavailable", devtools_port: devtoolsPort };
      }
      await page.bringToFront();
      await page.waitForLoadState("domcontentloaded", { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(1500);
      const text = await page.locator("body").innerText({ timeout: 10000 });
      const statusLine = text.split("\n").map((line) => line.trim())
        .find((line) => /^ステータス:|^Status:/i.test(line)) || null;
      const normalized = normalizeDashboardStatus(statusLine || text);
      return {
        ok: normalized !== "draft_or_not_submitted" && normalized !== "unknown",
        reason: normalized === "draft_or_not_submitted" ? "draft_or_not_submitted" : null,
        status: normalized,
        status_line: statusLine,
        url: page.url()
      };
    } finally {
      await browser.close();
    }
  } catch (error) {
    return {
      ok: false,
      reason: "dashboard_unavailable",
      devtools_port: devtoolsPort,
      error: error.message
    };
  }
}

async function checkPaidLicenseIfProvided() {
  const licenseKey = String(process.env.AFA_LICENSE_KEY || "").trim();
  const expectedPlan = String(process.env.AFA_EXPECTED_PLAN || "").trim().toLowerCase();
  if (!licenseKey) {
    const warning = {
      name: "paid_license_not_checked",
      reason: "AFA_LICENSE_KEY_missing",
      usage: "AFA_LICENSE_KEY=afa_xxx AFA_EXPECTED_PLAN=plus npm run check:launch -- --require-paid-license"
    };
    checks.push({ name: "paid_license", ok: !requirePaidLicense, details: warning });
    if (requirePaidLicense) blockers.push(warning);
    else warnings.push(warning);
    return;
  }

  const baseUrls = [publicUrl, workerUrl];
  const details = [];
  for (const baseUrl of baseUrls) {
    details.push(await checkEntitlement(baseUrl, licenseKey, expectedPlan));
  }
  const ok = details.every((entry) => entry.ok);
  checks.push({
    name: "paid_license",
    ok,
    details: {
      expected_plan: expectedPlan || null,
      license_key: redactLicenseKey(licenseKey),
      results: details
    }
  });
  if (!ok) blockers.push({ name: "paid_license_not_active", details });
}

async function checkEntitlement(baseUrl, licenseKey, expectedPlan) {
  try {
    const response = await fetch(`${baseUrl}/api/entitlement/check`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ license_key: licenseKey })
    });
    const body = await response.json().catch(() => ({}));
    const plan = body.plan || "free";
    const active = body.active === true;
    const paid = PAID_PLANS.includes(plan);
    const expectedMatches = !expectedPlan || plan === expectedPlan;
    return {
      base_url: baseUrl,
      ok: response.ok && active && paid && expectedMatches,
      status: response.status,
      plan,
      active,
      monthly_fills: body.limits?.monthly_fills || null,
      current_period_end: body.current_period_end || null
    };
  } catch (error) {
    return { base_url: baseUrl, ok: false, error: error.message };
  }
}

function normalizeDashboardStatus(value) {
  const text = String(value || "");
  if (/審査待ち|審査中|Pending review|In review/i.test(text)) return "pending_review";
  if (/公開済み|公開中|Published|Live/i.test(text)) return "published";
  if (/下書き|ドラフト|Draft/i.test(text) && !/審査待ち|Pending review/i.test(text)) {
    return "draft_or_not_submitted";
  }
  return "unknown";
}

function addCheck(name, ok, details = {}) {
  const check = { name, ok, details };
  checks.push(check);
  if (!ok) blockers.push(check);
}

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function summarizeBody(body) {
  if (!body || typeof body !== "object") return body;
  return {
    ok: body.ok,
    runtime: body.runtime,
    service: body.service,
    db: body.db,
    ai_binding: body.ai_binding,
    assets: body.assets
  };
}

function redactLicenseKey(value) {
  if (value.length <= 12) return `${value.slice(0, 4)}...`;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}
