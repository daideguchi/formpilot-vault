import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { buildSchema, buildInputPlan } from "../extension/src/schema-engine.js";
import { SAMPLE_PROFILE } from "../extension/src/profile-formatters.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const fixturePath = path.join(root, "tests/fixtures/signup.html");
const collectorPath = path.join(root, "extension/src/collector.js");
const outputPath = path.join(root, "site/assets/product-preview.png");

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1120, height: 860, deviceScaleFactor: 2 } });

try {
  await page.goto(`file://${fixturePath}`);
  await page.addScriptTag({ path: collectorPath });
  const fields = await page.evaluate(() => window.AIFormAutofillContent.collectFormFields());
  const plan = buildInputPlan({ fields, schema: buildSchema(fields), profile: SAMPLE_PROFILE });
  await page.evaluate((inputPlan) => window.AIFormAutofillContent.fillFormFields(inputPlan), plan);
  await page.locator("main").screenshot({ path: outputPath });
  console.log(`Wrote ${outputPath}`);
} finally {
  await browser.close();
}

