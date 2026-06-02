const DEFAULT_BASE_URL = "https://formpilot-vault-api.vercel.app";

const args = new Set(process.argv.slice(2));
const strictAiLive = args.has("--strict-ai-live");
const baseUrl = normalizeBaseUrl(process.env.AFA_PUBLIC_URL || DEFAULT_BASE_URL);
const PAID_PLANS = ["plus", "pro", "team"];

const report = {
  base_url: baseUrl,
  checked_at: new Date().toISOString(),
  strict_ai_live: strictAiLive,
  checks: [],
  blockers: [],
  warnings: []
};

await checkHealth();
await checkSchemaInference();
await checkCheckout();
await checkEntitlement();
await checkPublicPages();

report.ok = report.blockers.length === 0;
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);

async function checkHealth() {
  const response = await getJson("/api/health");
  const ok = response.ok && response.payload?.ok === true && response.payload?.runtime === "vercel";
  addCheck("health", ok, response.payload || response.error);
}

async function checkSchemaInference() {
  const response = await postJson("/api/schema/infer", {
    task: "form_schema_mapping",
    fields: [
      {
        field_id: "field_001",
        tag: "input",
        type: "email",
        label: "Email",
        visible: true
      }
    ],
    memory_context: {
      field_mappings: {},
      mapping_cache: [],
      semantic_memory: []
    }
  });

  const mapping = response.payload?.mappings?.field_001;
  const mapsEmail = mapping?.semantic_key === "person.email.primary";
  const mode = response.payload?.mode || null;
  const ok = response.ok && mapsEmail && (mode === "live" || mode === "rules_fallback");
  addCheck("schema_inference", ok, {
    provider_id: response.payload?.provider_id,
    mode,
    provider_error: response.payload?.provider_error || null,
    semantic_key: mapping?.semantic_key || null
  });

  if (ok && mode !== "live") {
    const warning = {
      name: "schema_inference_not_live",
      mode,
      provider_error: response.payload?.provider_error || null
    };
    report.warnings.push(warning);
    if (strictAiLive) report.blockers.push(warning);
  }
}

async function checkCheckout() {
  const details = [];
  for (const plan of PAID_PLANS) {
    const licenseKey = `afa_prod_probe_${plan}_${crypto.randomUUID().replaceAll("-", "")}`;
    const response = await postJson("/api/stripe/checkout-session", {
      plan,
      license_key: licenseKey
    });
    const url = response.payload?.url || "";
    details.push({
      plan,
      ok: response.ok && /^https:\/\/checkout\.stripe\.com\//.test(url),
      checkout_url_host: safeHost(url),
      session_id_prefix: response.payload?.id ? String(response.payload.id).slice(0, 8) : null,
      returned_plan: response.payload?.plan || null,
      error: response.payload?.error || null
    });
  }
  addCheck("stripe_checkout_sessions", details.every((entry) => entry.ok), { plans: details });
}

async function checkEntitlement() {
  const url = `/api/entitlement/check?license_key=${encodeURIComponent("afa_prod_probe_unpaid")}`;
  const response = await getJson(url);
  const ok = response.ok
    && response.payload?.plan === "free"
    && response.payload?.limits?.monthly_fills === 5;
  addCheck("entitlement_free_fallback", ok, {
    plan: response.payload?.plan,
    monthly_fills: response.payload?.limits?.monthly_fills,
    status: response.payload?.status
  });
}

async function checkPublicPages() {
  await checkPage("home_page", "/", [
    "FormPilot Vault | AI form autofill Chrome extension",
    "AI form autofill Chrome extension",
    "https://formpilot-vault-api.vercel.app/ja"
  ]);
  await checkPage("japanese_seo_page", "/ja", [
    "フォーム入力を自動入力するAI Chrome拡張",
    "フォーム入力を自動化したい人へ",
    "フォーム入力の自動化について詳しく見る",
    "https://formpilot-vault-api.vercel.app/ja"
  ]);
  await checkPage("form_input_keyword_page", "/form-input", [
    "フォーム入力を自動化するChrome拡張",
    "フォーム入力を、毎回手で書かない。",
    "Freeは月5回"
  ]);
  await checkPage("checkout_success_page", "/success.html", [
    "ライセンスを確認します",
    "License key",
    "権利を再確認",
    "entitlementStatus"
  ]);
  await checkPage("privacy_page", "/privacy.html", [
    "Privacy Policy - FormPilot Vault",
    "FormPilot Vault helps users fill forms",
    "FormPilot Vault Support"
  ]);
  await checkPage("support_page", "/support.html", [
    "Support - FormPilot Vault",
    "Open a support issue",
    "does not submit forms"
  ]);
  await checkPage("terms_page", "/terms.html", [
    "Terms - FormPilot Vault",
    "Free usage is limited to 5 fills per month"
  ]);
  await checkPage("robots_txt", "/robots.txt", [
    "User-agent: *",
    "Allow: /",
    "Sitemap: https://formpilot-vault-api.vercel.app/sitemap.xml"
  ]);
  await checkPage("sitemap_xml", "/sitemap.xml", [
    "<loc>https://formpilot-vault-api.vercel.app/</loc>",
    "<loc>https://formpilot-vault-api.vercel.app/ja</loc>"
  ]);
}

async function checkPage(name, path, requiredSnippets) {
  const response = await fetch(`${baseUrl}${path}`);
  const text = await response.text();
  const missing = requiredSnippets.filter((snippet) => !text.includes(snippet));
  addCheck(name, response.ok && missing.length === 0, {
    status: response.status,
    missing
  });
}

async function getJson(path) {
  try {
    const response = await fetch(`${baseUrl}${path}`);
    return { ok: response.ok, status: response.status, payload: await response.json() };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

async function postJson(path, body) {
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    return { ok: response.ok, status: response.status, payload: await response.json() };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function addCheck(name, ok, details = {}) {
  const check = { name, ok, details };
  report.checks.push(check);
  if (!ok) report.blockers.push(check);
}

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function safeHost(value) {
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}
