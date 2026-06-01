import { createEntitlement, normalizePlan } from "./entitlement.js";

export async function checkStripeEntitlement({
  license_key,
  env = {},
  fetchImpl = globalThis.fetch
} = {}) {
  if (!license_key) return createEntitlement({ license_key: null, plan: "free", status: "missing" });
  if (!env.STRIPE_SECRET_KEY) return createEntitlement({ license_key, plan: "free", status: "stripe_secret_missing" });

  const query = `metadata['license_key']:'${escapeStripeSearchValue(license_key)}'`;
  const url = new URL("https://api.stripe.com/v1/subscriptions/search");
  url.searchParams.set("query", query);
  url.searchParams.set("limit", "1");

  const response = await fetchImpl(url.toString(), {
    method: "GET",
    headers: { "authorization": `Bearer ${env.STRIPE_SECRET_KEY}` }
  });

  if (!response.ok) {
    const text = response.text ? await response.text() : "";
    throw new Error(`stripe_subscription_search_http_${response.status}:${text.slice(0, 240)}`);
  }

  const data = await response.json();
  const subscription = data?.data?.[0];
  if (!subscription) return createEntitlement({ license_key, plan: "free", status: "not_found" });

  const status = subscription.status || "unknown";
  const priceId = subscription.items?.data?.[0]?.price?.id || subscription.metadata?.price_id || "";
  const pricePlanMap = readPricePlanMap(env.STRIPE_PRICE_PLAN_MAP);
  const plan = normalizePlan(subscription.metadata?.plan || pricePlanMap[priceId] || "plus");

  return createEntitlement({
    license_key,
    customer_id: subscription.customer || null,
    plan,
    status,
    current_period_end: subscription.current_period_end || null
  });
}

function readPricePlanMap(value) {
  try {
    return JSON.parse(value || "{}");
  } catch {
    return {};
  }
}

function escapeStripeSearchValue(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}
