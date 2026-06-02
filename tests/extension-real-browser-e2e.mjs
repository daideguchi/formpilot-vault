import assert from "node:assert/strict";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { buildSchema, buildInputPlan } from "../extension/src/schema-engine.js";
import { SAMPLE_PROFILE } from "../extension/src/profile-formatters.js";
import {
  VAULT_CRYPTO_STORAGE_KEY,
  VAULT_KEY_DB_ID,
  VAULT_KEY_DB_NAME,
  VAULT_KEY_DB_STORE,
  storageDumpContainsProfileValues
} from "../extension/src/vault-crypto.js";

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
  await context.route("https://zipcloud.ibsnet.co.jp/api/search**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify({
        status: 200,
        message: null,
        results: [
          {
            zipcode: "1500001",
            address1: "東京都",
            address2: "渋谷区",
            address3: "神宮前"
          }
        ]
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
  assert.equal(fields.locale_context.page_language, "ja");
  assert.equal(fields.locale_context.text_direction, "ltr");
  const plan = buildInputPlan({
    fields: fields.fields,
    schema: buildSchema(fields.fields),
    profile: SAMPLE_PROFILE
  });
  const fillResult = await serviceWorker.evaluate(async (inputPlan) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return chrome.tabs.sendMessage(tab.id, { type: "AFA_FILL_FIELDS", plan: inputPlan });
  }, plan);

  assert.equal(fields.fields.length, 14);
  assert.equal(fillResult.filled, 13);
  assert.equal(fillResult.skipped, 1);
  assert.ok(fillResult.undo_token);

  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await popup.waitForSelector("#scanPage");
  assert.equal(await popup.locator("h1").textContent(), "FormPilot Vault");
  assert.equal(await popup.locator(".workflow-step").count(), 3);
  assert.equal(await popup.locator(".workflow-strip").evaluate((node) => getComputedStyle(node).userSelect), "none");
  assert.equal(await popup.locator(".workflow-step").first().evaluate((node) => getComputedStyle(node).pointerEvents), "none");
  assert.match(await popup.locator("#fillPage").textContent(), /確認後に入力/);
  const storedVault = await serviceWorker.evaluate(async () => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const stored = await chrome.storage.local.get(null);
      if (stored.vaultState?.vault_profiles?.[0]?.encrypted_values) return stored;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return chrome.storage.local.get(null);
  });
  assert.equal(storageDumpContainsProfileValues(storedVault, SAMPLE_PROFILE), false);
  assert.equal(storedVault.vaultState.vault_profiles[0].values, undefined);
  assert.equal(storedVault.vaultState.vault_profiles[0].encrypted_values.alg, "AES-GCM");
  assert.equal(storedVault[VAULT_CRYPTO_STORAGE_KEY], undefined);
  assert.equal(storedVault.profile, undefined);
  const vaultKeyRecord = await popup.evaluate(async ({ dbName, storeName, keyId }) => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return new Promise((resolve, reject) => {
      const request = db.transaction(storeName, "readonly").objectStore(storeName).get(keyId);
      request.onsuccess = () => resolve({
        alg: request.result?.alg,
        has_key: Boolean(request.result?.key),
        key_type: request.result?.key?.type,
        key_extractable: request.result?.key?.extractable
      });
      request.onerror = () => reject(request.error);
    });
  }, { dbName: VAULT_KEY_DB_NAME, storeName: VAULT_KEY_DB_STORE, keyId: VAULT_KEY_DB_ID });
  assert.deepEqual(vaultKeyRecord, {
    alg: "AES-GCM",
    has_key: true,
    key_type: "secret",
    key_extractable: false
  });
  await popup.screenshot({ path: path.join(evidenceDir, "real-extension-popup-loaded.png"), fullPage: true });

  assert.equal(await signupPage.locator("#lastName").inputValue(), "山田");
  assert.equal(await signupPage.locator("#firstName").inputValue(), "太郎");
  assert.equal(await signupPage.locator("#email").inputValue(), "taro@example.com");
  assert.equal(await signupPage.locator("#postal").inputValue(), "150-0001");
  assert.equal(await signupPage.locator("#prefecture").inputValue(), "東京都");
  assert.equal(await signupPage.locator("#company").inputValue(), "株式会社サンプル");
  assert.equal(await signupPage.locator("#memberId").inputValue(), "MEMBER-001");
  assert.equal(await signupPage.locator("#referralCode").inputValue(), "FORMPILOT");
  assert.equal(await signupPage.locator("#password").inputValue(), "");

  await popup.locator("#settingsToggle").click();
  await expectExpandedSettings(popup);
  assert.equal(await popup.locator("#profileLast").inputValue(), "");
  assert.match(await popup.locator("#profileLast").getAttribute("placeholder"), /山田/);
  assert.equal(await popup.locator("#profilePhone1").inputValue(), "");
  assert.equal(await popup.locator("#profilePhone1").getAttribute("placeholder"), "090");
  await popup.locator("#profilePostal").fill("1500001");
  await popup.waitForFunction(() => document.querySelector("#profilePrefecture")?.value === "東京都");
  assert.equal(await popup.locator("#profilePostal").inputValue(), "150-0001");
  assert.equal(await popup.locator("#profileCity").inputValue(), "渋谷区");
  assert.equal(await popup.locator("#profileAddress1").inputValue(), "神宮前");
  assert.match(await popup.locator("#postalLookupStatus").textContent(), /住所を自動入力/);
  await popup.locator("#saveProfile").click();
  await popup.waitForFunction(() => document.querySelector("#saveStatus")?.textContent?.includes("登録しました"));
  await popup.screenshot({ path: path.join(evidenceDir, "real-extension-popup-profile.png"), fullPage: true });
  await popup.locator("#loadSample").click();
  assert.equal(await popup.locator("#profilePhone1").inputValue(), "090");
  assert.equal(await popup.locator("#profilePhone2").inputValue(), "1234");
  assert.equal(await popup.locator("#profilePhone3").inputValue(), "5678");
  await popup.locator("[data-settings-tab='ledger']").click();
  await popup.waitForSelector(".custom-field-row");
  assert.match(await popup.locator("#settingsToggle").textContent(), /登録台帳/);
  assert.equal(await popup.locator("[data-settings-tab='ledger']").getAttribute("aria-selected"), "true");
  assert.match(await popup.locator("[data-i18n='customLedgerHint']").textContent(), /個人用の辞書/);
  assert.match(await popup.locator("#ledgerSearch").getAttribute("placeholder"), /台帳を検索/);
  assert.equal(await popup.locator(".custom-category-input").first().inputValue(), "id");
  assert.equal(await popup.locator(".custom-field-row").count(), 2);
  await popup.locator("[data-ledger-preset='sheet_term']").click();
  assert.equal(await popup.locator(".custom-field-row").count(), 3);
  assert.equal(await popup.locator(".custom-field-row").last().locator(".custom-category-input").inputValue(), "sheet");
  await popup.locator("#ledgerSearch").fill("会員");
  assert.equal(await popup.locator(".custom-field-row:visible").count(), 1);
  await popup.locator("#ledgerSearch").fill("");
  await popup.evaluate(() => document.activeElement?.blur?.());
  await popup.screenshot({ path: path.join(evidenceDir, "real-extension-popup-ledger.png"), fullPage: true });
  await popup.locator("[data-settings-tab='plan']").click();
  await popup.locator("#licenseKey").fill("lic_real_browser_demo");
  await popup.locator("#checkLicense").click();
  await popup.waitForFunction(() => document.querySelector("#usageStatus")?.textContent?.includes("PLUS"));
  await popup.screenshot({ path: path.join(evidenceDir, "real-extension-popup-license.png"), fullPage: true });
  const manager = await context.newPage();
  await manager.goto(`chrome-extension://${extensionId}/manager.html`);
  await manager.waitForSelector("#metricLedger");
  assert.equal(await manager.locator(".brand h1").textContent(), "FormPilot Manager");
  assert.equal(await manager.locator("[data-view-panel='dashboard']").isVisible(), true);
  assert.match(await manager.locator("#metricUsage").textContent(), /0|20|PLUS/i);
  await manager.locator("[data-view='ledger']").click();
  assert.equal(await manager.locator("[data-view-panel='ledger']").isVisible(), true);
  await manager.locator("[data-view='plan']").click();
  assert.match(await manager.locator("#planSummaryManager").textContent(), /Plus|PLUS|Free|20/i);
  await manager.locator("[data-view='dashboard']").click();
  await manager.screenshot({ path: path.join(evidenceDir, "real-extension-manager-dashboard.png"), fullPage: true });
  await signupPage.screenshot({ path: path.join(evidenceDir, "real-extension-filled-form.png"), fullPage: true });

  const result = {
    extension_id: extensionId,
    fields_scanned: fields.fields.length,
    fields_filled: fillResult.filled,
    usage_status: await popup.locator("#usageStatus").textContent(),
    evidence: [
      "site/assets/real-extension-popup-loaded.png",
      "site/assets/real-extension-popup-profile.png",
      "site/assets/real-extension-popup-ledger.png",
      "site/assets/real-extension-popup-license.png",
      "site/assets/real-extension-manager-dashboard.png",
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

async function expectExpandedSettings(popup) {
  assert.equal(await popup.locator("#settingsToggle").getAttribute("aria-expanded"), "true");
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
