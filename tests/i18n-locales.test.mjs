import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const localesDir = path.join(root, "extension", "_locales");

test("extension locales are global-ready and key-complete", async () => {
  const requiredLocales = [
    "ar",
    "de",
    "en",
    "en_GB",
    "es",
    "es_419",
    "fr",
    "hi",
    "id",
    "it",
    "ja",
    "ko",
    "nl",
    "pl",
    "pt_BR",
    "ru",
    "th",
    "tr",
    "vi",
    "zh_CN",
    "zh_TW"
  ];
  const locales = (await fs.readdir(localesDir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const locale of requiredLocales) assert.ok(locales.includes(locale), `${locale} locale is missing`);

  const base = await readMessages("en");
  const baseKeys = Object.keys(base).sort();
  for (const locale of locales) {
    const messages = await readMessages(locale);
    assert.deepEqual(Object.keys(messages).sort(), baseKeys, `${locale} messages must match en keys`);
  }
});

async function readMessages(locale) {
  return JSON.parse(await fs.readFile(path.join(localesDir, locale, "messages.json"), "utf8"));
}
