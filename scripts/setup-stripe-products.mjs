const PLANS = [
  { plan: "plus", name: "AIフォームオートフィル Plus", unit_amount: 580 },
  { plan: "pro", name: "AIフォームオートフィル Pro", unit_amount: 1480 },
  { plan: "team", name: "AIフォームオートフィル Team", unit_amount: 1500 }
];

const secretKey = process.env.STRIPE_SECRET_KEY;
const dryRun = process.env.DRY_RUN === "1" || !secretKey;
const webhookUrl = process.env.STRIPE_WEBHOOK_URL || "";

if (dryRun) {
  console.log(JSON.stringify({
    dry_run: true,
    reason: secretKey ? "DRY_RUN=1" : "STRIPE_SECRET_KEY missing",
    product: "AIフォームオートフィル",
    currency: "jpy",
    recurring_interval: "month",
    plans: PLANS,
    webhook_url: webhookUrl || null
  }, null, 2));
  process.exit(0);
}

const product = await stripePost("/v1/products", {
  name: "AIフォームオートフィル",
  description: "Japanese form autofill extension with local Profile Vault and learned site mappings.",
  "metadata[app]": "ai-form-autofill"
});

const prices = {};
for (const entry of PLANS) {
  const price = await stripePost("/v1/prices", {
    product: product.id,
    currency: "jpy",
    unit_amount: String(entry.unit_amount),
    "recurring[interval]": "month",
    nickname: entry.name,
    "metadata[plan]": entry.plan,
    "metadata[app]": "ai-form-autofill"
  });
  prices[entry.plan] = price.id;
}

let webhook = null;
if (webhookUrl) {
  webhook = await stripePost("/v1/webhook_endpoints", {
    url: webhookUrl,
    "enabled_events[]": [
      "checkout.session.completed",
      "customer.subscription.created",
      "customer.subscription.updated",
      "customer.subscription.deleted"
    ],
    "metadata[app]": "ai-form-autofill"
  });
}

console.log(JSON.stringify({
  dry_run: false,
  product_id: product.id,
  stripe_plan_price_map: prices,
  stripe_price_plan_map: Object.fromEntries(Object.entries(prices).map(([plan, priceId]) => [priceId, plan])),
  webhook_endpoint_id: webhook?.id || null,
  webhook_secret_returned: Boolean(webhook?.secret),
  env_to_set: {
    STRIPE_PRICE_ID_PLUS: prices.plus,
    STRIPE_PRICE_ID_PRO: prices.pro,
    STRIPE_PRICE_ID_TEAM: prices.team,
    STRIPE_PLAN_PRICE_MAP: JSON.stringify(prices),
    STRIPE_PRICE_PLAN_MAP: JSON.stringify(Object.fromEntries(Object.entries(prices).map(([plan, priceId]) => [priceId, plan])))
  }
}, null, 2));

async function stripePost(path, values) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (Array.isArray(value)) {
      for (const item of value) body.append(key, item);
    } else if (value !== undefined && value !== null && value !== "") {
      body.set(key, value);
    }
  }

  const response = await fetch(`https://api.stripe.com${path}`, {
    method: "POST",
    headers: {
      "authorization": `Bearer ${secretKey}`,
      "content-type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`stripe_${path}_failed_${response.status}:${text.slice(0, 500)}`);
  }
  return response.json();
}
