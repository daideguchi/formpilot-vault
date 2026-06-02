import { getProviderForDate } from "../../extension/src/provider-router.js";
import { SEMANTIC_LABELS, buildSchema } from "../../extension/src/schema-engine.js";

const FORBIDDEN_FIELD_KEYS = new Set(["value", "checked", "selected", "selector", "cssPath", "xpath"]);

export async function inferSchemaWithProxy({
  payload,
  env = {},
  fetchImpl = globalThis.fetch,
  date = new Date()
} = {}) {
  validateSchemaPayload(payload);

  const provider = getProviderForDate(date, {
    overrideId: env.AFA_SCHEMA_PROVIDER_ID || env.AFA_SCHEMA_PROVIDER_OVERRIDE || ""
  });
  if (env.AFA_SCHEMA_PROXY_MODE === "mock") {
    return {
      provider_id: provider.id,
      mode: "mock",
      mappings: mockMappings(payload)
    };
  }

  if (provider.id === "azure_deepseek_v4") {
    return callWithRulesFallback({
      provider,
      payload,
      mode: "live",
      env,
      fetchImpl,
      call: () => callAzureDeepSeek({ payload, env, fetchImpl })
    });
  }

  return callWithRulesFallback({
    provider,
    payload,
    mode: "live",
    env,
    fetchImpl,
    call: () => callCloudflareWorkersAI({ payload, provider, env, fetchImpl })
  });
}

export function validateSchemaPayload(payload) {
  if (!payload || typeof payload !== "object") throw new Error("payload_required");
  if (payload.task !== "form_schema_mapping") throw new Error("invalid_task");
  if (!Array.isArray(payload.fields)) throw new Error("fields_required");

  for (const field of payload.fields) {
    if (!field?.field_id) throw new Error("field_id_required");
    for (const key of Object.keys(field)) {
      if (FORBIDDEN_FIELD_KEYS.has(key)) {
        throw new Error(`unsafe_field_key:${key}`);
      }
    }
  }

  const dump = JSON.stringify(payload);
  if (/password_value|cookie|authorization|bearer\s+/i.test(dump)) {
    throw new Error("unsafe_secret_like_payload");
  }
}

export function buildSchemaPrompt(payload) {
  return [
    "Product core rules:",
    "This product exists to remove the tiny repeated work of filling forms.",
    "The core value is Personal Vault + Profile RAG/Memory Space + form understanding.",
    "Use memory to select profile semantic keys, not personal values.",
    "Treat language and locale as first-class product behavior: use locale_context, page language, text direction, TLD hints, labels, placeholders, and options to understand forms from global markets.",
    "Locale context is a hint, not proof. Prefer explicit labels, autocomplete, names, ids, options, and learned memory when they conflict.",
    "Be conservative: confident fields are mapped, uncertain fields remain for user review.",
    "Never automate submission, CAPTCHA, SMS verification, email verification, or mass account creation.",
    "",
    "You map web form fields to profile semantic keys.",
    "Return strict JSON only. Do not include personal values.",
    "Return a JSON object whose keys are only the provided field_id values.",
    "Allowed output shape:",
    "{\"field_001\":{\"semantic_key\":\"person.name.last\",\"confidence\":0.97,\"reason\":\"label means family name\"}}",
    "Use null semantic_key and low confidence when uncertain.",
    "",
    JSON.stringify({
      locale_context: payload.locale_context || {},
      fields: payload.fields,
      memory_context: payload.memory_context || {},
      allowed_semantic_keys: payload.allowed_semantic_keys || null
    })
  ].join("\n");
}

export async function callAzureDeepSeek({ payload, env, fetchImpl }) {
  const endpoint = env.AZURE_DEEPSEEK_ENDPOINT;
  const apiKey = env.AZURE_DEEPSEEK_API_KEY;
  if (!endpoint || !apiKey) throw new Error("azure_env_missing");

  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "api-key": apiKey
    },
    body: JSON.stringify({
      messages: [
        { role: "system", content: "You return JSON form schema mappings only." },
        { role: "user", content: buildSchemaPrompt(payload) }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    })
  });

  return parseProviderResponse(await readProviderJson(response));
}

export async function callCloudflareWorkersAI({ payload, provider, env, fetchImpl }) {
  const request = {
    messages: [
      { role: "system", content: "You return JSON form schema mappings only." },
      { role: "user", content: buildSchemaPrompt(payload) }
    ],
    temperature: 0.1,
    max_tokens: Number(env.AFA_SCHEMA_MAX_TOKENS || 384)
  };
  const modelCandidates = uniqueNonEmpty([
    env.CLOUDFLARE_WORKERS_AI_MODEL || provider.primary_model,
    env.CLOUDFLARE_WORKERS_AI_FALLBACK_MODEL || provider.fallback_model
  ]);
  const timeoutMs = Number(env.AFA_SCHEMA_PROVIDER_TIMEOUT_MS || 12_000);

  if (env.AI?.run) {
    return runCloudflareModels({
      modelCandidates,
      timeoutMs,
      callModel: async (model) => parseProviderResponse(await withTimeout(
        env.AI.run(model, request),
        timeoutMs,
        `cloudflare_ai_timeout:${model}`
      ))
    });
  }

  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) throw new Error("cloudflare_env_missing");

  return runCloudflareModels({
    modelCandidates,
    timeoutMs,
    callModel: async (model) => {
      const response = await withTimeout(fetchImpl(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`, {
        method: "POST",
        headers: {
          "authorization": `Bearer ${apiToken}`,
          "content-type": "application/json"
        },
        body: JSON.stringify(request)
      }), timeoutMs, `cloudflare_http_timeout:${model}`);
      return parseProviderResponse(await readProviderJson(response));
    }
  });
}

export function parseProviderResponse(json) {
  const content = json?.choices?.[0]?.message?.content
    || json?.result?.response
    || json?.result?.choices?.[0]?.message?.content
    || json?.response
    || json;

  if (typeof content === "object") return normalizeMapping(content);
  if (typeof content !== "string") throw new Error("provider_response_unreadable");

  const parsed = JSON.parse(extractJsonObject(content));
  return normalizeMapping(parsed);
}

function normalizeMapping(mapping) {
  return Object.fromEntries(
    Object.entries(mapping || {}).map(([fieldId, value]) => [
      fieldId,
      normalizeSingleMapping(value) || { semantic_key: null, confidence: 0, reason: "" }
    ])
  );
}

function mockMappings(payload) {
  return Object.fromEntries(
    payload.fields.map((field) => [
      field.field_id,
      {
        semantic_key: null,
        confidence: 0.2,
        reason: "mock mode"
      }
    ])
  );
}

async function callWithRulesFallback({ provider, payload, mode, env, fetchImpl, call }) {
  try {
    const providerMappings = await call();
    return {
      provider_id: provider.id,
      mode,
      mappings: mergeProviderMappingsWithRules(payload, providerMappings)
    };
  } catch (error) {
    const remoteFallback = await tryRemoteSchemaFallback({
      provider,
      payload,
      env,
      fetchImpl,
      primaryError: error
    });
    if (remoteFallback) return remoteFallback;
    if (env.AFA_SCHEMA_PROXY_REQUIRE_LIVE === "true") throw error;
    return {
      provider_id: provider.id,
      mode: "rules_fallback",
      provider_error: error instanceof Error ? error.message : String(error),
      mappings: ruleFallbackMappings(payload)
    };
  }
}

async function tryRemoteSchemaFallback({ provider, payload, env, fetchImpl, primaryError }) {
  const fallbackUrl = String(env.AFA_SCHEMA_LIVE_FALLBACK_URL || "").trim();
  if (!fallbackUrl) return null;

  try {
    const timeoutMs = Number(env.AFA_SCHEMA_PROVIDER_TIMEOUT_MS || 12_000);
    const response = await withTimeout(fetchImpl(fallbackUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    }), timeoutMs, "schema_live_fallback_timeout");

    if (!response?.ok) {
      const text = response?.text ? await response.text() : "";
      throw new Error(`schema_live_fallback_http_${response?.status || "unknown"}:${text.slice(0, 240)}`);
    }

    const remote = await response.json();
    if (!remote?.mappings || typeof remote.mappings !== "object") {
      throw new Error("schema_live_fallback_unreadable");
    }

    return {
      provider_id: remote.provider_id || "remote_schema_fallback",
      mode: remote.mode || "live",
      delegated_from_provider_id: provider.id,
      delegated_from_error: primaryError instanceof Error ? primaryError.message : String(primaryError),
      provider_error: remote.provider_error || null,
      mappings: mergeProviderMappingsWithRules(payload, remote.mappings)
    };
  } catch (fallbackError) {
    if (env.AFA_SCHEMA_PROXY_REQUIRE_LIVE === "true") throw fallbackError;
    return null;
  }
}

function ruleFallbackMappings(payload) {
  const schema = buildSchema(payload.fields, { memoryContext: payload.memory_context || null });
  return Object.fromEntries(
    Object.entries(schema).map(([fieldId, value]) => [
      fieldId,
      {
        semantic_key: value?.semantic_key || null,
        confidence: clampConfidence(value?.confidence),
        reason: value?.source ? `rules:${value.source}` : "rules:fallback"
      }
    ])
  );
}

function mergeProviderMappingsWithRules(payload, providerMappings) {
  const fallback = ruleFallbackMappings(payload);
  const merged = {};
  for (const field of payload.fields || []) {
    const fieldId = field.field_id;
    const ruleMapping = fallback[fieldId] || { semantic_key: null, confidence: 0, reason: "rules:missing" };
    const providerMapping = normalizeSingleMapping(providerMappings?.[fieldId]);
    if (!providerMapping) {
      merged[fieldId] = ruleMapping;
      continue;
    }

    if (ruleMapping.semantic_key && ruleMapping.confidence >= 0.9) {
      merged[fieldId] = ruleMapping;
      continue;
    }

    merged[fieldId] = providerMapping;
  }
  return merged;
}

function normalizeSingleMapping(value) {
  if (!value || typeof value !== "object") return null;
  const semanticKey = value.semantic_key || null;
  return {
    semantic_key: semanticKey && SEMANTIC_LABELS[semanticKey] ? semanticKey : null,
    confidence: clampConfidence(value.confidence),
    reason: value.reason ? String(value.reason).slice(0, 240) : ""
  };
}

async function runCloudflareModels({ modelCandidates, callModel }) {
  let lastError = null;
  for (const model of modelCandidates) {
    try {
      return await callModel(model);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("cloudflare_model_missing");
}

function uniqueNonEmpty(values) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function withTimeout(promise, timeoutMs, message) {
  const safeTimeout = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 12_000;
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), safeTimeout))
  ]);
}

async function readProviderJson(response) {
  if (!response?.ok) {
    const text = response?.text ? await response.text() : "";
    throw new Error(`provider_http_${response?.status || "unknown"}:${text.slice(0, 240)}`);
  }
  return response.json();
}

function extractJsonObject(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first < 0 || last < first) throw new Error("provider_json_missing");
  return trimmed.slice(first, last + 1);
}

function clampConfidence(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(1, number));
}
