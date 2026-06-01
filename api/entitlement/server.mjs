import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import {
  applyStripeEvent,
  checkEntitlement,
  createCheckoutSession,
  verifyStripeSignature
} from "./entitlement.js";

const port = Number(process.env.PORT || 8788);
const storePath = process.env.AFA_ENTITLEMENT_STORE_PATH
  || path.join(process.cwd(), "data/runtime/entitlements.local.json");

const server = http.createServer(async (request, response) => {
  try {
    if (request.method === "OPTIONS") {
      sendJson(response, 204, {});
      return;
    }

    if (request.method === "GET" && request.url?.startsWith("/api/entitlement/check")) {
      const url = new URL(request.url, "http://127.0.0.1");
      const store = await readStore();
      sendJson(response, 200, checkEntitlement({ license_key: url.searchParams.get("license_key"), store }));
      return;
    }

    if (request.method === "POST" && request.url === "/api/entitlement/check") {
      const body = JSON.parse(await readBody(request));
      const store = await readStore();
      sendJson(response, 200, checkEntitlement({ license_key: body.license_key, store }));
      return;
    }

    if (request.method === "POST" && request.url === "/api/stripe/checkout-session") {
      const body = JSON.parse(await readBody(request));
      const session = await createCheckoutSession({
        plan: body.plan,
        license_key: body.license_key,
        env: process.env,
        fetchImpl: globalThis.fetch
      });
      sendJson(response, 200, session);
      return;
    }

    if (request.method === "POST" && request.url === "/api/stripe/webhook") {
      const rawBody = await readBody(request);
      if (process.env.STRIPE_WEBHOOK_SECRET) {
        verifyStripeSignature({
          rawBody,
          signatureHeader: request.headers["stripe-signature"],
          webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
        });
      }
      const event = JSON.parse(rawBody);
      const store = await readStore();
      const entitlement = applyStripeEvent({
        event,
        store,
        pricePlanMap: readPricePlanMap()
      });
      await writeStore(store);
      sendJson(response, 200, { received: true, entitlement });
      return;
    }

    sendJson(response, 404, { error: "not_found" });
  } catch (error) {
    sendJson(response, 400, { error: error.message });
  }
});

server.listen(port, () => {
  console.log(`entitlement API listening on http://127.0.0.1:${port}`);
});

async function readStore() {
  try {
    return JSON.parse(await fs.readFile(storePath, "utf8"));
  } catch {
    return {};
  }
}

async function writeStore(store) {
  await fs.mkdir(path.dirname(storePath), { recursive: true });
  await fs.writeFile(storePath, `${JSON.stringify(store, null, 2)}\n`);
}

function readPricePlanMap() {
  try {
    return JSON.parse(process.env.STRIPE_PRICE_PLAN_MAP || "{}");
  } catch {
    return {};
  }
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 200_000) {
        request.destroy();
        reject(new Error("body_too_large"));
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function sendJson(response, status, data) {
  response.writeHead(status, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type, stripe-signature"
  });
  if (status === 204) {
    response.end();
    return;
  }
  response.end(JSON.stringify(data));
}
