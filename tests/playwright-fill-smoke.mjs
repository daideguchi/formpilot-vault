import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { buildSchema, buildInputPlan } from "../extension/src/schema-engine.js";
import { SAMPLE_PROFILE } from "../extension/src/profile-formatters.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const fixturePath = path.join(root, "tests/fixtures/signup.html");
const collectorPath = path.join(root, "extension/src/collector.js");

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 980, height: 820 } });

try {
  await page.goto(`file://${fixturePath}`);
  await page.addScriptTag({ path: collectorPath });
  const fields = await page.evaluate(() => window.AIFormAutofillContent.collectFormFields());
  const schema = buildSchema(fields);
  const plan = buildInputPlan({ fields, schema, profile: SAMPLE_PROFILE });
  const filled = await page.evaluate((inputPlan) => window.AIFormAutofillContent.fillFormFields(inputPlan), plan);

  assert.ok(fields.length >= 10, `expected >= 10 fields, got ${fields.length}`);
  assert.ok(filled >= 10, `expected >= 10 filled fields, got ${filled}`);
  assert.equal(await page.locator("#lastName").inputValue(), "山田");
  assert.equal(await page.locator("#firstName").inputValue(), "太郎");
  assert.equal(await page.locator("#email").inputValue(), "taro@example.com");
  assert.equal(await page.locator("#postal").inputValue(), "150-0001");
  assert.equal(await page.locator("#prefecture").inputValue(), "東京都");
  assert.equal(await page.locator("#company").inputValue(), "株式会社サンプル");
  assert.equal(await page.locator("#memberId").inputValue(), "MEMBER-001");
  assert.equal(await page.locator("#referralCode").inputValue(), "FORMPILOT");
  console.log(`Playwright smoke passed: ${fields.length} fields scanned, ${filled} filled`);
} finally {
  await browser.close();
}
