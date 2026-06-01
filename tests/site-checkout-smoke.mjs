import assert from "node:assert/strict";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const sitePath = path.join(root, "site");

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, "http://127.0.0.1");
  if (request.method === "POST" && url.pathname === "/api/stripe/checkout-session") {
    const body = await readBody(request);
    const parsed = JSON.parse(body);
    assert.ok(["plus", "pro", "team"].includes(parsed.plan));
    assert.match(parsed.license_key, /^afa_/);
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ id: "cs_test_site", url: `${server.baseUrl}/success.html?license_key=${parsed.license_key}` }));
    return;
  }

  const file = url.pathname === "/" ? "index.html" : url.pathname === "/ja" ? "ja.html" : url.pathname.slice(1);
  const filePath = path.join(sitePath, file);
  if (!filePath.startsWith(sitePath)) {
    response.writeHead(403);
    response.end();
    return;
  }

  try {
    const ext = path.extname(filePath);
    const type = ext === ".js" ? "text/javascript" : ext === ".css" ? "text/css" : "text/html";
    response.writeHead(200, { "content-type": `${type}; charset=utf-8` });
    response.end(await fs.readFile(filePath));
  } catch {
    response.writeHead(404);
    response.end();
  }
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
server.baseUrl = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`${server.baseUrl}/`);
  assert.equal(await page.locator("html").getAttribute("lang"), "en");
  assert.equal(await page.getByRole("button", { name: "Start Pro" }).isVisible(), true);
  assert.equal(await page.getByRole("button", { name: "Start Team" }).isVisible(), true);
  await page.getByRole("button", { name: "Start Plus" }).dispatchEvent("click");
  await page.waitForURL(/success\.html/);
  assert.match(await page.locator("#licenseKeyDisplay").inputValue(), /^afa_/);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  assert.equal(overflow, false);

  const japanesePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await japanesePage.goto(`${server.baseUrl}/?lang=ja`);
  assert.equal(await japanesePage.locator("html").getAttribute("lang"), "ja");
  assert.equal(await japanesePage.getByRole("button", { name: "Plusで始める" }).isVisible(), true);
  assert.equal(await japanesePage.getByRole("button", { name: "Proで始める" }).isVisible(), true);
  assert.equal(await japanesePage.getByRole("button", { name: "Teamで始める" }).isVisible(), true);
  const mobileOverflow = await japanesePage.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  assert.equal(mobileOverflow, false);

  const japaneseSeoPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await japaneseSeoPage.goto(`${server.baseUrl}/ja`);
  assert.equal(await japaneseSeoPage.locator("html").getAttribute("lang"), "ja");
  assert.equal(await japaneseSeoPage.title(), "フォーム入力を自動入力するAI Chrome拡張 | FormPilot Vault");
  assert.equal(await japaneseSeoPage.getByRole("heading", { name: "フォーム入力を自動化したい人へ" }).isVisible(), true);
  assert.equal(await japaneseSeoPage.getByRole("button", { name: "Plusで始める" }).isVisible(), true);
  const japaneseSeoOverflow = await japaneseSeoPage.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  assert.equal(japaneseSeoOverflow, false);
  console.log(JSON.stringify({ checkout: "ok", url: page.url() }, null, 2));
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => { body += chunk; });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}
