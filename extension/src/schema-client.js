import { PUBLIC_BASE_URL } from "./release-config.js";
import { buildSchemaInferencePayload } from "./ai-payload.js";
import { SEMANTIC_LABELS, buildSchema } from "./schema-engine.js";

export const DEFAULT_SCHEMA_API_URL = `${PUBLIC_BASE_URL}/api/schema/infer`;

export async function inferSchemaFromApi({
  fields = [],
  memoryContext = null,
  provider = null,
  apiUrl = DEFAULT_SCHEMA_API_URL,
  fetchImpl = globalThis.fetch,
  date = new Date()
} = {}) {
  const localSchema = buildSchema(fields, { memoryContext });
  const payload = buildSchemaInferencePayload({ fields, memoryContext, provider, date });
  const response = await fetchImpl(apiUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(`schema_http_${response.status}`);

  const result = await response.json();
  return normalizeRemoteSchema({ fields, localSchema, result });
}

export function normalizeRemoteSchema({ fields = [], localSchema = {}, result = {} } = {}) {
  const mappings = result.mappings || {};
  const source = result.mode === "live" ? "ai" : "rules";
  return Object.fromEntries(fields.map((field) => {
    const fieldId = field.field_id;
    const remote = normalizeMapping(mappings[fieldId], source);
    return [fieldId, remote || localSchema[fieldId] || { semantic_key: null, confidence: 0, source: "unknown" }];
  }));
}

function normalizeMapping(mapping, source) {
  if (!mapping || typeof mapping !== "object") return null;
  const semanticKey = mapping.semantic_key || null;
  if (semanticKey && !SEMANTIC_LABELS[semanticKey]) return null;
  return {
    semantic_key: semanticKey,
    confidence: clampConfidence(mapping.confidence),
    source,
    reason: mapping.reason || ""
  };
}

function clampConfidence(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(1, number));
}
