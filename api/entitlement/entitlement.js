import crypto from "node:crypto";

export const PLAN_LIMITS = {
  free: { monthly_fills: 5, multiple_profiles: false, learned_mappings: "local_basic" },
  plus: { monthly_fills: Infinity, multiple_profiles: true, learned_mappings: "local" },
  pro: { monthly_fills: Infinity, multiple_profiles: true, learned_mappings: "local_plus_company" },
  team: { monthly_fills: Infinity, multiple_profiles: true, learned_mappings: "team_shared" }
};

export async function createCheckoutSession({
  plan,
  license_key = generateLicenseKey(),
  env = {},
  fetchImpl = globalThis.fetch
} = {}) {
  const normalizedPlan = normalizePaidPlan(plan);
  const secretKey = env.STRIPE_SECRET_KEY;
  const priceId = getStripePriceIdForPlan(normalizedPlan, env);
  const publicSiteUrl = normalizePublicSiteUrl(env.PUBLIC_SITE_URL || env.NEXT_PUBLIC_SITE_URL);

  if (!secretKey) throw new Error("stripe_secret_key_missing");
  if (!priceId) throw new Error(`stripe_price_id_missing:${normalizedPlan}`);
  if (!publicSiteUrl) throw new Error("public_site_url_missing");

  const successUrl = `${publicSiteUrl}/success.html?checkout=success&license_key=${encodeURIComponent(license_key)}&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${publicSiteUrl}/?checkout=cancelled&plan=${encodeURIComponent(normalizedPlan)}`;
  const body = new URLSearchParams();
  body.set("mode", "subscription");
  body.set("line_items[0][price]", priceId);
  body.set("line_items[0][quantity]", "1");
  body.set("client_reference_id", license_key);
  body.set("success_url", successUrl);
  body.set("cancel_url", cancelUrl);
  body.set("allow_promotion_codes", "true");
  body.set("metadata[license_key]", license_key);
  body.set("metadata[plan]", normalizedPlan);
  body.set("metadata[price_id]", priceId);
  body.set("subscription_data[metadata][license_key]", license_key);
  body.set("subscription_data[metadata][plan]", normalizedPlan);
  body.set("subscription_data[metadata][price_id]", priceId);

  const response = await fetchImpl("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      "authorization": `Bearer ${secretKey}`,
      "content-type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    const text = response.text ? await response.text() : "";
    throw new Error(`stripe_checkout_http_${response.status}:${text.slice(0, 240)}`);
  }

  const session = await response.json();
  return {
    id: session.id,
    url: session.url,
    plan: normalizedPlan,
    license_key
  };
}

export function createEntitlement({ license_key, plan = "free", status = "active", customer_id = null, current_period_end = null }) {
  const normalizedPlan = normalizePlan(plan);
  return {
    license_key,
    customer_id,
    plan: normalizedPlan,
    status,
    active: isActiveStatus(status),
    current_period_end,
    limits: serializeLimits(PLAN_LIMITS[normalizedPlan])
  };
}

export function checkEntitlement({ license_key, store = {} }) {
  if (!license_key) return createEntitlement({ license_key: null, plan: "free", status: "missing" });
  const record = store[license_key];
  if (!record) return createEntitlement({ license_key, plan: "free", status: "not_found" });
  return createEntitlement(record);
}

export function normalizeEntitlementResponse(entitlement = {}) {
  if (!entitlement || typeof entitlement !== "object") return entitlement;
  const normalizedPlan = normalizePlan(entitlement.plan || "free");
  if (normalizedPlan !== "free") return entitlement;

  const localFree = createEntitlement({
    license_key: entitlement.license_key || null,
    plan: "free",
    status: entitlement.status || "not_found",
    customer_id: entitlement.customer_id || null,
    current_period_end: entitlement.current_period_end || null
  });
  return {
    ...entitlement,
    plan: "free",
    limits: localFree.limits
  };
}

export function applyStripeEvent({ event, store = {}, pricePlanMap = {} }) {
  const type = event?.type || "";
  const object = event?.data?.object || {};
  const metadata = object.metadata || {};
  const license_key = metadata.license_key || object.client_reference_id || object.customer;
  if (!license_key) throw new Error("license_key_missing");

  if (type === "checkout.session.completed" || type === "customer.subscription.created" || type === "customer.subscription.updated") {
    const priceId = object?.line_items?.data?.[0]?.price?.id
      || object?.items?.data?.[0]?.price?.id
      || metadata.price_id;
    const plan = normalizePlan(metadata.plan || pricePlanMap[priceId] || "plus");
    store[license_key] = {
      license_key,
      customer_id: object.customer || store[license_key]?.customer_id || null,
      plan,
      status: object.status === "canceled" ? "canceled" : "active",
      current_period_end: object.current_period_end || null
    };
    return createEntitlement(store[license_key]);
  }

  if (type === "customer.subscription.deleted") {
    store[license_key] = {
      ...(store[license_key] || { license_key }),
      plan: "free",
      status: "canceled"
    };
    return createEntitlement(store[license_key]);
  }

  return checkEntitlement({ license_key, store });
}

export function verifyStripeSignature({ rawBody, signatureHeader, webhookSecret, toleranceSeconds = 300, now = Date.now() }) {
  if (!webhookSecret) throw new Error("webhook_secret_missing");
  if (!signatureHeader) throw new Error("stripe_signature_missing");

  const parts = Object.fromEntries(signatureHeader.split(",").map((part) => {
    const [key, value] = part.split("=");
    return [key, value];
  }));
  const timestamp = Number(parts.t);
  const signature = parts.v1;
  if (!timestamp || !signature) throw new Error("stripe_signature_invalid");

  if (Math.abs(Math.floor(now / 1000) - timestamp) > toleranceSeconds) {
    throw new Error("stripe_signature_expired");
  }

  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  if (!timingSafeEqual(signature, expected)) throw new Error("stripe_signature_mismatch");
  return true;
}

export function normalizePlan(plan) {
  return PLAN_LIMITS[plan] ? plan : "free";
}

export function generateLicenseKey() {
  return `afa_${crypto.randomUUID().replace(/-/g, "")}`;
}

export function getStripePriceIdForPlan(plan, env = {}) {
  const normalizedPlan = normalizePaidPlan(plan);
  const map = readPlanPriceMap(env.STRIPE_PLAN_PRICE_MAP);
  return map[normalizedPlan]
    || env[`STRIPE_PRICE_ID_${normalizedPlan.toUpperCase()}`]
    || "";
}

export function normalizePaidPlan(plan) {
  const normalized = normalizePlan(plan);
  if (normalized === "free") throw new Error("paid_plan_required");
  return normalized;
}

function isActiveStatus(status) {
  return ["active", "trialing", "paid"].includes(status);
}

function serializeLimits(limits) {
  return {
    ...limits,
    monthly_fills: limits.monthly_fills === Infinity ? "unlimited" : limits.monthly_fills
  };
}

function timingSafeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function readPlanPriceMap(value) {
  try {
    return JSON.parse(value || "{}");
  } catch {
    return {};
  }
}

function normalizePublicSiteUrl(value = "") {
  return String(value).replace(/\/+$/, "");
}
