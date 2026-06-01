import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const strict = process.argv.includes("--strict");
const checks = [];
const warnings = [];
const manifest = await readJson("extension/manifest.json");

await checkFile("extension/manifest.json");
await checkLocales();
await checkFile(`dist/ai-form-autofill-${manifest?.version || "0.1.0"}.zip`);
await checkFile("site/privacy.html");
await checkFile("site/terms.html");
await checkFile("site/support.html");
await checkFile("docs/12_chrome_store_listing_copy.md");
await checkFile("docs/14_chrome_web_store_submission_packet.md");
await checkPng("store-assets/icon-128.png", 128, 128);
await checkPng("store-assets/promo-small-440x280.png", 440, 280);
await checkPng("store-assets/screenshot-main-1280x800.png", 1280, 800);
await checkPng("store-assets/screenshot-popup-1280x800.png", 1280, 800);
await checkPng("store-assets/screenshot-pricing-1280x800.png", 1280, 800);
await checkNoPlaceholder("extension/src/release-config.js", ["REPLACE_WITH_PUBLIC_URL", "example.com"]);
await checkNoPlaceholder("extension/manifest.json", ["MVP"]);
await checkNoPlaceholder("wrangler.toml", strict
  ? ["REPLACE_WITH_PUBLIC_URL", "REPLACE_WITH_CLOUDFLARE_D1_DATABASE_ID"]
  : ["REPLACE_WITH_PUBLIC_URL"]);
if (!strict) {
  await warnPlaceholder("wrangler.toml", ["REPLACE_WITH_CLOUDFLARE_D1_DATABASE_ID"], "cloudflare_worker_only");
}

if (strict) {
  checkEnv("STRIPE_SECRET_KEY");
  checkEnv("STRIPE_WEBHOOK_SECRET");
  checkEnv("STRIPE_PRICE_ID_PLUS");
  checkEnv("STRIPE_PRICE_ID_PRO");
  checkEnv("STRIPE_PRICE_ID_TEAM");
  checkEnv("AZURE_DEEPSEEK_ENDPOINT");
  checkEnv("AZURE_DEEPSEEK_API_KEY");
}

const failed = checks.filter((check) => !check.ok);
const result = {
  strict,
  ok: failed.length === 0,
  checks,
  warnings,
  blockers: failed.map((check) => check.name)
};

console.log(JSON.stringify(result, null, 2));
if (strict && failed.length > 0) process.exit(1);

async function checkFile(relativePath) {
  try {
    const stat = await fs.stat(path.join(root, relativePath));
    checks.push({ name: `file:${relativePath}`, ok: stat.isFile() && stat.size > 0, size_bytes: stat.size });
  } catch {
    checks.push({ name: `file:${relativePath}`, ok: false });
  }
}

async function readJson(relativePath) {
  try {
    const content = await fs.readFile(path.join(root, relativePath), "utf8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function checkLocales() {
  const localeRoot = path.join(root, "extension", "_locales");
  try {
    const locales = (await fs.readdir(localeRoot, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    const defaultLocale = manifest?.default_locale || "en";
    const base = await readJson(`extension/_locales/${defaultLocale}/messages.json`);
    const baseKeys = Object.keys(base || {}).sort();
    const missingDefault = !locales.includes(defaultLocale);
    const mismatches = [];

    for (const locale of locales) {
      await checkFile(`extension/_locales/${locale}/messages.json`);
      const messages = await readJson(`extension/_locales/${locale}/messages.json`);
      const keys = Object.keys(messages || {}).sort();
      const missing = baseKeys.filter((key) => !keys.includes(key));
      const extra = keys.filter((key) => !baseKeys.includes(key));
      if (missing.length > 0 || extra.length > 0) mismatches.push({ locale, missing, extra });
    }

    checks.push({
      name: "locales:extension/_locales",
      ok: locales.length >= 16 && !missingDefault && mismatches.length === 0,
      locales,
      count: locales.length,
      key_count: baseKeys.length,
      missing_default_locale: missingDefault,
      mismatches
    });
  } catch (error) {
    checks.push({ name: "locales:extension/_locales", ok: false, error: error.message });
  }
}

async function checkPng(relativePath, width, height) {
  try {
    const data = await fs.readFile(path.join(root, relativePath));
    const actualWidth = data.readUInt32BE(16);
    const actualHeight = data.readUInt32BE(20);
    checks.push({
      name: `png:${relativePath}`,
      ok: actualWidth === width && actualHeight === height,
      width: actualWidth,
      height: actualHeight
    });
  } catch {
    checks.push({ name: `png:${relativePath}`, ok: false });
  }
}

async function checkNoPlaceholder(relativePath, placeholders) {
  try {
    const content = await fs.readFile(path.join(root, relativePath), "utf8");
    const found = placeholders.filter((placeholder) => content.includes(placeholder));
    checks.push({ name: `placeholder:${relativePath}`, ok: found.length === 0, found });
  } catch {
    checks.push({ name: `placeholder:${relativePath}`, ok: false, found: ["file_missing"] });
  }
}

async function warnPlaceholder(relativePath, placeholders, scope) {
  try {
    const content = await fs.readFile(path.join(root, relativePath), "utf8");
    const found = placeholders.filter((placeholder) => content.includes(placeholder));
    if (found.length > 0) warnings.push({ name: `placeholder:${relativePath}`, scope, found });
  } catch {
    warnings.push({ name: `placeholder:${relativePath}`, scope, found: ["file_missing"] });
  }
}

function checkEnv(name) {
  checks.push({ name: `env:${name}`, ok: Boolean(process.env[name]) });
}
