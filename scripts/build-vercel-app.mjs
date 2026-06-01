import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const out = path.join(root, "deploy/formpilot-vault-api");

await fs.rm(out, { recursive: true, force: true });
await fs.mkdir(path.join(out, "api/schema"), { recursive: true });
await fs.mkdir(path.join(out, "api/stripe"), { recursive: true });
await fs.mkdir(path.join(out, "api/entitlement"), { recursive: true });
await fs.mkdir(path.join(out, "server"), { recursive: true });

await copySite();
await writeServerModules();
await writeApiHandlers();
await writeProjectFiles();

console.log(JSON.stringify({
  output: "deploy/formpilot-vault-api",
  routes: [
    "/api/health",
    "/api/schema/infer",
      "/api/stripe/checkout-session",
      "/api/stripe/webhook",
      "/api/entitlement/check",
      "/support.html"
    ]
  }, null, 2));

async function copySite() {
  await fs.cp(path.join(root, "site"), out, { recursive: true });
}

async function writeServerModules() {
  await fs.copyFile(path.join(root, "extension/src/provider-router.js"), path.join(out, "server/provider-router.js"));
  await fs.copyFile(path.join(root, "extension/src/profile-formatters.js"), path.join(out, "server/profile-formatters.js"));
  const schemaEngine = await fs.readFile(path.join(root, "extension/src/schema-engine.js"), "utf8");
  await fs.writeFile(
    path.join(out, "server/schema-engine.js"),
    schemaEngine.replace("./profile-formatters.js", "./profile-formatters.js")
  );
  const schemaProxy = await fs.readFile(path.join(root, "api/schema-proxy/schema-proxy.js"), "utf8");
  await fs.writeFile(
    path.join(out, "server/schema-proxy.js"),
    schemaProxy
      .replace("../../extension/src/provider-router.js", "./provider-router.js")
      .replace("../../extension/src/schema-engine.js", "./schema-engine.js")
  );
  await fs.copyFile(path.join(root, "api/entitlement/entitlement.js"), path.join(out, "server/entitlement.js"));
  const stripeSource = await fs.readFile(path.join(root, "api/entitlement/stripe-source.js"), "utf8");
  await fs.writeFile(
    path.join(out, "server/stripe-source.js"),
    stripeSource.replace("./entitlement.js", "./entitlement.js")
  );
}

async function writeApiHandlers() {
  await fs.writeFile(path.join(out, "api/health.js"), `
export default function handler(_request, response) {
  response.status(200).json({
    ok: true,
    service: "ai-form-autofill",
    runtime: "vercel",
    entitlement_source: process.env.ENTITLEMENT_SOURCE || "stripe"
  });
}
`);

  await fs.writeFile(path.join(out, "api/schema/infer.js"), `
import { inferSchemaWithProxy } from "../../server/schema-proxy.js";

export default async function handler(request, response) {
  if (request.method !== "POST") return response.status(405).json({ error: "method_not_allowed" });
  try {
    const result = await inferSchemaWithProxy({
      payload: request.body,
      env: process.env,
      fetchImpl: globalThis.fetch,
      date: new Date()
    });
    response.status(200).json(result);
  } catch (error) {
    response.status(400).json({ error: error.message });
  }
}
`);

  await fs.writeFile(path.join(out, "api/stripe/checkout-session.js"), `
import { createCheckoutSession } from "../../server/entitlement.js";

export default async function handler(request, response) {
  if (request.method !== "POST") return response.status(405).json({ error: "method_not_allowed" });
  try {
    const bridgeBaseUrl = normalizeBridgeBaseUrl(process.env.FORMPILOT_STRIPE_BRIDGE_BASE_URL);
    if (bridgeBaseUrl) {
      return proxyJson({
        url: \`\${bridgeBaseUrl}/checkout\`,
        method: "POST",
        body: request.body,
        response
      });
    }

    const session = await createCheckoutSession({
      plan: request.body?.plan,
      license_key: request.body?.license_key,
      env: process.env,
      fetchImpl: globalThis.fetch
    });
    response.status(200).json(session);
  } catch (error) {
    response.status(400).json({ error: error.message });
  }
}

async function proxyJson({ url, method, body, response }) {
  const upstream = await fetch(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body || {})
  });
  const payload = await readJson(upstream);
  return response.status(upstream.status).json(payload);
}

async function readJson(upstream) {
  try {
    return await upstream.json();
  } catch {
    return { error: \`bridge_http_\${upstream.status}\` };
  }
}

function normalizeBridgeBaseUrl(value = "") {
  return String(value).trim().replace(/\\/+$/, "");
}
`);

  await fs.writeFile(path.join(out, "api/entitlement/check.js"), `
import { checkStripeEntitlement } from "../../server/stripe-source.js";

export default async function handler(request, response) {
  try {
    const license_key = request.method === "GET"
      ? request.query?.license_key
      : request.body?.license_key;
    const bridgeBaseUrl = normalizeBridgeBaseUrl(process.env.FORMPILOT_STRIPE_BRIDGE_BASE_URL);
    if (bridgeBaseUrl) {
      const url = new URL(\`\${bridgeBaseUrl}/entitlement\`);
      url.searchParams.set("license_key", license_key || "");
      return proxyJson({
        url: url.toString(),
        response
      });
    }

    const entitlement = await checkStripeEntitlement({
      license_key,
      env: process.env,
      fetchImpl: globalThis.fetch
    });
    response.status(200).json(entitlement);
  } catch (error) {
    response.status(400).json({ error: error.message });
  }
}

async function proxyJson({ url, response }) {
  const upstream = await fetch(url, { method: "GET" });
  const payload = await readJson(upstream);
  return response.status(upstream.status).json(payload);
}

async function readJson(upstream) {
  try {
    return await upstream.json();
  } catch {
    return { error: \`bridge_http_\${upstream.status}\` };
  }
}

function normalizeBridgeBaseUrl(value = "") {
  return String(value).trim().replace(/\\/+$/, "");
}
`);

  await fs.writeFile(path.join(out, "api/stripe/webhook.js"), `
import { verifyStripeSignature } from "../../server/entitlement.js";

export const config = { api: { bodyParser: false } };

export default async function handler(request, response) {
  if (request.method !== "POST") return response.status(405).json({ error: "method_not_allowed" });
  try {
    const rawBody = await readRawBody(request);
    if (process.env.STRIPE_WEBHOOK_SECRET) {
      verifyStripeSignature({
        rawBody,
        signatureHeader: request.headers["stripe-signature"],
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
      });
    }
    response.status(200).json({ received: true, source: "stripe_metadata" });
  } catch (error) {
    response.status(400).json({ error: error.message });
  }
}

function readRawBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}
`);
}

async function writeProjectFiles() {
  await fs.writeFile(path.join(out, "package.json"), JSON.stringify({
    name: "formpilot-vault-vercel",
    version: "0.1.0",
    private: true,
    type: "module"
  }, null, 2));

  await fs.writeFile(path.join(out, "vercel.json"), JSON.stringify({
    cleanUrls: true,
    trailingSlash: false,
    headers: [
      {
        source: "/api/(.*)",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "content-type,authorization,stripe-signature" }
        ]
      }
    ]
  }, null, 2));
}
