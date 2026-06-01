import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { SAMPLE_PROFILE } from "../extension/src/profile-formatters.js";
import { buildMemoryContext, createVaultState } from "../extension/src/profile-memory.js";
import { buildSchemaInferencePayload } from "../extension/src/ai-payload.js";
import {
  buildSchemaPrompt,
  inferSchemaWithProxy,
  parseProviderResponse,
  validateSchemaPayload
} from "../api/schema-proxy/schema-proxy.js";
import {
  applyStripeEvent,
  checkEntitlement,
  createCheckoutSession,
  verifyStripeSignature
} from "../api/entitlement/entitlement.js";
import { checkStripeEntitlement } from "../api/entitlement/stripe-source.js";
import { fetchEntitlement } from "../extension/src/entitlement-client.js";

test("schema proxy rejects unsafe field payloads and accepts safe memory context", async () => {
  const fields = [{ field_id: "field_001", tag: "input", type: "text", label: "姓", visible: true }];
  const vaultState = createVaultState({ profile: SAMPLE_PROFILE, now: new Date("2026-06-01T00:00:00+09:00") });
  const memoryContext = buildMemoryContext({ vaultState, url: "https://example.com/signup", fields });
  const payload = buildSchemaInferencePayload({ fields, memoryContext });

  assert.doesNotThrow(() => validateSchemaPayload(payload));
  assert.throws(() => validateSchemaPayload({ ...payload, fields: [{ ...fields[0], value: "山田" }] }), /unsafe_field_key:value/);
  assert.match(buildSchemaPrompt(payload), /Return strict JSON only/);
  assert.match(buildSchemaPrompt(payload), /DD_CORE_PROMPT/);
  assert.match(buildSchemaPrompt(payload), /Personal Vault \+ Profile RAG\/Memory Space/);
  assert.match(buildSchemaPrompt(payload), /locale_context/);

  const result = await inferSchemaWithProxy({
    payload,
    env: { AFA_SCHEMA_PROXY_MODE: "mock" },
    date: new Date("2026-06-06T12:00:00+09:00")
  });
  assert.equal(result.provider_id, "azure_deepseek_v4");
  assert.equal(result.mappings.field_001.semantic_key, null);
});

test("Stripe Checkout session is created server-side for paid plans", async () => {
  const session = await createCheckoutSession({
    plan: "plus",
    license_key: "afa_test_license",
    env: {
      STRIPE_SECRET_KEY: "sk_test_123",
      STRIPE_PRICE_ID_PLUS: "price_plus_123",
      PUBLIC_SITE_URL: "https://pay.example.test"
    },
    fetchImpl: async (url, request) => {
      assert.equal(url, "https://api.stripe.com/v1/checkout/sessions");
      assert.equal(request.method, "POST");
      assert.equal(request.headers.authorization, "Bearer sk_test_123");
      const body = request.body;
      assert.equal(body.get("mode"), "subscription");
      assert.equal(body.get("line_items[0][price]"), "price_plus_123");
      assert.equal(body.get("client_reference_id"), "afa_test_license");
      assert.equal(body.get("metadata[plan]"), "plus");
      assert.match(body.get("success_url"), /success\.html/);
      return {
        ok: true,
        json: async () => ({ id: "cs_test_123", url: "https://checkout.stripe.test/session" })
      };
    }
  });

  assert.equal(session.id, "cs_test_123");
  assert.equal(session.url, "https://checkout.stripe.test/session");
  assert.equal(session.license_key, "afa_test_license");
});

test("schema proxy normalizes Azure and Cloudflare style responses", () => {
  assert.deepEqual(
    parseProviderResponse({
      choices: [{ message: { content: "{\"field_001\":{\"semantic_key\":\"person.name.last\",\"confidence\":0.97}}" } }]
    }).field_001,
    { semantic_key: "person.name.last", confidence: 0.97, reason: "" }
  );

  assert.equal(
    parseProviderResponse({
      result: { response: "{\"field_002\":{\"semantic_key\":\"person.email.primary\",\"confidence\":2}}" }
    }).field_002.confidence,
    1
  );
});

test("schema proxy falls back to local rules when live provider env is missing", async () => {
  const result = await inferSchemaWithProxy({
    payload: {
      task: "form_schema_mapping",
      fields: [
        { field_id: "field_001", tag: "input", type: "email", label: "メールアドレス", name: "email" }
      ]
    },
    env: {},
    date: new Date("2026-06-01T12:00:00+09:00")
  });

  assert.equal(result.provider_id, "azure_deepseek_v4");
  assert.equal(result.mode, "rules_fallback");
  assert.equal(result.mappings.field_001.semantic_key, "person.email.primary");
});

test("entitlement API applies Stripe events and checks plan limits", () => {
  const store = {};
  const entitlement = applyStripeEvent({
    store,
    pricePlanMap: { price_plus: "plus" },
    event: {
      type: "checkout.session.completed",
      data: {
        object: {
          customer: "cus_123",
          client_reference_id: "lic_abc",
          metadata: { price_id: "price_plus" },
          status: "complete"
        }
      }
    }
  });

  assert.equal(entitlement.plan, "plus");
  assert.equal(entitlement.active, true);
  assert.equal(checkEntitlement({ license_key: "lic_abc", store }).limits.monthly_fills, "unlimited");
  assert.equal(checkEntitlement({ license_key: "missing", store }).plan, "free");
});

test("Stripe webhook signature verification uses signed raw body", () => {
  const rawBody = JSON.stringify({ id: "evt_123" });
  const timestamp = 1_800_000_000;
  const secret = "whsec_test";
  const signature = crypto.createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");

  assert.equal(
    verifyStripeSignature({
      rawBody,
      signatureHeader: `t=${timestamp},v1=${signature}`,
      webhookSecret: secret,
      now: timestamp * 1000
    }),
    true
  );
});

test("extension entitlement client stores only normalized active plan", async () => {
  const entitlement = await fetchEntitlement({
    licenseKey: "lic_abc",
    apiUrl: "https://billing.example.test/check",
    fetchImpl: async (_url, request) => {
      assert.equal(JSON.parse(request.body).license_key, "lic_abc");
      return {
        ok: true,
        json: async () => ({ plan: "pro", status: "active", active: true, license_key: "lic_abc" })
      };
    }
  });

  assert.equal(entitlement.plan, "pro");
  assert.equal(entitlement.active, true);
});

test("Stripe subscription metadata can be used as entitlement source", async () => {
  const entitlement = await checkStripeEntitlement({
    license_key: "afa_meta",
    env: {
      STRIPE_SECRET_KEY: "sk_test_meta",
      STRIPE_PRICE_PLAN_MAP: JSON.stringify({ price_team: "team" })
    },
    fetchImpl: async (url, request) => {
      assert.match(url, /subscriptions\/search/);
      assert.match(decodeURIComponent(url), /metadata\['license_key'\]:'afa_meta'/);
      assert.equal(request.headers.authorization, "Bearer sk_test_meta");
      return {
        ok: true,
        json: async () => ({
          data: [{
            customer: "cus_meta",
            status: "active",
            current_period_end: 1800000000,
            metadata: { license_key: "afa_meta" },
            items: { data: [{ price: { id: "price_team" } }] }
          }]
        })
      };
    }
  });

  assert.equal(entitlement.plan, "team");
  assert.equal(entitlement.active, true);
  assert.equal(entitlement.limits.monthly_fills, "unlimited");
});
