import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { handleWorkerRequest } from "../api/worker/worker.mjs";

test("worker health exposes deploy bindings", async () => {
  const response = await handleWorkerRequest(new Request("https://app.example.test/api/health"), {
    DB: createMockD1(),
    AI: { run: async () => ({ response: "{}" }) },
    ASSETS: { fetch: async () => new Response("asset") }
  });
  assert.equal(response.status, 200);
  const json = await response.json();
  assert.equal(json.ok, true);
  assert.equal(json.db, true);
  assert.equal(json.ai_binding, true);
  assert.equal(json.assets, true);
});

test("worker schema route accepts safe payloads in mock mode", async () => {
  const payload = {
    task: "form_schema_mapping",
    fields: [{ field_id: "field_001", tag: "input", type: "text", label: "姓" }]
  };
  const response = await handleWorkerRequest(new Request("https://app.example.test/api/schema/infer", {
    method: "POST",
    body: JSON.stringify(payload)
  }), { AFA_SCHEMA_PROXY_MODE: "mock" });
  assert.equal(response.status, 200);
  const json = await response.json();
  assert.equal(json.provider_id, "azure_deepseek_v4");
  assert.equal(json.mappings.field_001.semantic_key, null);
});

test("worker entitlement route reads D1 records", async () => {
  const DB = createMockD1();
  DB.rows.set("afa_plus", {
    license_key: "afa_plus",
    customer_id: "cus_123",
    plan: "plus",
    status: "active",
    current_period_end: "1800000000"
  });

  const response = await handleWorkerRequest(new Request("https://app.example.test/api/entitlement/check?license_key=afa_plus"), { DB });
  assert.equal(response.status, 200);
  const json = await response.json();
  assert.equal(json.plan, "plus");
  assert.equal(json.active, true);
  assert.equal(json.limits.monthly_fills, "unlimited");
});

test("worker checkout route creates Stripe sessions", async () => {
  const response = await handleWorkerRequest(new Request("https://app.example.test/api/stripe/checkout-session", {
    method: "POST",
    body: JSON.stringify({ plan: "pro", license_key: "afa_checkout" })
  }), {
    STRIPE_SECRET_KEY: "sk_test_worker",
    STRIPE_PRICE_ID_PRO: "price_pro",
    PUBLIC_SITE_URL: "https://app.example.test",
    fetchImpl: async (url, request) => {
      assert.equal(url, "https://api.stripe.com/v1/checkout/sessions");
      assert.equal(request.body.get("line_items[0][price]"), "price_pro");
      return {
        ok: true,
        json: async () => ({ id: "cs_worker", url: "https://checkout.stripe.test/cs_worker" })
      };
    }
  });
  assert.equal(response.status, 200);
  const json = await response.json();
  assert.equal(json.url, "https://checkout.stripe.test/cs_worker");
  assert.equal(json.plan, "pro");
});

test("worker checkout and entitlement can proxy to the production Stripe bridge", async () => {
  const calls = [];
  const fetchImpl = async (url, request = {}) => {
    calls.push({ url, method: request.method || "GET", body: request.body || "" });
    if (url === "https://bridge.example.test/checkout") {
      assert.equal(request.method, "POST");
      assert.deepEqual(JSON.parse(request.body), { plan: "plus", license_key: "afa_bridge" });
      return {
        ok: true,
        json: async () => ({ id: "cs_bridge", url: "https://checkout.stripe.test/cs_bridge" })
      };
    }
    if (url === "https://bridge.example.test/entitlement?license_key=afa_bridge") {
      return {
        ok: true,
        json: async () => ({ license_key: "afa_bridge", plan: "plus", active: true })
      };
    }
    if (url === "https://bridge.example.test/entitlement?license_key=afa_free") {
      return {
        ok: true,
        json: async () => ({ license_key: "afa_free", plan: "free", active: false, limits: { monthly_fills: 5 } })
      };
    }
    throw new Error(`unexpected_bridge_url:${url}`);
  };

  const env = {
    FORMPILOT_STRIPE_BRIDGE_BASE_URL: "https://bridge.example.test/",
    fetchImpl
  };
  const checkout = await handleWorkerRequest(new Request("https://app.example.test/api/stripe/checkout-session", {
    method: "POST",
    body: JSON.stringify({ plan: "plus", license_key: "afa_bridge" })
  }), env);
  assert.equal(checkout.status, 200);
  assert.equal((await checkout.json()).id, "cs_bridge");

  const entitlement = await handleWorkerRequest(new Request("https://app.example.test/api/entitlement/check?license_key=afa_bridge"), env);
  assert.equal(entitlement.status, 200);
  assert.equal((await entitlement.json()).plan, "plus");

  const freeEntitlement = await handleWorkerRequest(new Request("https://app.example.test/api/entitlement/check?license_key=afa_free"), env);
  assert.equal(freeEntitlement.status, 200);
  const freeJson = await freeEntitlement.json();
  assert.equal(freeJson.plan, "free");
  assert.equal(freeJson.limits.monthly_fills, 5);
  assert.equal(calls.length, 3);
});

test("worker Stripe webhook verifies raw body and persists entitlement", async () => {
  const DB = createMockD1();
  const rawBody = JSON.stringify({
    type: "checkout.session.completed",
    data: {
      object: {
        customer: "cus_123",
        client_reference_id: "afa_webhook",
        metadata: { plan: "team", price_id: "price_team", license_key: "afa_webhook" },
        status: "complete"
      }
    }
  });
  const timestamp = 1_800_000_000;
  const secret = "whsec_worker";
  const signature = crypto.createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");

  const originalDateNow = Date.now;
  Date.now = () => timestamp * 1000;
  try {
    const response = await handleWorkerRequest(new Request("https://app.example.test/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": `t=${timestamp},v1=${signature}` },
      body: rawBody
    }), {
      DB,
      STRIPE_WEBHOOK_SECRET: secret,
      STRIPE_PRICE_PLAN_MAP: JSON.stringify({ price_team: "team" })
    });

    assert.equal(response.status, 200);
    assert.equal(DB.rows.get("afa_webhook").plan, "team");
    assert.equal(DB.rows.get("afa_webhook").status, "active");
  } finally {
    Date.now = originalDateNow;
  }
});

function createMockD1() {
  const rows = new Map();
  return {
    rows,
    prepare(sql) {
      return {
        values: [],
        bind(...values) {
          this.values = values;
          return this;
        },
        async first() {
          if (/SELECT/i.test(sql)) return rows.get(this.values[0]) || null;
          return null;
        },
        async run() {
          if (/INSERT INTO entitlements/i.test(sql)) {
            const [license_key, customer_id, plan, status, current_period_end] = this.values;
            rows.set(license_key, { license_key, customer_id, plan, status, current_period_end });
          }
          return { success: true };
        }
      };
    }
  };
}
