import test from "node:test";
import assert from "node:assert/strict";
import { buildSchema, buildInputPlan } from "../extension/src/schema-engine.js";
import { SAMPLE_PROFILE } from "../extension/src/profile-formatters.js";
import { getProviderForDate } from "../extension/src/provider-router.js";
import { canUseFill, createUsageEvent, getCurrentMonthKey } from "../extension/src/usage-meter.js";
import {
  buildMemoryContext,
  createVaultState,
  learnMappingsFromPlan,
  recordCorrectionEvent
} from "../extension/src/profile-memory.js";
import { buildSchemaInferencePayload, payloadContainsProfileValues } from "../extension/src/ai-payload.js";

test("maps common Japanese signup fields to profile keys", () => {
  const fields = [
    { field_id: "field_001", tag: "input", type: "text", label: "姓", visible: true },
    { field_id: "field_002", tag: "input", type: "text", label: "名", visible: true },
    { field_id: "field_003", tag: "input", type: "email", label: "メールアドレス", visible: true },
    { field_id: "field_004", tag: "input", type: "text", label: "郵便番号", placeholder: "150-0001", visible: true },
    {
      field_id: "field_005",
      tag: "select",
      type: "",
      label: "都道府県",
      visible: true,
      options: [
        { value: "", text: "選択してください" },
        { value: "東京都", text: "東京都" }
      ]
    }
  ];

  const schema = buildSchema(fields);
  assert.equal(schema.field_001.semantic_key, "person.name.last");
  assert.equal(schema.field_002.semantic_key, "person.name.first");
  assert.equal(schema.field_003.semantic_key, "person.email.primary");
  assert.equal(schema.field_004.semantic_key, "person.address.postal_code_auto");
  assert.equal(schema.field_005.semantic_key, "person.address.prefecture");

  const plan = buildInputPlan({ fields, schema, profile: SAMPLE_PROFILE });
  assert.equal(plan[0].value, "山田");
  assert.equal(plan[1].value, "太郎");
  assert.equal(plan[2].value, "taro@example.com");
  assert.equal(plan[3].value, "150-0001");
  assert.equal(plan[4].value, "東京都");
});

test("keeps provider routing on Azure through 2026-06-06 and Cloudflare after", () => {
  assert.equal(getProviderForDate(new Date("2026-06-06T03:00:00+09:00")).id, "azure_deepseek_v4");
  assert.equal(getProviderForDate(new Date("2026-06-07T03:00:00+09:00")).id, "cloudflare_workers_ai_free");
});

test("maps common multilingual signup fields to profile keys", () => {
  const fields = [
    { field_id: "es_last", tag: "input", type: "text", label: "Apellido", visible: true },
    { field_id: "fr_first", tag: "input", type: "text", label: "Prénom", visible: true },
    { field_id: "de_postal", tag: "input", type: "text", label: "Postleitzahl", visible: true },
    { field_id: "pt_company", tag: "input", type: "text", label: "Empresa", visible: true },
    { field_id: "ko_phone", tag: "input", type: "text", label: "전화번호", visible: true },
    { field_id: "zh_city", tag: "input", type: "text", label: "城市", visible: true }
  ];

  const schema = buildSchema(fields);
  assert.equal(schema.es_last.semantic_key, "person.name.last");
  assert.equal(schema.fr_first.semantic_key, "person.name.first");
  assert.equal(schema.de_postal.semantic_key, "person.address.postal_code_auto");
  assert.equal(schema.pt_company.semantic_key, "company.name");
  assert.equal(schema.ko_phone.semantic_key, "person.phone.mobile_auto");
  assert.equal(schema.zh_city.semantic_key, "person.address.city");
});

test("maps global market signup labels beyond first launch languages", () => {
  const fields = [
    { field_id: "it_last", tag: "input", type: "text", label: "Cognome", visible: true },
    { field_id: "nl_first", tag: "input", type: "text", label: "Voornaam", visible: true },
    { field_id: "pl_postal", tag: "input", type: "text", label: "Kod pocztowy", visible: true },
    { field_id: "tr_company", tag: "input", type: "text", label: "Şirket", visible: true },
    { field_id: "ru_birthdate", tag: "input", type: "text", label: "Дата рождения", visible: true },
    { field_id: "ar_phone", tag: "input", type: "text", label: "رقم الهاتف", visible: true },
    { field_id: "hi_city", tag: "input", type: "text", label: "शहर", visible: true },
    { field_id: "id_address", tag: "input", type: "text", label: "Alamat", visible: true },
    { field_id: "vi_title", tag: "input", type: "text", label: "Chức danh", visible: true },
    { field_id: "th_password", tag: "input", type: "text", label: "รหัสผ่าน", visible: true },
    { field_id: "tw_email", tag: "input", type: "text", label: "電子郵件", visible: true }
  ];

  const schema = buildSchema(fields);
  assert.equal(schema.it_last.semantic_key, "person.name.last");
  assert.equal(schema.nl_first.semantic_key, "person.name.first");
  assert.equal(schema.pl_postal.semantic_key, "person.address.postal_code_auto");
  assert.equal(schema.tr_company.semantic_key, "company.name");
  assert.equal(schema.ru_birthdate.semantic_key, "person.birthdate.iso");
  assert.equal(schema.ar_phone.semantic_key, "person.phone.mobile_auto");
  assert.equal(schema.hi_city.semantic_key, "person.address.city");
  assert.equal(schema.id_address.semantic_key, "person.address.full");
  assert.equal(schema.vi_title.semantic_key, "company.title");
  assert.equal(schema.th_password.semantic_key, "account.password.generated");
  assert.equal(schema.tw_email.semantic_key, "person.email.primary");
});

test("enforces free monthly fill limit and tracks safe usage events", () => {
  const date = new Date("2026-06-15T12:00:00+09:00");
  const monthKey = getCurrentMonthKey(date);
  assert.equal(monthKey, "2026-06");
  assert.equal(canUseFill({ entitlement: { plan: "free" }, usage: { [monthKey]: { fills: 4 } }, date }).allowed, true);
  assert.equal(canUseFill({ entitlement: { plan: "free" }, usage: { [monthKey]: { fills: 5 } }, date }).allowed, false);
  assert.equal(canUseFill({ entitlement: { plan: "plus" }, usage: { [monthKey]: { fills: 200 } }, date }).allowed, true);

  const event = createUsageEvent({
    url: "https://example.com/signup?token=secret",
    fields_scanned: 12,
    fields_filled: 10,
    plan: "free",
    date
  });
  assert.equal(event.origin, "https://example.com");
  assert.equal(event.fields_filled, 10);
});

test("uses local memory mappings before generic schema rules", () => {
  const date = new Date("2026-06-15T12:00:00+09:00");
  const fields = [
    {
      field_id: "field_001",
      tag: "input",
      type: "text",
      name: "custom_001",
      label: "会員コード",
      visible: true
    }
  ];

  let vaultState = createVaultState({ profile: SAMPLE_PROFILE, now: date });
  vaultState = recordCorrectionEvent({
    vaultState,
    url: "https://example.com/signup?token=secret",
    field: fields[0],
    from_profile_key: null,
    to_profile_key: "person.email.primary",
    date
  });

  const memoryContext = buildMemoryContext({
    vaultState,
    url: "https://example.com/signup?next=1",
    fields
  });
  const schema = buildSchema(fields, { memoryContext });
  const plan = buildInputPlan({ fields, schema, profile: SAMPLE_PROFILE });

  assert.equal(schema.field_001.semantic_key, "person.email.primary");
  assert.equal(schema.field_001.source, "mapping_cache");
  assert.equal(plan[0].value, "taro@example.com");
  assert.equal(Object.keys(memoryContext.field_mappings).length, 1);
});

test("learned mapping cache stores keys and site context without raw personal values", () => {
  const date = new Date("2026-06-15T12:00:00+09:00");
  const fields = [
    { field_id: "field_001", tag: "input", type: "text", label: "姓", visible: true },
    { field_id: "field_002", tag: "input", type: "email", label: "メールアドレス", visible: true }
  ];
  const schema = buildSchema(fields);
  const plan = buildInputPlan({ fields, schema, profile: SAMPLE_PROFILE });

  let vaultState = createVaultState({ profile: SAMPLE_PROFILE, now: date });
  vaultState = learnMappingsFromPlan({
    vaultState,
    url: "https://example.com/signup?token=secret",
    fields,
    plan,
    date
  });

  const learnedDump = JSON.stringify({
    semantic_memory: vaultState.semantic_memory,
    mapping_cache: vaultState.mapping_cache,
    correction_events: vaultState.correction_events
  });

  assert.equal(vaultState.mapping_cache.length, 2);
  assert.equal(vaultState.mapping_cache[0].origin, "https://example.com");
  assert.equal(vaultState.mapping_cache[0].path_pattern, "/signup");
  assert.ok(learnedDump.includes("person.name.last"));
  assert.ok(!learnedDump.includes("山田"));
  assert.ok(!learnedDump.includes("taro@example.com"));
});

test("AI schema payload includes memory context but excludes raw profile values", () => {
  const date = new Date("2026-06-15T12:00:00+09:00");
  const profile = {
    ...SAMPLE_PROFILE,
    company: {
      ...SAMPLE_PROFILE.company,
      website: "https://sample-company.test"
    }
  };
  const fields = [
    {
      field_id: "field_001",
      selector: "#lastName",
      tag: "input",
      type: "text",
      label: "姓",
      visible: true,
      value: "山田"
    },
    {
      field_id: "field_002",
      tag: "input",
      type: "email",
      label: "メールアドレス",
      visible: true,
      value: "taro@example.com"
    }
  ];
  const schema = buildSchema(fields);
  const plan = buildInputPlan({ fields, schema, profile });
  const vaultState = learnMappingsFromPlan({
    vaultState: createVaultState({ profile, now: date }),
    url: "https://example.com/signup?token=secret",
    fields,
    plan,
    date
  });
  const memoryContext = buildMemoryContext({
    vaultState,
    url: "https://example.com/signup?next=1",
    fields,
    localeContext: {
      ui_language: "ja-JP",
      page_language: "ja",
      text_direction: "ltr",
      host_tld: "com"
    }
  });

  const payload = buildSchemaInferencePayload({
    fields,
    memoryContext,
    provider: { id: "azure_deepseek_v4" },
    date
  });

  assert.equal(payload.provider_id, "azure_deepseek_v4");
  assert.equal(payload.fields[0].selector, undefined);
  assert.equal(payload.fields[0].value, undefined);
  assert.equal(payload.locale_context.page_language, "ja");
  assert.equal(payload.memory_context.locale_context.ui_language, "ja-JP");
  assert.equal(payload.memory_context.mapping_cache.length, 2);
  assert.equal(payloadContainsProfileValues(payload, profile), false);
});
