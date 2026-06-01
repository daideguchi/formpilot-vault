import { getProfileValue } from "./profile-formatters.js";

export const SEMANTIC_LABELS = {
  "person.name.full": "氏名",
  "person.name.last": "姓",
  "person.name.first": "名",
  "person.name.full_kana": "氏名カナ",
  "person.name.last_kana": "セイ",
  "person.name.first_kana": "メイ",
  "person.email.primary": "メール",
  "person.phone.mobile_auto": "電話番号",
  "person.address.postal_code_auto": "郵便番号",
  "person.address.prefecture": "都道府県",
  "person.address.city": "市区町村",
  "person.address.line1": "番地",
  "person.address.line2": "建物名・部屋番号",
  "person.address.full": "住所",
  "person.birthdate.year": "生年",
  "person.birthdate.month": "生月",
  "person.birthdate.day": "生日",
  "person.birthdate.iso": "生年月日",
  "person.gender": "性別",
  "company.name": "会社名",
  "company.department": "部署",
  "company.title": "役職",
  "company.website": "会社サイト",
  "account.password.generated": "パスワード"
};

const AUTOCOMPLETE_MAP = new Map([
  ["name", "person.name.full"],
  ["family-name", "person.name.last"],
  ["given-name", "person.name.first"],
  ["email", "person.email.primary"],
  ["tel", "person.phone.mobile_auto"],
  ["tel-national", "person.phone.mobile_auto"],
  ["postal-code", "person.address.postal_code_auto"],
  ["address-level1", "person.address.prefecture"],
  ["address-level2", "person.address.city"],
  ["street-address", "person.address.full"],
  ["address-line1", "person.address.line1"],
  ["address-line2", "person.address.line2"],
  ["organization", "company.name"],
  ["organization-title", "company.title"],
  ["bday", "person.birthdate.iso"],
  ["bday-year", "person.birthdate.year"],
  ["bday-month", "person.birthdate.month"],
  ["bday-day", "person.birthdate.day"]
]);

const RULES = [
  [/^(last_?kana|sei_?kana|kana_?sei)$/i, "person.name.last_kana", 0.95],
  [/^(first_?kana|mei_?kana|kana_?mei)$/i, "person.name.first_kana", 0.95],
  [/^(sei|last_?name|family_?name|surname|lname)$/i, "person.name.last", 0.94],
  [/^(mei|first_?name|given_?name|fname)$/i, "person.name.first", 0.94],
  [/^(name|full_?name|user_?name)$/i, "person.name.full", 0.82],
  [/^(kana|name_?kana|furigana)$/i, "person.name.full_kana", 0.88],
  [/^(email|mail|e-mail|user_?email)$/i, "person.email.primary", 0.96],
  [/^(tel|phone|mobile|cellphone)$/i, "person.phone.mobile_auto", 0.92],
  [/^(zip|zipcode|postal|postal_?code|postcode)$/i, "person.address.postal_code_auto", 0.95],
  [/^(pref|prefecture|address1|ken)$/i, "person.address.prefecture", 0.9],
  [/^(city|address2|shiku)$/i, "person.address.city", 0.86],
  [/^(addr|address|street)$/i, "person.address.full", 0.82],
  [/^(company|organization|corp)$/i, "company.name", 0.88],
  [/^(department|division|busho)$/i, "company.department", 0.86],
  [/^(title|position|role|yakushoku)$/i, "company.title", 0.84],
  [/^(password|passwd|pass)$/i, "account.password.generated", 0.9]
];

const TEXT_RULES = [
  [/メール|mail|e-mail|email|correo|courriel|e-mail|電子郵件|邮箱|郵箱|이메일/i, "person.email.primary", 0.96],
  [/携帯|電話|tel|phone|mobile|cell|téléphone|telefono|teléfono|telefone|telefon|전화|手机号|手机|電話/i, "person.phone.mobile_auto", 0.9],
  [/郵便番号|zip|postal|postcode|post code|código postal|codigo postal|code postal|postleitzahl|cep|우편번호|邮编|郵編/i, "person.address.postal_code_auto", 0.96],
  [/都道府県|pref|state|province|region|región|estado|provincia|région|bundesland|시\/도|도\/시|省|州|地区/i, "person.address.prefecture", 0.92],
  [/市区町村|市町村|区市町村|city|town|municipality|ciudad|ville|cidade|stadt|도시|市|城市/i, "person.address.city", 0.88],
  [/建物|マンション|部屋|号室|address.*2|address line 2|apt|apartment|suite|unit|piso|departamento|complément|adresse.*2|endereço.*2|주소.*2|详细地址|詳細地址/i, "person.address.line2", 0.86],
  [/番地|丁目|住所1|address.*1|address line 1|street|calle|rue|straße|strasse|logradouro|endereço.*1|주소.*1|街道|地址1/i, "person.address.line1", 0.86],
  [/住所|所在地|address|dirección|direccion|adresse|endereço|endereco|anschrift|주소|地址/i, "person.address.full", 0.8],
  [/セイ|姓.*カナ|カナ.*姓/i, "person.name.last_kana", 0.95],
  [/メイ|名.*カナ|カナ.*名/i, "person.name.first_kana", 0.95],
  [/フリガナ|ふりがな|カナ/i, "person.name.full_kana", 0.86],
  [/^姓$|苗字|last name|family name|surname|apellido|apellidos|nom de famille|nachname|sobrenome|성$|姓氏/i, "person.name.last", 0.96],
  [/^名$|お名前.*名|first name|given name|forename|nombre|prénom|prenom|vorname|nome|이름$/i, "person.name.first", 0.92],
  [/氏名|お名前|名前|名字|name|full name|nombre completo|nom complet|vollständiger name|nome completo|성명|姓名/i, "person.name.full", 0.82],
  [/生年|年.*生まれ|birth.*year|year of birth|año.*nacimiento|année.*naissance|geburtsjahr|ano.*nascimento|출생.*연도|出生.*年/i, "person.birthdate.year", 0.9],
  [/生月|月.*生まれ|birth.*month|month of birth|mes.*nacimiento|mois.*naissance|geburtsmonat|mês.*nascimento|출생.*월|出生.*月/i, "person.birthdate.month", 0.9],
  [/生日|日.*生まれ|birth.*day|day of birth|día.*nacimiento|jour.*naissance|geburtstag|dia.*nascimento|출생.*일|出生.*日/i, "person.birthdate.day", 0.9],
  [/生年月日|誕生日|birthday|birthdate|date of birth|fecha.*nacimiento|date.*naissance|geburtsdatum|data.*nascimento|생년월일|出生日期/i, "person.birthdate.iso", 0.86],
  [/性別|gender|sex|género|genero|genre|geschlecht|gênero|성별|性别|性別/i, "person.gender", 0.88],
  [/会社名|法人名|貴社名|organization|company|business|empresa|société|societe|entreprise|unternehmen|회사|公司/i, "company.name", 0.9],
  [/部署|部門|department|division|departamento|département|departement|abteilung|부서|部门|部門/i, "company.department", 0.88],
  [/役職|肩書|position|title|job title|cargo|poste|fonction|position|직책|职位|職位/i, "company.title", 0.86],
  [/webサイト|website|url|site web|sitio web|webseite|site da empresa|웹사이트|网站|網站/i, "company.website", 0.82],
  [/パスワード|password|contraseña|contrasena|mot de passe|passwort|senha|비밀번호|密码|密碼/i, "account.password.generated", 0.9]
];

export function buildSchema(fields, { memoryContext = null } = {}) {
  const schema = {};
  for (const field of fields) {
    schema[field.field_id] = memoryContext?.field_mappings?.[field.field_id] || inferField(field);
  }
  return schema;
}

export function buildInputPlan({ fields, schema, profile }) {
  return fields.map((field) => {
    const inference = schema[field.field_id] || { semantic_key: null, confidence: 0 };
    if (!inference.semantic_key || inference.confidence < 0.68) {
      return {
        field_id: field.field_id,
        action: "ask",
        profile_key: null,
        display_label: displayLabel(field),
        value_preview: "",
        confidence: inference.confidence || 0,
        source: inference.source || "unknown"
      };
    }

    const value = getProfileValue(profile, inference.semantic_key, field);
    if (value === undefined || value === null || value === "") {
      return {
        field_id: field.field_id,
        action: "ask",
        profile_key: inference.semantic_key,
        display_label: displayLabel(field),
        value_preview: "",
        confidence: Math.min(inference.confidence, 0.66),
        source: inference.source || "unknown"
      };
    }

    return {
      field_id: field.field_id,
      action: field.tag === "select" || field.role === "radio-group" ? "select" : "fill",
      profile_key: inference.semantic_key,
      display_label: SEMANTIC_LABELS[inference.semantic_key] || displayLabel(field),
      value: normalizeForField(value, field),
      value_preview: normalizeForField(value, field),
      confidence: inference.confidence,
      source: inference.source || "rules"
    };
  });
}

export function inferField(field) {
  if (field.type === "hidden" || field.visible === false || field.disabled) {
    return { semantic_key: null, confidence: 0, source: "not_fillable" };
  }

  const autocomplete = normalizeAutocomplete(field.autocomplete);
  for (const token of autocomplete) {
    if (AUTOCOMPLETE_MAP.has(token)) {
      return { semantic_key: AUTOCOMPLETE_MAP.get(token), confidence: 0.99, source: "autocomplete" };
    }
  }

  if (field.type === "email") return { semantic_key: "person.email.primary", confidence: 0.98, source: "type" };
  if (field.type === "tel") return { semantic_key: "person.phone.mobile_auto", confidence: 0.96, source: "type" };
  if (field.type === "password") return { semantic_key: "account.password.generated", confidence: 0.9, source: "type" };

  const structuralValues = [field.name, field.id].filter(Boolean);
  for (const [pattern, semantic_key, confidence] of RULES) {
    if (structuralValues.some((value) => pattern.test(value))) return { semantic_key, confidence, source: "name_id" };
  }

  const directText = [
    field.label,
    field.aria_label,
    field.placeholder,
    field.name,
    field.id
  ].filter(Boolean).join(" ");

  for (const [pattern, semantic_key, confidence] of TEXT_RULES) {
    if (pattern.test(directText)) return { semantic_key, confidence, source: "text" };
  }

  const contextText = [
    field.nearby_text,
    field.section_title
  ].filter(Boolean).join(" ");

  for (const [pattern, semantic_key, confidence] of TEXT_RULES) {
    if (pattern.test(contextText)) {
      return { semantic_key, confidence: Math.min(confidence, 0.62), source: "context_text" };
    }
  }

  return { semantic_key: null, confidence: 0.25, source: "unknown" };
}

function normalizeAutocomplete(value = "") {
  return String(value)
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => token !== "shipping" && token !== "billing" && !token.startsWith("section-"));
}

function normalizeForField(value, field) {
  const text = String(value);
  if (field.tag !== "select" || !Array.isArray(field.options)) return text;
  const exact = field.options.find((option) => option.value === text || option.text === text);
  if (exact) return exact.value || exact.text;
  const loose = field.options.find((option) => option.text.includes(text) || text.includes(option.text));
  return loose ? loose.value || loose.text : text;
}

function displayLabel(field) {
  return field.label || field.placeholder || field.name || field.id || field.field_id;
}
