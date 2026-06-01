const SAFE_FIELD_KEYS = [
  "field_id",
  "tag",
  "type",
  "role",
  "name",
  "id",
  "autocomplete",
  "placeholder",
  "label",
  "aria_label",
  "nearby_text",
  "section_title",
  "required",
  "visible",
  "options"
];

const SAFE_LOCALE_CONTEXT_KEYS = [
  "ui_language",
  "page_language",
  "text_direction",
  "host_tld",
  "charset",
  "origin"
];

export function buildSchemaInferencePayload({
  fields = [],
  memoryContext = null,
  localeContext = null,
  provider = null,
  date = new Date()
} = {}) {
  const effectiveLocaleContext = localeContext || memoryContext?.locale_context || null;
  return {
    version: 1,
    task: "form_schema_mapping",
    generated_at: toIso(date),
    provider_id: provider?.id || null,
    origin: memoryContext?.origin || null,
    path_pattern: memoryContext?.path_pattern || null,
    instruction: "Return field_id to semantic_key mappings only. Do not request or infer personal values.",
    locale_context: sanitizeLocaleContext(effectiveLocaleContext),
    fields: fields.map(sanitizeField),
    memory_context: sanitizeMemoryContext(memoryContext)
  };
}

export function payloadContainsProfileValues(payload, profile) {
  const haystack = JSON.stringify(payload);
  return collectPrimitiveValues(profile).some((value) => {
    if (SAFE_PROFILE_VALUE_STOPLIST.has(value.toLowerCase())) return false;
    return value.length >= 4 && haystack.includes(value);
  });
}

const SAFE_PROFILE_VALUE_STOPLIST = new Set(["generate", "male", "female", "other"]);

function sanitizeField(field = {}) {
  const safe = {};
  for (const key of SAFE_FIELD_KEYS) {
    if (field[key] === undefined || field[key] === null || field[key] === "") continue;
    safe[key] = key === "options" ? sanitizeOptions(field[key]) : field[key];
  }
  return safe;
}

function sanitizeOptions(options) {
  if (!Array.isArray(options)) return null;
  return options.map((option) => ({
    value: String(option.value || "").slice(0, 120),
    text: String(option.text || "").slice(0, 120)
  }));
}

function sanitizeMemoryContext(memoryContext) {
  if (!memoryContext) return { field_mappings: {}, mapping_cache: [], semantic_memory: [], locale_context: {} };

  return {
    locale_context: sanitizeLocaleContext(memoryContext.locale_context),
    field_mappings: Object.fromEntries(
      Object.entries(memoryContext.field_mappings || {}).map(([fieldId, mapping]) => [
        fieldId,
        {
          semantic_key: mapping.semantic_key,
          confidence: mapping.confidence,
          source: mapping.source
        }
      ])
    ),
    mapping_cache: (memoryContext.mapping_cache || []).map((entry) => ({
      origin: entry.origin,
      path_pattern: entry.path_pattern,
      field_signature: entry.field_signature,
      profile_key: entry.profile_key,
      confidence: entry.confidence,
      source: entry.source,
      success_count: entry.success_count || 0
    })),
    semantic_memory: (memoryContext.semantic_memory || []).map((entry) => ({
      scope: entry.scope,
      origin: entry.origin,
      pattern: entry.pattern,
      profile_key: entry.profile_key,
      confidence: entry.confidence,
      source: entry.source
    }))
  };
}

function sanitizeLocaleContext(localeContext) {
  if (!localeContext || typeof localeContext !== "object") return {};
  const safe = {};
  for (const key of SAFE_LOCALE_CONTEXT_KEYS) {
    if (localeContext[key] === undefined || localeContext[key] === null || localeContext[key] === "") continue;
    safe[key] = String(localeContext[key]).slice(0, 160);
  }
  return safe;
}

function collectPrimitiveValues(source) {
  const values = [];
  walk(source);
  return values;

  function walk(value) {
    if (value === null || value === undefined) return;
    if (typeof value === "string" || typeof value === "number") {
      values.push(String(value));
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (typeof value === "object") {
      Object.values(value).forEach(walk);
    }
  }
}

function toIso(value) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
