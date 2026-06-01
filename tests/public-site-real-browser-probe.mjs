import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { buildSchema, buildInputPlan } from "../extension/src/schema-engine.js";
import { SAMPLE_PROFILE } from "../extension/src/profile-formatters.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const extensionPath = path.join(root, "extension");
const evidenceDir = path.join(root, "site/assets");

const targets = [
  {
    id: "httpbin_forms_post",
    url: "https://httpbin.org/forms/post",
    minFields: 4
  },
  {
    id: "selenium_web_form",
    url: "https://www.selenium.dev/selenium/web/web-form.html",
    minFields: 4
  }
];

const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "afa-public-probe-profile-"));
const tempExtensionPath = await createTemporaryExtension(targets.map((target) => new URL(target.url).origin));
let context;

try {
  context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${tempExtensionPath}`,
      `--load-extension=${tempExtensionPath}`,
      "--no-first-run",
      "--no-default-browser-check"
    ],
    viewport: { width: 1280, height: 900 }
  });

  const serviceWorker = await getExtensionServiceWorker(context);
  const results = [];

  for (const target of targets) {
    const page = await context.newPage();
    await page.goto(target.url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.bringToFront();

    const fields = await serviceWorker.evaluate(async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["src/collector.js"] });
      return chrome.tabs.sendMessage(tab.id, { type: "AFA_COLLECT_FIELDS" });
    });

    const schema = buildSchema(fields.fields);
    const plan = buildInputPlan({ fields: fields.fields, schema, profile: SAMPLE_PROFILE });
    const fillable = plan.filter((item) => item.action === "fill" || item.action === "select");
    const fillResult = await serviceWorker.evaluate(async (inputPlan) => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      return chrome.tabs.sendMessage(tab.id, { type: "AFA_FILL_FIELDS", plan: inputPlan });
    }, fillable);

    const screenshot = `site/assets/public-probe-${target.id}.png`;
    await page.screenshot({ path: path.join(root, screenshot), fullPage: true });

    const result = {
      id: target.id,
      url: target.url,
      fields_scanned: fields.fields.length,
      fields_ready: fillable.length,
      fields_filled: fillResult.filled,
      asks: plan.filter((item) => item.action === "ask").length,
      screenshot
    };
    results.push(result);

    assert.ok(result.fields_scanned >= target.minFields, `${target.id}: expected at least ${target.minFields} fields`);
    assert.ok(result.fields_filled >= 1, `${target.id}: expected at least one filled field`);
    await page.close();
  }

  const evidencePath = path.join(evidenceDir, "public-site-real-browser-probe.json");
  await fs.writeFile(evidencePath, `${JSON.stringify({ created_at: new Date().toISOString(), results }, null, 2)}\n`);
  console.log(JSON.stringify({ results, evidence: "site/assets/public-site-real-browser-probe.json" }, null, 2));
} finally {
  await context?.close();
  await fs.rm(userDataDir, { recursive: true, force: true });
  await fs.rm(tempExtensionPath, { recursive: true, force: true });
}

async function getExtensionServiceWorker(context) {
  const existing = context.serviceWorkers().find((worker) => worker.url().startsWith("chrome-extension://"));
  if (existing) return existing;
  return context.waitForEvent("serviceworker", {
    predicate: (worker) => worker.url().startsWith("chrome-extension://"),
    timeout: 10_000
  });
}

async function createTemporaryExtension(origins) {
  const tempPath = await fs.mkdtemp(path.join(os.tmpdir(), "afa-public-probe-extension-"));
  await fs.cp(extensionPath, tempPath, { recursive: true });
  const manifestPath = path.join(tempPath, "manifest.json");
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  manifest.host_permissions = origins.map((origin) => `${origin}/*`);
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return tempPath;
}
