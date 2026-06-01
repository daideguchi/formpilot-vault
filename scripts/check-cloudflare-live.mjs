const DEFAULT_WORKER_URL = "https://ai-form-autofill.dd-1107-11107.workers.dev";

const baseUrl = normalizeBaseUrl(process.env.CLOUDFLARE_WORKER_URL || DEFAULT_WORKER_URL);
const checkedAt = new Date().toISOString();
const checks = [];
const blockers = [];
const warnings = [];

await checkHealth();
await checkSchema();
await checkCheckoutAndEntitlement();

const ok = blockers.length === 0;
console.log(JSON.stringify({ base_url: baseUrl, checked_at: checkedAt, ok, checks, blockers, warnings }, null, 2));
process.exitCode = ok ? 0 : 1;

async function checkHealth() {
  const response = await getJson("/api/health");
  const ok = response.ok && response.body?.ok === true && response.body?.db === true && response.body?.ai_binding === true;
  addCheck("cloudflare_worker_health", ok, {
    status: response.status,
    db: Boolean(response.body?.db),
    ai_binding: Boolean(response.body?.ai_binding),
    assets: Boolean(response.body?.assets)
  });
  if (!ok) blockers.push({ name: "cloudflare_worker_health_failed" });
}

async function checkSchema() {
  const response = await postJson("/api/schema/infer", {
    task: "form_schema_mapping",
    fields: [{ field_id: "field_001", tag: "input", type: "email", label: "Email", visible: true }],
    locale_context: { page_language: "en", host_tld: "dev" }
  });
  const mapping = response.body?.mappings?.field_001 || {};
  const ok = response.ok
    && response.body?.provider_id === "cloudflare_workers_ai_free"
    && response.body?.mode === "live"
    && mapping.semantic_key === "person.email.primary";
  addCheck("cloudflare_schema_live", ok, {
    status: response.status,
    provider_id: response.body?.provider_id,
    mode: response.body?.mode,
    semantic_key: mapping.semantic_key || null
  });
  if (!ok) blockers.push({ name: "cloudflare_schema_live_failed" });
}

async function checkCheckoutAndEntitlement() {
  const licenseKey = `afa_cf_livecheck_${Date.now()}`;
  const checkout = await postJson("/api/stripe/checkout-session", { plan: "plus", license_key: licenseKey });
  const checkoutUrl = checkout.body?.url ? new URL(checkout.body.url) : null;
  const checkoutOk = checkout.ok && checkout.body?.id?.startsWith("cs_live_") && checkoutUrl?.host === "checkout.stripe.com";
  addCheck("cloudflare_checkout_bridge", checkoutOk, {
    status: checkout.status,
    session_id_prefix: checkout.body?.id?.slice(0, 8) || null,
    checkout_url_host: checkoutUrl?.host || null,
    plan: checkout.body?.plan || null
  });
  if (!checkoutOk) blockers.push({ name: "cloudflare_checkout_bridge_failed" });

  const entitlement = await getJson(`/api/entitlement/check?license_key=${encodeURIComponent(licenseKey)}`);
  const entitlementOk = entitlement.ok && entitlement.body?.plan === "free";
  addCheck("cloudflare_entitlement_bridge", entitlementOk, {
    status: entitlement.status,
    plan: entitlement.body?.plan || null,
    monthly_fills: entitlement.body?.limits?.monthly_fills || null
  });
  if (!entitlementOk) warnings.push({ name: "cloudflare_entitlement_bridge_unexpected" });
}

async function getJson(path) {
  return requestJson(path, { method: "GET" });
}

async function postJson(path, body) {
  return requestJson(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

async function requestJson(path, init) {
  const response = await fetch(`${baseUrl}${path}`, init);
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { ok: response.ok, status: response.status, body };
}

function addCheck(name, ok, details = {}) {
  checks.push({ name, ok, details });
}

function normalizeBaseUrl(value) {
  return String(value).trim().replace(/\/+$/, "");
}
