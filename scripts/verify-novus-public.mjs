import { chromium } from 'playwright';

const baseUrl = process.env.FORMPILOT_PUBLIC_URL || 'https://daideguchi.github.io/formpilot-vault/';
const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

async function checkPage(browser, path, interactions = []) {
  const requests = [];
  const relativePath = path.replace(/^\//, '');
  const url = new URL(relativePath, normalizedBaseUrl).toString();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('request', (request) => {
    const reqUrl = request.url();
    if (reqUrl.includes('pendo.io')) requests.push(reqUrl);
  });

  const verifyUrl = `${url}${url.includes('?') ? '&' : '?'}novus_verify=${Date.now()}`;
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await page.goto(verifyUrl, { waitUntil: 'domcontentloaded' });
      lastError = undefined;
      break;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (!/ERR_NETWORK_CHANGED|ERR_INTERNET_DISCONNECTED|Navigation timeout/i.test(message) || attempt === 3) {
        throw error;
      }
      await page.waitForTimeout(1000 * attempt);
    }
  }
  if (lastError) throw lastError;

  for (const selector of interactions) {
    const target = page.locator(selector).first();
    if (await target.count()) {
      await target.click();
      await page.waitForTimeout(250);
    }
  }

  await page.waitForTimeout(2500);

  const state = await page.evaluate(() => ({
    hasPendo: Boolean(globalThis.pendo),
    hasTrack: typeof globalThis.pendo?.track === 'function',
    hasInitialize: typeof globalThis.pendo?.initialize === 'function',
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  }));

  await page.close();

  return {
    path,
    url,
    ...state,
    pendoRequestCount: requests.length,
    pendoRequestKinds: [...new Set(requests.map((item) => new URL(item).hostname))],
  };
}

const browser = await chromium.launch({ headless: true });
const results = [];
try {
  results.push(await checkPage(browser, '/', [
    'button[data-lang="en"]',
    'a[href="#proof-en"]',
    'a[href="#pricing"]',
  ]));
  results.push(await checkPage(browser, '/form-input.html'));
  results.push(await checkPage(browser, '/form-autofill.html'));
  results.push(await checkPage(browser, '/signup-autofill.html'));
  results.push(await checkPage(browser, '/contact-form-autofill.html'));
  results.push(await checkPage(browser, '/success.html?license_key=afa_public_probe_success'));
  results.push(await checkPage(browser, '/demo.html'));
} finally {
  await browser.close();
}

const failures = [];
for (const result of results) {
  if (!result.hasPendo) failures.push(`${result.path}: pendo object missing`);
  if (!result.hasTrack) failures.push(`${result.path}: pendo.track missing`);
  if (!result.hasInitialize) failures.push(`${result.path}: pendo.initialize missing`);
  if (result.horizontalOverflow) failures.push(`${result.path}: horizontal overflow`);
  if (result.pendoRequestCount < 1) failures.push(`${result.path}: no pendo.io request observed`);
}

if (failures.length) {
  console.error(JSON.stringify({ ok: false, results, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, results }, null, 2));
