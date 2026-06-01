import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const checks = [];
const blockers = [];
const warnings = [];

await checkWranglerCli();
await checkWranglerToml();
await checkWorkerFiles();

const ok = blockers.length === 0;
const result = {
  checked_at: new Date().toISOString(),
  ok,
  checks,
  blockers,
  warnings
};

console.log(JSON.stringify(result, null, 2));
if (!ok) process.exitCode = 1;

async function checkWranglerCli() {
  const local = await exists("node_modules/.bin/wrangler");
  const global = await commandExists("wrangler");
  const ok = local || global;
  addCheck("wrangler_cli", ok, { local, global });
  if (!ok) blockers.push({ name: "wrangler_cli_missing", fix: "Install wrangler or use npx wrangler after Cloudflare login." });
}

async function checkWranglerToml() {
  const text = await read("wrangler.toml");
  const hasAiBinding = /\[ai\][\s\S]*binding\s*=\s*"AI"/.test(text);
  const d1Id = readTomlValue(text, "database_id");
  const hasD1 = /\[\[d1_databases\]\]/.test(text) && Boolean(d1Id);
  const d1Placeholder = /REPLACE_WITH_CLOUDFLARE_D1_DATABASE_ID/.test(d1Id || "");
  const model = readTomlValue(text, "CLOUDFLARE_WORKERS_AI_MODEL");
  const publicSiteUrl = readTomlValue(text, "PUBLIC_SITE_URL");

  addCheck("wrangler_ai_binding", hasAiBinding, { binding: "AI" });
  addCheck("wrangler_d1_binding", hasD1 && !d1Placeholder, { database_id: maskValue(d1Id), placeholder: d1Placeholder });
  addCheck("wrangler_workers_ai_model", Boolean(model), { model });
  addCheck("wrangler_public_site_url", Boolean(publicSiteUrl), { public_site_url: publicSiteUrl });

  if (!hasAiBinding) blockers.push({ name: "cloudflare_ai_binding_missing" });
  if (!hasD1 || d1Placeholder) blockers.push({ name: "cloudflare_d1_database_id_missing", fix: "Create D1 and replace database_id in wrangler.toml." });
  if (!model) blockers.push({ name: "cloudflare_workers_ai_model_missing" });
  if (publicSiteUrl && !/^https:\/\/formpilot-vault-api\.vercel\.app/.test(publicSiteUrl)) {
    warnings.push({ name: "public_site_url_not_current_vercel_alias", public_site_url: publicSiteUrl });
  }
}

async function checkWorkerFiles() {
  const worker = await read("api/worker/worker.mjs");
  const migrationExists = await exists("api/worker/migrations/0001_entitlements.sql");
  const handlesSchema = worker.includes('/api/schema/infer');
  const handlesCheckout = worker.includes('/api/stripe/checkout-session');
  const handlesEntitlement = worker.includes('/api/entitlement/check');
  const usesAiProxy = worker.includes("inferSchemaWithProxy");

  addCheck("worker_schema_route", handlesSchema && usesAiProxy, { handles_schema: handlesSchema, uses_ai_proxy: usesAiProxy });
  addCheck("worker_checkout_route", handlesCheckout, { handles_checkout: handlesCheckout });
  addCheck("worker_entitlement_route", handlesEntitlement, { handles_entitlement: handlesEntitlement });
  addCheck("worker_d1_migration", migrationExists, { migration: "api/worker/migrations/0001_entitlements.sql" });

  if (!handlesSchema || !usesAiProxy) blockers.push({ name: "worker_schema_route_missing" });
  if (!handlesCheckout) blockers.push({ name: "worker_checkout_route_missing" });
  if (!handlesEntitlement) blockers.push({ name: "worker_entitlement_route_missing" });
  if (!migrationExists) blockers.push({ name: "worker_d1_migration_missing" });
}

function addCheck(name, ok, details = {}) {
  checks.push({ name, ok, details });
}

async function commandExists(command) {
  try {
    await execFileAsync("zsh", ["-lc", `command -v ${command}`]);
    return true;
  } catch {
    return false;
  }
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function read(filePath) {
  return fs.readFile(filePath, "utf8");
}

function readTomlValue(text, key) {
  const match = text.match(new RegExp(`^${escapeRegExp(key)}\\s*=\\s*"([^"]*)"`, "m"));
  return match?.[1] || "";
}

function maskValue(value = "") {
  if (!value) return "";
  if (/REPLACE_WITH/.test(value)) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
