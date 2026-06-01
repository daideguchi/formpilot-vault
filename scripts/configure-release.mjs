import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const publicUrl = normalizeUrl(process.env.AFA_PUBLIC_URL || process.argv[2] || "");

if (!publicUrl) {
  throw new Error("AFA_PUBLIC_URL or first argument is required");
}

await fs.writeFile(
  path.join(root, "extension/src/release-config.js"),
  `export const PUBLIC_BASE_URL = ${JSON.stringify(publicUrl)};\nexport const ENTITLEMENT_CHECK_URL = \`${publicUrl}/api/entitlement/check\`;\n`
);

const wranglerPath = path.join(root, "wrangler.toml");
const wrangler = await fs.readFile(wranglerPath, "utf8");
await fs.writeFile(
  wranglerPath,
  wrangler.replace(/PUBLIC_SITE_URL = ".*"/, `PUBLIC_SITE_URL = "${publicUrl}"`)
);

console.log(JSON.stringify({
  public_url: publicUrl,
  extension_config: "extension/src/release-config.js",
  wrangler_config: "wrangler.toml"
}, null, 2));

function normalizeUrl(value) {
  const trimmed = String(value).trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  const url = new URL(trimmed);
  if (!["https:", "http:"].includes(url.protocol)) throw new Error("public_url_must_be_http_or_https");
  return url.toString().replace(/\/+$/, "");
}
