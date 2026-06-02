import crypto from "node:crypto";
import { spawn } from "node:child_process";

const DEFAULT_BASE_URL = "https://formpilot-vault-api.vercel.app";
const DEFAULT_WORKER_URL = "https://ai-form-autofill.dd-1107-11107.workers.dev";
const PAID_PLANS = new Set(["plus", "pro", "team"]);

const options = parseArgs(process.argv.slice(2));
const baseUrl = normalizeBaseUrl(options.baseUrl || process.env.AFA_PUBLIC_URL || DEFAULT_BASE_URL);
const plan = String(options.plan || process.env.AFA_PURCHASE_PLAN || "plus").toLowerCase();
const licenseKey = String(options.licenseKey || process.env.AFA_LICENSE_KEY || generateLicenseKey()).trim();
const wait = Boolean(options.wait);
const openCheckout = Boolean(options.open);
const timeoutMs = Number(options.timeoutSeconds || process.env.AFA_PURCHASE_TIMEOUT_SECONDS || 900) * 1000;
const intervalMs = Number(options.intervalSeconds || process.env.AFA_PURCHASE_INTERVAL_SECONDS || 10) * 1000;

if (!PAID_PLANS.has(plan)) {
  fail({ blocker: "invalid_plan", plan, allowed: [...PAID_PLANS] }, 2);
}

const session = await createCheckoutSession();
const startReport = {
  checked_at: new Date().toISOString(),
  ok: true,
  mode: "live_purchase_start",
  plan,
  license_key: licenseKey,
  checkout_session_id: session.id || null,
  checkout_url: session.url,
  success_url: `${baseUrl}/success?license_key=${encodeURIComponent(licenseKey)}`
};

console.log(JSON.stringify(startReport, null, 2));

if (openCheckout) {
  openUrl(session.url);
}

if (wait) {
  const result = await waitForEntitlement();
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
}

async function createCheckoutSession() {
  const response = await fetch(`${baseUrl}/api/stripe/checkout-session`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ plan, license_key: licenseKey })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !/^https:\/\/checkout\.stripe\.com\//.test(body.url || "")) {
    fail({
      blocker: "checkout_session_failed",
      status: response.status,
      body
    });
  }
  return body;
}

async function waitForEntitlement() {
  const deadline = Date.now() + timeoutMs;
  let lastChecks = [];

  while (Date.now() < deadline) {
    lastChecks = await checkAllEntitlements();
    if (lastChecks.every((check) => check.ok)) {
      return {
        checked_at: new Date().toISOString(),
        ok: true,
        mode: "live_purchase_verified",
        plan,
        license_key: redactLicenseKey(licenseKey),
        checks: lastChecks
      };
    }
    await sleep(intervalMs);
  }

  return {
    checked_at: new Date().toISOString(),
    ok: false,
    blocker: "paid_license_not_active_before_timeout",
    plan,
    license_key: redactLicenseKey(licenseKey),
    timeout_seconds: Math.round(timeoutMs / 1000),
    checks: lastChecks
  };
}

async function checkAllEntitlements() {
  const targets = entitlementTargets();
  const checks = [];
  for (const target of targets) {
    checks.push(await checkEntitlement(target));
  }
  return checks;
}

async function checkEntitlement(targetBaseUrl) {
  try {
    const response = await fetch(`${targetBaseUrl}/api/entitlement/check`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ license_key: licenseKey })
    });
    const body = await response.json().catch(() => ({}));
    const actualPlan = body.plan || "free";
    const active = body.active === true;
    const ok = response.ok && active && actualPlan === plan;
    return {
      base_url: targetBaseUrl,
      ok,
      status: response.status,
      plan: actualPlan,
      active,
      monthly_fills: body.limits?.monthly_fills || null,
      current_period_end: body.current_period_end || null,
      reason: ok ? null : failureReason({ response, actualPlan, active })
    };
  } catch (error) {
    return {
      base_url: targetBaseUrl,
      ok: false,
      reason: error.message
    };
  }
}

function entitlementTargets() {
  const configured = String(process.env.AFA_ENTITLEMENT_BASE_URLS || "")
    .split(",")
    .map((value) => normalizeBaseUrl(value))
    .filter(Boolean);
  if (configured.length) return configured;
  return [baseUrl, DEFAULT_WORKER_URL].map((value) => normalizeBaseUrl(value));
}

function failureReason({ response, actualPlan, active }) {
  if (!response.ok) return `http_${response.status}`;
  if (!active) return "license_not_active";
  if (actualPlan !== plan) return `unexpected_plan:${actualPlan}`;
  return "unknown";
}

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--wait") parsed.wait = true;
    else if (arg === "--open") parsed.open = true;
    else if (arg.startsWith("--plan=")) parsed.plan = arg.slice("--plan=".length);
    else if (arg === "--plan") parsed.plan = args[++index];
    else if (arg.startsWith("--license-key=")) parsed.licenseKey = arg.slice("--license-key=".length);
    else if (arg === "--license-key") parsed.licenseKey = args[++index];
    else if (arg.startsWith("--base-url=")) parsed.baseUrl = arg.slice("--base-url=".length);
    else if (arg === "--base-url") parsed.baseUrl = args[++index];
    else if (arg.startsWith("--timeout-seconds=")) parsed.timeoutSeconds = arg.slice("--timeout-seconds=".length);
    else if (arg === "--timeout-seconds") parsed.timeoutSeconds = args[++index];
    else if (arg.startsWith("--interval-seconds=")) parsed.intervalSeconds = arg.slice("--interval-seconds=".length);
    else if (arg === "--interval-seconds") parsed.intervalSeconds = args[++index];
    else if (arg === "--help") {
      console.log(`Usage: npm run purchase:verify -- --plan plus [--open] [--wait]\n\nOptions:\n  --plan plus|pro|team\n  --license-key afa_xxx\n  --base-url https://formpilot-vault-api.vercel.app\n  --open\n  --wait\n  --timeout-seconds 900\n  --interval-seconds 10`);
      process.exit(0);
    }
  }
  return parsed;
}

function openUrl(url) {
  const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  const child = spawn(command, args, { stdio: "ignore", detached: true });
  child.unref();
}

function generateLicenseKey() {
  return `afa_purchase_${Date.now()}_${crypto.randomUUID().replace(/-/g, "")}`;
}

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function redactLicenseKey(value) {
  if (value.length <= 12) return `${value.slice(0, 4)}...`;
  return `${value.slice(0, 12)}...${value.slice(-4)}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fail(payload, code = 1) {
  console.error(JSON.stringify({ checked_at: new Date().toISOString(), ok: false, ...payload }, null, 2));
  process.exit(code);
}
