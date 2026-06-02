import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const sitePath = path.join(root, "site");
const args = new Set(process.argv.slice(2));
const live = args.has("--live");
const baseUrl = normalizeBaseUrl(process.env.AFA_PUBLIC_URL || "https://formpilot-vault-api.vercel.app");

const report = {
  checked_at: new Date().toISOString(),
  mode: live ? "live" : "local",
  base_url: baseUrl,
  checks: [],
  blockers: []
};

const english = await readPage("/");
const japanese = await readPage("/ja");
const formInput = await readPage("/form-input");
const robots = await readText("/robots.txt");
const sitemap = await readText("/sitemap.xml");

checkPage("english_home", english, {
  title: "FormPilot Vault | AI form autofill Chrome extension",
  description: "FormPilot Vault is an AI form autofill Chrome extension",
  canonical: `${baseUrl}/`,
  language: "en",
  requiredText: [
    "AI form autofill Chrome extension",
    "signup forms",
    "contact forms",
    "encrypted local Vault",
    "Human review before submit"
  ]
});

checkPage("japanese_home", japanese, {
  title: "フォーム入力を自動入力するAI Chrome拡張 | FormPilot Vault",
  description: "FormPilot Vaultはフォーム入力を自動入力するAI Chrome拡張",
  canonical: `${baseUrl}/ja`,
  language: "ja",
  requiredText: [
    "フォーム入力",
    "フォーム自動入力",
    "Chrome拡張",
    "AI自動入力",
    "暗号化された端末内Vault"
  ],
  requiredAnyText: [
    ["href=\"form-input\"", "href=\"form-input.html\""]
  ]
});

checkPage("form_input_keyword_page", formInput, {
  title: "フォーム入力を自動化するChrome拡張 | FormPilot Vault",
  description: "フォーム入力、フォーム自動入力、会員登録の入力作業を減らすChrome拡張",
  canonical: `${baseUrl}/form-input`,
  language: "ja",
  hreflang: {
    ja: `${baseUrl}/form-input`,
    en: `${baseUrl}/`,
    xDefault: `${baseUrl}/`
  },
  requiredText: [
    "フォーム入力",
    "フォーム自動入力",
    "会員登録フォーム",
    "暗号化された端末内Vault",
    "Freeは月5回"
  ]
});

checkStructuredData("english_structured_data", english);
checkStructuredData("japanese_structured_data", japanese);
checkStructuredData("form_input_structured_data", formInput);
checkRobots(robots);
checkSitemap(sitemap);

report.ok = report.blockers.length === 0;
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);

function checkPage(name, html, expected) {
  const missing = [];
  if (!html.includes(`<html lang="${expected.language}"`)) missing.push(`html_lang_${expected.language}`);
  if (!html.includes(`<title>${expected.title}</title>`)) missing.push("title");
  if (!html.includes(`<meta name="description" content="${expected.description}`)) missing.push("meta_description");
  if (!html.includes(`<link rel="canonical" href="${expected.canonical}">`)) missing.push("canonical");
  const hreflang = expected.hreflang || {
    en: `${baseUrl}/`,
    ja: `${baseUrl}/ja`,
    xDefault: `${baseUrl}/`
  };
  if (!html.includes(`<link rel="alternate" hreflang="en" href="${hreflang.en}">`)) missing.push("hreflang_en");
  if (!html.includes(`<link rel="alternate" hreflang="ja" href="${hreflang.ja}">`)) missing.push("hreflang_ja");
  if (!html.includes(`<link rel="alternate" hreflang="x-default" href="${hreflang.xDefault}">`)) missing.push("hreflang_x_default");
  if (html.includes('name="keywords"')) missing.push("meta_keywords_should_not_be_used");
  for (const text of expected.requiredText) {
    if (!html.includes(text)) missing.push(`text:${text}`);
  }
  for (const alternatives of expected.requiredAnyText || []) {
    if (!alternatives.some((text) => html.includes(text))) {
      missing.push(`one_of:${alternatives.join("|")}`);
    }
  }
  addCheck(name, missing.length === 0, { missing });
}

function checkStructuredData(name, html) {
  const match = html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/);
  const details = { json_valid: false, has_software_application: false, has_offers: false };
  if (!match) {
    addCheck(name, false, { missing: ["json_ld"] });
    return;
  }

  try {
    const parsed = JSON.parse(match[1]);
    const graph = Array.isArray(parsed["@graph"]) ? parsed["@graph"] : [];
    const software = graph.find((entry) => entry["@type"] === "SoftwareApplication");
    details.json_valid = true;
    details.has_software_application = Boolean(software);
    details.has_offers = Array.isArray(software?.offers) && software.offers.length >= 4;
    details.feature_count = Array.isArray(software?.featureList) ? software.featureList.length : 0;
    addCheck(name, details.json_valid && details.has_software_application && details.has_offers, details);
  } catch (error) {
    addCheck(name, false, { ...details, error: error.message });
  }
}

function checkRobots(text) {
  const missing = [];
  if (!text.includes("User-agent: *")) missing.push("user_agent");
  if (!text.includes("Allow: /")) missing.push("allow_root");
  if (!text.includes(`Sitemap: ${baseUrl}/sitemap.xml`)) missing.push("sitemap_reference");
  addCheck("robots_txt", missing.length === 0, { missing });
}

function checkSitemap(text) {
  const missing = [];
  for (const url of [
    `${baseUrl}/`,
    `${baseUrl}/ja`,
    `${baseUrl}/form-input`,
    `${baseUrl}/privacy.html`,
    `${baseUrl}/terms.html`,
    `${baseUrl}/support.html`
  ]) {
    if (!text.includes(`<loc>${url}</loc>`)) missing.push(url);
  }
  if (!text.startsWith("<?xml version=\"1.0\" encoding=\"UTF-8\"?>")) missing.push("xml_declaration");
  addCheck("sitemap_xml", missing.length === 0, { missing });
}

async function readPage(urlPath) {
  return readText(urlPath);
}

async function readText(urlPath) {
  if (live) {
    const response = await fetch(`${baseUrl}${urlPath}`);
    const text = await response.text();
    if (!response.ok) throw new Error(`GET ${urlPath} failed with ${response.status}`);
    return text;
  }

  const file = urlPath === "/"
    ? "index.html"
    : urlPath === "/ja"
      ? "ja.html"
      : urlPath === "/form-input"
        ? "form-input.html"
        : urlPath.replace(/^\/+/, "");
  return fs.readFile(path.join(sitePath, file), "utf8");
}

function addCheck(name, ok, details = {}) {
  const check = { name, ok, details };
  report.checks.push(check);
  if (!ok) report.blockers.push(check);
}

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}
