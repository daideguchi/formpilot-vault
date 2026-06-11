import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { buildSchema, buildInputPlan } from "../extension/src/schema-engine.js";
import { SAMPLE_PROFILE } from "../extension/src/profile-formatters.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const fixturePath = path.join(root, "tests/fixtures/signup.html");
const collectorPath = path.join(root, "extension/src/collector.js");
const chromeExecutable =
  process.env.CHROME_EXECUTABLE ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 980, height: 820 } });

try {
  await page.goto(`file://${fixturePath}`);
  await page.addScriptTag({ path: collectorPath });
  await page.evaluate(() => {
    window.__unsafeSubmitCount = 0;
    const form = document.querySelector("form");
    const trigger = document.querySelector("#lastName");
    form.addEventListener("submit", () => {
      window.__unsafeSubmitCount += 1;
    });
    trigger.addEventListener("change", () => form.requestSubmit());
  });
  const fields = await page.evaluate(() => window.AIFormAutofillContent.collectFormFields());
  const schema = buildSchema(fields);
  const plan = buildInputPlan({ fields, schema, profile: SAMPLE_PROFILE });
  const fillResult = await page.evaluate((inputPlan) => window.AIFormAutofillContent.fillFormFields(inputPlan), plan);

  assert.ok(fields.length >= 10, `expected >= 10 fields, got ${fields.length}`);
  assert.ok(fillResult.filled >= 10, `expected >= 10 filled fields, got ${fillResult.filled}`);
  assert.ok(fillResult.undo_token, "expected undo token after fill");
  assert.equal(await page.locator("#lastName").inputValue(), "山田");
  assert.equal(await page.locator("#firstName").inputValue(), "太郎");
  assert.equal(await page.locator("#email").inputValue(), "taro@example.com");
  assert.equal(await page.locator("#postal").inputValue(), "150-0001");
  assert.equal(await page.locator("#prefecture").inputValue(), "東京都");
  assert.equal(await page.locator("#company").inputValue(), "株式会社サンプル");
  assert.equal(await page.locator("#memberId").inputValue(), "MEMBER-001");
  assert.equal(await page.locator("#referralCode").inputValue(), "FORMPILOT");
  assert.equal(await page.locator("#password").inputValue(), "");
  assert.equal(await page.evaluate(() => window.__unsafeSubmitCount), 0);
  const undoResult = await page.evaluate((token) => window.AIFormAutofillContent.undoFillFields(token), fillResult.undo_token);
  assert.ok(undoResult.undone >= 10, `expected undo to restore fields, got ${undoResult.undone}`);
  assert.equal(await page.locator("#lastName").inputValue(), "");
  console.log(`Playwright smoke passed: ${fields.length} fields scanned, ${fillResult.filled} filled`);
} finally {
  await browser.close();
}

async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("Executable doesn't exist") || !existsSync(chromeExecutable)) {
      throw error;
    }
    return chromium.launch({ headless: true, executablePath: chromeExecutable });
  }
}
