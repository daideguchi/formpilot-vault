import assert from "node:assert/strict";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { buildSchema, buildInputPlan } from "../extension/src/schema-engine.js";
import { SAMPLE_PROFILE } from "../extension/src/profile-formatters.js";
import { storageDumpContainsProfileValues } from "../extension/src/vault-crypto.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const extensionPath = path.join(root, "extension");
const fixturePath = path.join(root, "tests/fixtures/signup.html");
const evidenceDir = path.join(root, "site/assets");

const server = await createFixtureServer();
const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "afa-extension-e2e-"));
const tempExtensionPath = await createTemporaryExtension({ serverUrl: server.url });
const browserArgs = [
  `--disable-extensions-except=${tempExtensionPath}`,
  `--load-extension=${tempExtensionPath}`,
  "--no-first-run",
  "--no-default-browser-check"
];

let context;

try {
  context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: browserArgs,
    viewport: { width: 1280, height: 900 }
  });

  await context.route("**/api/entitlement/check", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        plan: "plus",
        status: "active",
        active: true,
        license_key: "lic_real_browser_demo"
      })
    });
  });

  const signupPage = await context.newPage();
  await signupPage.goto(server.url);
  await signupPage.bringToFront();

  const serviceWorker = await getExtensionServiceWorker(context);
  const extensionId = new URL(serviceWorker.url()).host;

  const fields = await serviceWorker.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["src/collector.js"] });
    return chrome.tabs.sendMessage(tab.id, { type: "AFA_COLLECT_FIELDS" });
  });
  const plan = buildInputPlan({
    fields: fields.fields,
    schema: buildSchema(fields.fields),
    profile: SAMPLE_PROFILE
  });
  const fillResult = await serviceWorker.evaluate(async (inputPlan) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return chrome.tabs.sendMessage(tab.id, { type: "AFA_FILL_FIELDS", plan: inputPlan });
  }, plan);

  assert.equal(fields.fields.length, 12);
  assert.equal(fillResult.filled, 12);

  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await popup.waitForSelector("#memoryStatus");
  assert.equal(await popup.locator("h1").textContent(), "FormPilot Vault");
  const storedVault = await serviceWorker.evaluate(async () => chrome.storage.local.get(null));
  assert.equal(storageDumpContainsProfileValues(storedVault, SAMPLE_PROFILE), false);
  assert.equal(storedVault.vaultState.vault_profiles[0].values, undefined);
  assert.equal(storedVault.vaultState.vault_profiles[0].encrypted_values.alg, "AES-GCM");
  assert.equal(storedVault.profile, undefined);
  await popup.screenshot({ path: path.join(evidenceDir, "real-extension-popup-loaded.png"), fullPage: true });

  assert.equal(await signupPage.locator("#lastName").inputValue(), "山田");
  assert.equal(await signupPage.locator("#firstName").inputValue(), "太郎");
  assert.equal(await signupPage.locator("#email").inputValue(), "taro@example.com");
  assert.equal(await signupPage.locator("#postal").inputValue(), "150-0001");
  assert.equal(await signupPage.locator("#prefecture").inputValue(), "東京都");
  assert.equal(await signupPage.locator("#company").inputValue(), "株式会社サンプル");

  await popup.locator("#licenseKey").fill("lic_real_browser_demo");
  await popup.locator("#checkLicense").click();
  await popup.waitForFunction(() => document.querySelector("#usageStatus")?.textContent?.includes("PLUS"));
  await popup.screenshot({ path: path.join(evidenceDir, "real-extension-popup-license.png"), fullPage: true });
  await signupPage.screenshot({ path: path.join(evidenceDir, "real-extension-filled-form.png"), fullPage: true });

  const result = {
    extension_id: extensionId,
    fields_scanned: fields.fields.length,
    fields_filled: fillResult.filled,
    usage_status: await popup.locator("#usageStatus").textContent(),
    evidence: [
      "site/assets/real-extension-popup-loaded.png",
      "site/assets/real-extension-popup-license.png",
      "site/assets/real-extension-filled-form.png"
    ]
  };
  console.log(JSON.stringify(result, null, 2));
} finally {
  await context?.close();
  await fs.rm(userDataDir, { recursive: true, force: true });
  await fs.rm(tempExtensionPath, { recursive: true, force: true });
  await new Promise((resolve) => server.close(resolve));
}

async function getExtensionServiceWorker(context) {
  const existing = context.serviceWorkers().find((worker) => worker.url().startsWith("chrome-extension://"));
  if (existing) return existing;
  return context.waitForEvent("serviceworker", {
    predicate: (worker) => worker.url().startsWith("chrome-extension://"),
    timeout: 10_000
  });
}

async function createFixtureServer() {
  const server = http.createServer(async (_request, response) => {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(await fs.readFile(fixturePath, "utf8"));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  server.url = `http://127.0.0.1:${port}/signup`;
  return server;
}

async function createTemporaryExtension({ serverUrl }) {
  const tempPath = await fs.mkdtemp(path.join(os.tmpdir(), "afa-extension-src-"));
  await fs.cp(extensionPath, tempPath, { recursive: true });
  const manifestPath = path.join(tempPath, "manifest.json");
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  const origin = new URL(serverUrl).origin;
  manifest.host_permissions = [`${origin}/*`];
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return tempPath;
}
