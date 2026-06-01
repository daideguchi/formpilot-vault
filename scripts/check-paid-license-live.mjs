const DEFAULT_BASE_URLS = [
  "https://formpilot-vault-api.vercel.app",
  "https://ai-form-autofill.dd-1107-11107.workers.dev"
];

const licenseKey = String(process.env.AFA_LICENSE_KEY || "").trim();
const expectedPlan = String(process.env.AFA_EXPECTED_PLAN || "").trim().toLowerCase();
const baseUrls = String(process.env.AFA_ENTITLEMENT_BASE_URLS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

if (!licenseKey) {
  console.error(JSON.stringify({
    ok: false,
    blocker: "AFA_LICENSE_KEY_missing",
    usage: "AFA_LICENSE_KEY=afa_xxx [AFA_EXPECTED_PLAN=plus|pro|team] npm run check:paid-license"
  }, null, 2));
  process.exit(2);
}

const targets = (baseUrls.length ? baseUrls : DEFAULT_BASE_URLS).map((value) => normalizeBaseUrl(value));
const checks = [];
for (const baseUrl of targets) {
  checks.push(await checkEntitlement(baseUrl));
}

const blockers = checks.filter((check) => !check.ok);
const report = {
  checked_at: new Date().toISOString(),
  ok: blockers.length === 0,
  license_key: redactLicenseKey(licenseKey),
  expected_plan: expectedPlan || null,
  checks,
  blockers: blockers.map((check) => ({ base_url: check.base_url, reason: check.reason }))
};

console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);

async function checkEntitlement(baseUrl) {
  try {
    const response = await fetch(`${baseUrl}/api/entitlement/check`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ license_key: licenseKey })
    });
    const body = await response.json().catch(() => ({}));
    const plan = body.plan || "free";
    const active = body.active === true;
    const expectedMatches = !expectedPlan || plan === expectedPlan;
    const paid = ["plus", "pro", "team"].includes(plan);
    const ok = response.ok && active && paid && expectedMatches;
    return {
      base_url: baseUrl,
      ok,
      status: response.status,
      plan,
      active,
      current_period_end: body.current_period_end || null,
      monthly_fills: body.limits?.monthly_fills || null,
      reason: ok ? null : failureReason({ response, plan, active, expectedMatches })
    };
  } catch (error) {
    return {
      base_url: baseUrl,
      ok: false,
      reason: error.message
    };
  }
}

function failureReason({ response, plan, active, expectedMatches }) {
  if (!response.ok) return `http_${response.status}`;
  if (!active) return "license_not_active";
  if (!["plus", "pro", "team"].includes(plan)) return `not_paid_plan:${plan}`;
  if (!expectedMatches) return `unexpected_plan:${plan}`;
  return "unknown";
}

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function redactLicenseKey(value) {
  if (value.length <= 12) return `${value.slice(0, 4)}...`;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}
