export const VAULT_STORAGE_KEY = "vaultState";
export const DEFAULT_PROFILE_ID = "personal_main";

export function createVaultState({ profile = {}, now = new Date() } = {}) {
  const timestamp = toIso(now);
  return {
    version: 1,
    active_profile_id: DEFAULT_PROFILE_ID,
    vault_profiles: [
      {
        profile_id: DEFAULT_PROFILE_ID,
        label: "Personal main",
        values: clone(profile),
        created_at: timestamp,
        updated_at: timestamp
      }
    ],
    semantic_memory: [],
    mapping_cache: [],
    correction_events: []
  };
}

export function normalizeVaultState(raw, { profile = {}, now = new Date() } = {}) {
  if (!raw || typeof raw !== "object") return createVaultState({ profile, now });

  const state = {
    version: raw.version || 1,
    active_profile_id: raw.active_profile_id || DEFAULT_PROFILE_ID,
    vault_profiles: Array.isArray(raw.vault_profiles) ? clone(raw.vault_profiles) : [],
    semantic_memory: Array.isArray(raw.semantic_memory) ? clone(raw.semantic_memory) : [],
    mapping_cache: Array.isArray(raw.mapping_cache) ? clone(raw.mapping_cache) : [],
    correction_events: Array.isArray(raw.correction_events) ? clone(raw.correction_events) : []
  };

  if (state.vault_profiles.length === 0) {
    state.vault_profiles = createVaultState({ profile, now }).vault_profiles;
  }

  if (!state.vault_profiles.some((entry) => entry.profile_id === state.active_profile_id)) {
    state.active_profile_id = state.vault_profiles[0]?.profile_id || DEFAULT_PROFILE_ID;
  }

  return state;
}

export function getActiveProfileValues(vaultState) {
  const state = normalizeVaultState(vaultState);
  const profile = state.vault_profiles.find((entry) => entry.profile_id === state.active_profile_id);
  return clone(profile?.values || {});
}

export function updateActiveProfileValues(vaultState, values, { now = new Date() } = {}) {
  const state = normalizeVaultState(vaultState, { profile: values, now });
  const timestamp = toIso(now);
  const index = state.vault_profiles.findIndex((entry) => entry.profile_id === state.active_profile_id);
  const profile = {
    profile_id: state.active_profile_id || DEFAULT_PROFILE_ID,
    label: state.vault_profiles[index]?.label || "Personal main",
    values: clone(values),
    created_at: state.vault_profiles[index]?.created_at || timestamp,
    updated_at: timestamp
  };

  if (index >= 0) state.vault_profiles[index] = profile;
  else state.vault_profiles.push(profile);
  return state;
}

export function buildMemoryContext({ vaultState, url = "", fields = [] }) {
  const state = normalizeVaultState(vaultState);
  const origin = normalizeOrigin(url);
  const path_pattern = pathPatternFromUrl(url);
  const mapping_cache = state.mapping_cache.filter((entry) => {
    return entry.origin === origin && pathMatches(entry.path_pattern, path_pattern);
  });

  const field_mappings = {};
  for (const field of fields) {
    const signature = createFieldSignature(field);
    const match = pickBestMapping(mapping_cache.filter((entry) => entry.field_signature === signature));
    if (!match) continue;
    field_mappings[field.field_id] = {
      semantic_key: match.profile_key,
      confidence: Math.max(match.confidence || 0, 0.9),
      source: "mapping_cache",
      memory_source: match.source || "fill_success",
      memory_id: match.memory_id
    };
  }

  return {
    origin,
    path_pattern,
    field_mappings,
    mapping_cache,
    semantic_memory: state.semantic_memory.filter((entry) => !entry.origin || entry.origin === origin)
  };
}

export function learnMappingsFromPlan({ vaultState, url = "", fields = [], plan = [], date = new Date() }) {
  const state = normalizeVaultState(vaultState);
  const origin = normalizeOrigin(url);
  const path_pattern = pathPatternFromUrl(url);
  const timestamp = toIso(date);
  const fieldsById = new Map(fields.map((field) => [field.field_id, field]));

  for (const item of plan) {
    if (!["fill", "select"].includes(item.action)) continue;
    if (!item.profile_key || (item.confidence || 0) < 0.68) continue;
    const field = fieldsById.get(item.field_id);
    if (!field) continue;

    upsertMapping(state, {
      origin,
      path_pattern,
      field_signature: createFieldSignature(field),
      profile_key: item.profile_key,
      confidence: Math.max(item.confidence || 0.75, 0.75),
      source: item.source || "fill_success",
      timestamp
    });
  }

  return state;
}

export function recordCorrectionEvent({
  vaultState,
  url = "",
  field,
  from_profile_key = null,
  to_profile_key,
  date = new Date()
}) {
  const state = normalizeVaultState(vaultState);
  if (!field || !to_profile_key) return state;

  const origin = normalizeOrigin(url);
  const path_pattern = pathPatternFromUrl(url);
  const timestamp = toIso(date);
  const event = {
    event_id: stableId("correction", [origin, path_pattern, field.field_id, to_profile_key, timestamp]),
    origin,
    path_pattern,
    field_signature: createFieldSignature(field),
    from_profile_key,
    to_profile_key,
    created_at: timestamp
  };

  state.correction_events.push(event);
  state.correction_events = state.correction_events.slice(-500);

  upsertMapping(state, {
    origin,
    path_pattern,
    field_signature: event.field_signature,
    profile_key: to_profile_key,
    confidence: 0.99,
    source: "user_correction",
    timestamp
  });

  return state;
}

export function summarizeMemory(vaultState) {
  const state = normalizeVaultState(vaultState);
  return {
    profiles: state.vault_profiles.length,
    semantic_memory: state.semantic_memory.length,
    mapping_cache: state.mapping_cache.length,
    correction_events: state.correction_events.length
  };
}

export function createFieldSignature(field = {}) {
  const parts = [
    ["tag", field.tag],
    ["type", field.type],
    ["name", field.name],
    ["id", field.id],
    ["autocomplete", field.autocomplete],
    ["label", field.label],
    ["placeholder", field.placeholder]
  ];

  return parts
    .map(([key, value]) => [key, normalizeText(value)])
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}:${value}`)
    .join("|");
}

export function normalizeOrigin(url = "") {
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

export function pathPatternFromUrl(url = "") {
  try {
    return new URL(url).pathname || "/";
  } catch {
    return "/";
  }
}

function upsertMapping(state, mapping) {
  const existing = state.mapping_cache.find((entry) => {
    return entry.origin === mapping.origin
      && entry.path_pattern === mapping.path_pattern
      && entry.field_signature === mapping.field_signature;
  });

  if (existing) {
    existing.profile_key = mapping.profile_key;
    existing.confidence = Math.max(existing.confidence || 0, mapping.confidence || 0);
    existing.source = mapping.source;
    existing.success_count = (existing.success_count || 0) + 1;
    existing.last_success_at = mapping.timestamp;
    existing.updated_at = mapping.timestamp;
    return;
  }

  state.mapping_cache.push({
    memory_id: stableId("map", [
      mapping.origin,
      mapping.path_pattern,
      mapping.field_signature,
      mapping.profile_key
    ]),
    origin: mapping.origin,
    path_pattern: mapping.path_pattern,
    field_signature: mapping.field_signature,
    profile_key: mapping.profile_key,
    confidence: mapping.confidence,
    source: mapping.source,
    success_count: 1,
    created_at: mapping.timestamp,
    updated_at: mapping.timestamp,
    last_success_at: mapping.timestamp
  });
}

function pickBestMapping(mappings) {
  return mappings
    .slice()
    .sort((left, right) => {
      const scoreLeft = (left.confidence || 0) + Math.min(left.success_count || 0, 20) / 100;
      const scoreRight = (right.confidence || 0) + Math.min(right.success_count || 0, 20) / 100;
      return scoreRight - scoreLeft;
    })[0];
}

function pathMatches(storedPattern = "/", currentPath = "/") {
  if (storedPattern === currentPath) return true;
  if (storedPattern.endsWith("/*")) return currentPath.startsWith(storedPattern.slice(0, -1));
  return false;
}

function normalizeText(value = "") {
  return String(value).replace(/\s+/g, " ").trim().toLowerCase();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value ?? {}));
}

function toIso(value) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function stableId(prefix, parts) {
  return `${prefix}_${simpleHash(parts.join("|"))}`;
}

function simpleHash(input) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}
