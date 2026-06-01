import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const assetsDir = path.join(root, "site/assets");
const iconDir = path.join(root, "extension/icons");
const storeDir = path.join(root, "store-assets");

await fs.mkdir(iconDir, { recursive: true });
await fs.mkdir(storeDir, { recursive: true });

const browser = await chromium.launch({ headless: true });

try {
  await renderIcons();
  await renderPromo();
  await renderScreenshots();
  console.log(JSON.stringify({
    icons: [
      "extension/icons/icon16.png",
      "extension/icons/icon32.png",
      "extension/icons/icon48.png",
      "extension/icons/icon128.png"
    ],
    store_assets: [
      "store-assets/icon-128.png",
      "store-assets/promo-small-440x280.png",
      "store-assets/screenshot-main-1280x800.png",
      "store-assets/screenshot-popup-1280x800.png",
      "store-assets/screenshot-pricing-1280x800.png"
    ]
  }, null, 2));
} finally {
  await browser.close();
}

async function renderIcons() {
  const sizes = [16, 32, 48, 128];
  for (const size of sizes) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await page.setContent(iconHtml(size));
    await page.locator("#icon").screenshot({ path: path.join(iconDir, `icon${size}.png`), omitBackground: true });
    await page.close();
  }
  await fs.copyFile(path.join(iconDir, "icon128.png"), path.join(storeDir, "icon-128.png"));
}

async function renderPromo() {
  const page = await browser.newPage({ viewport: { width: 440, height: 280 }, deviceScaleFactor: 1 });
  await page.setContent(`
    <main class="promo">
      <div class="mark">${iconSvg(84)}</div>
      <section>
        <p>AI FORM AUTOFILL</p>
        <h1>登録フォーム、もう書かない。</h1>
        <span>Profile Vault + Memory</span>
      </section>
    </main>
    <style>
      body { margin: 0; font-family: Inter, system-ui, sans-serif; }
      .promo {
        width: 440px; height: 280px; display: grid; grid-template-columns: 92px 1fr;
        align-items: center; gap: 18px; padding: 30px; background: #eef8f6; color: #202a35; overflow: hidden;
      }
      p { margin: 0 0 8px; color: #0f766e; font-size: 13px; font-weight: 900; letter-spacing: 0; }
      h1 { margin: 0; font-size: 30px; line-height: 1.08; letter-spacing: 0; }
      span { display: inline-block; margin-top: 16px; color: #435366; font-size: 14px; font-weight: 800; }
    </style>
  `);
  await page.screenshot({ path: path.join(storeDir, "promo-small-440x280.png") });
  await page.close();
}

async function renderScreenshots() {
  await renderStoreScreenshot({
    output: "screenshot-main-1280x800.png",
    title: "日本語フォームをワンクリック入力",
    subtitle: "実値は端末内Vaultから入力。AIへ送るのはフォーム構造だけ。",
    image: path.join(assetsDir, "real-extension-filled-form.png")
  });
  await renderStoreScreenshot({
    output: "screenshot-popup-1280x800.png",
    title: "不明項目だけ確認して学習",
    subtitle: "サイト別マッピングとユーザー修正で、2回目以降の精度を上げます。",
    image: path.join(assetsDir, "real-extension-popup-license.png")
  });
  await renderStoreScreenshot({
    output: "screenshot-pricing-1280x800.png",
    title: "月5回のFreeからPlusへ",
    subtitle: "無制限入力、複数プロフィール、サイト別学習で課金へつなげます。",
    image: path.join(assetsDir, "checkout-pricing-preview.png")
  });
}

async function renderStoreScreenshot({ output, title, subtitle, image }) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const imageDataUrl = await toPngDataUrl(image);
  await page.setContent(`
    <main>
      <section class="copy">
        <div class="brand">${iconSvg(56)}<strong>AIフォームオートフィル</strong></div>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(subtitle)}</p>
      </section>
      <figure><img src="${imageDataUrl}" alt=""></figure>
    </main>
    <style>
      body { margin: 0; font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #202a35; background: #eef8f6; }
      main { width: 1280px; height: 800px; display: grid; grid-template-columns: 0.88fr 1.12fr; align-items: center; gap: 42px; padding: 56px; overflow: hidden; }
      .brand { display: flex; align-items: center; gap: 14px; color: #0f766e; font-size: 20px; font-weight: 900; }
      h1 { max-width: 480px; margin: 32px 0 0; font-size: 56px; line-height: 1.05; letter-spacing: 0; }
      p { max-width: 500px; margin: 22px 0 0; color: #435366; font-size: 22px; line-height: 1.7; font-weight: 700; }
      figure { margin: 0; padding: 0; }
      img { display: block; width: 100%; max-height: 680px; object-fit: contain; border-radius: 8px; border: 1px solid #d6e1e3; box-shadow: 0 28px 90px rgba(31,41,51,.20); background: #fff; }
    </style>
  `);
  await page.screenshot({ path: path.join(storeDir, output) });
  await page.close();
}

async function toPngDataUrl(filePath) {
  const data = await fs.readFile(filePath);
  return `data:image/png;base64,${data.toString("base64")}`;
}

function iconHtml(size) {
  return `
    <div id="icon">${iconSvg(size)}</div>
    <style>
      body { margin: 0; background: transparent; }
      #icon { width: ${size}px; height: ${size}px; display: grid; place-items: center; }
    </style>
  `;
}

function iconSvg(size) {
  const padding = Math.max(1, Math.round(size * 0.125));
  const inner = size - padding * 2;
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect x="${padding}" y="${padding}" width="${inner}" height="${inner}" rx="${Math.round(inner * 0.22)}" fill="#0f766e"/>
      <path d="M${size * 0.31} ${size * 0.34}h${size * 0.32}c${size * 0.08} 0 ${size * 0.13} ${size * 0.06} ${size * 0.13} ${size * 0.13}v${size * 0.12}c0 ${size * 0.08}-${size * 0.06} ${size * 0.13}-${size * 0.13} ${size * 0.13}h-${size * 0.17}l-${size * 0.12} ${size * 0.10}v-${size * 0.10}h-${size * 0.03}c-${size * 0.08} 0-${size * 0.13}-${size * 0.06}-${size * 0.13}-${size * 0.13}v-${size * 0.12}c0-${size * 0.08} ${size * 0.06}-${size * 0.13} ${size * 0.13}-${size * 0.13}Z" fill="#fff"/>
      <path d="M${size * 0.38} ${size * 0.48}h${size * 0.23}M${size * 0.38} ${size * 0.59}h${size * 0.14}" stroke="#0f766e" stroke-width="${Math.max(2, size * 0.055)}" stroke-linecap="round"/>
      <path d="M${size * 0.70} ${size * 0.28}l${size * 0.07}-${size * 0.07} ${size * 0.07} ${size * 0.07}M${size * 0.77} ${size * 0.21}v${size * 0.21}" stroke="#9ee8dc" stroke-width="${Math.max(2, size * 0.055)}" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
