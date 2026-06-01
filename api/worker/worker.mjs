import { inferSchemaWithProxy } from "../schema-proxy/schema-proxy.js";
import {
  applyStripeEvent,
  checkEntitlement,
  createCheckoutSession,
  verifyStripeSignature
} from "../entitlement/entitlement.js";
import { checkStripeEntitlement } from "../entitlement/stripe-source.js";

export default {
  fetch(request, env, ctx) {
    return handleWorkerRequest(request, env, ctx);
  }
};

export async function handleWorkerRequest(request, env = {}, _ctx = null) {
  try {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") return json({}, { status: 204 });
    if (url.pathname === "/api/health") {
      return json({
        ok: true,
        service: "ai-form-autofill",
        db: Boolean(env.DB),
        ai_binding: Boolean(env.AI?.run),
        assets: Boolean(env.ASSETS)
      });
    }

    if (request.method === "POST" && url.pathname === "/api/schema/infer") {
      const payload = await request.json();
      const result = await inferSchemaWithProxy({
        payload,
        env,
        fetchImpl: env.fetchImpl || fetch,
        date: new Date()
      });
      return json(result);
    }

    if (request.method === "GET" && url.pathname === "/api/entitlement/check") {
      const licenseKey = url.searchParams.get("license_key");
      const bridgeBaseUrl = normalizeBridgeBaseUrl(env.FORMPILOT_STRIPE_BRIDGE_BASE_URL);
      if (bridgeBaseUrl) {
        const bridgeUrl = new URL(`${bridgeBaseUrl}/entitlement`);
        bridgeUrl.searchParams.set("license_key", licenseKey || "");
        return json(await proxyJson({ url: bridgeUrl.toString(), fetchImpl: env.fetchImpl || fetch }));
      }
      return json(await checkLicenseWithDb({ licenseKey, env }));
    }

    if (request.method === "POST" && url.pathname === "/api/entitlement/check") {
      const body = await request.json();
      const bridgeBaseUrl = normalizeBridgeBaseUrl(env.FORMPILOT_STRIPE_BRIDGE_BASE_URL);
      if (bridgeBaseUrl) {
        const bridgeUrl = new URL(`${bridgeBaseUrl}/entitlement`);
        bridgeUrl.searchParams.set("license_key", body.license_key || "");
        return json(await proxyJson({ url: bridgeUrl.toString(), fetchImpl: env.fetchImpl || fetch }));
      }
      return json(await checkLicenseWithDb({ licenseKey: body.license_key, env }));
    }

    if (request.method === "POST" && url.pathname === "/api/stripe/checkout-session") {
      const body = await request.json();
      const bridgeBaseUrl = normalizeBridgeBaseUrl(env.FORMPILOT_STRIPE_BRIDGE_BASE_URL);
      if (bridgeBaseUrl) {
        return json(await proxyJson({
          url: `${bridgeBaseUrl}/checkout`,
          method: "POST",
          body,
          fetchImpl: env.fetchImpl || fetch
        }));
      }
      const session = await createCheckoutSession({
        plan: body.plan,
        license_key: body.license_key,
        env,
        fetchImpl: env.fetchImpl || fetch
      });
      return json(session);
    }

    if (request.method === "POST" && url.pathname === "/api/stripe/webhook") {
      const rawBody = await request.text();
      if (env.STRIPE_WEBHOOK_SECRET) {
        verifyStripeSignature({
          rawBody,
          signatureHeader: request.headers.get("stripe-signature"),
          webhookSecret: env.STRIPE_WEBHOOK_SECRET
        });
      }
      const event = JSON.parse(rawBody);
      const licenseKey = extractLicenseKeyFromStripeEvent(event);
      const store = await readStoreForLicense({ env, licenseKey });
      const entitlement = applyStripeEvent({
        event,
        store,
        pricePlanMap: readPricePlanMap(env.STRIPE_PRICE_PLAN_MAP)
      });
      await upsertEntitlement({ env, entitlement });
      return json({ received: true, entitlement });
    }

    if (env.ASSETS?.fetch) return env.ASSETS.fetch(request);
    return json({ error: "not_found" }, { status: 404 });
  } catch (error) {
    return json({ error: error.message }, { status: 400 });
  }
}

async function checkLicenseWithDb({ licenseKey, env }) {
  if (env.ENTITLEMENT_SOURCE === "stripe") {
    return checkStripeEntitlement({ license_key: licenseKey, env, fetchImpl: env.fetchImpl || fetch });
  }

  const store = await readStoreForLicense({ env, licenseKey });
  return checkEntitlement({ license_key: licenseKey, store });
}

async function readStoreForLicense({ env, licenseKey }) {
  if (!licenseKey || !env.DB) return {};
  const row = await env.DB
    .prepare("SELECT license_key, customer_id, plan, status, current_period_end FROM entitlements WHERE license_key = ?")
    .bind(licenseKey)
    .first();
  if (!row) return {};
  return {
    [licenseKey]: {
      license_key: row.license_key,
      customer_id: row.customer_id || null,
      plan: row.plan,
      status: row.status,
      current_period_end: row.current_period_end || null
    }
  };
}

async function upsertEntitlement({ env, entitlement }) {
  if (!env.DB || !entitlement?.license_key) return;
  await env.DB
    .prepare(`
      INSERT INTO entitlements (license_key, customer_id, plan, status, current_period_end, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(license_key) DO UPDATE SET
        customer_id = excluded.customer_id,
        plan = excluded.plan,
        status = excluded.status,
        current_period_end = excluded.current_period_end,
        updated_at = excluded.updated_at
    `)
    .bind(
      entitlement.license_key,
      entitlement.customer_id || null,
      entitlement.plan,
      entitlement.status,
      entitlement.current_period_end || null,
      new Date().toISOString()
    )
    .run();
}

function extractLicenseKeyFromStripeEvent(event) {
  const object = event?.data?.object || {};
  return object?.metadata?.license_key
    || object?.client_reference_id
    || object?.subscription_details?.metadata?.license_key
    || object?.customer
    || "";
}

function readPricePlanMap(value) {
  try {
    return JSON.parse(value || "{}");
  } catch {
    return {};
  }
}

async function proxyJson({ url, method = "GET", body = null, fetchImpl = fetch }) {
  const upstream = await fetchImpl(url, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await readJson(upstream);
  if (!upstream.ok) {
    return { error: payload.error || `bridge_http_${upstream.status}` };
  }
  return payload;
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function normalizeBridgeBaseUrl(value = "") {
  return String(value).trim().replace(/\/+$/, "");
}

function json(data, init = {}) {
  const status = init.status || 200;
  const headers = new Headers(init.headers || {});
  headers.set("access-control-allow-origin", "*");
  headers.set("access-control-allow-methods", "GET, POST, OPTIONS");
  headers.set("access-control-allow-headers", "content-type, authorization, stripe-signature");
  if (status === 204) return new Response(null, { status, headers });
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), { status, headers });
}
