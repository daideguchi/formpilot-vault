export const SENSITIVITY_TIERS = {
  PUBLIC: 1,
  PERSONAL: 2,
  SENSITIVE: 3,
  HIGHLY_SENSITIVE: 4
};

export const CONFIDENCE_BANDS = {
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low"
};

const SEMANTIC_TIER = new Map([
  ["person.name.full", SENSITIVITY_TIERS.PUBLIC],
  ["person.name.last", SENSITIVITY_TIERS.PUBLIC],
  ["person.name.first", SENSITIVITY_TIERS.PUBLIC],
  ["person.name.full_kana", SENSITIVITY_TIERS.PUBLIC],
  ["person.name.last_kana", SENSITIVITY_TIERS.PUBLIC],
  ["person.name.first_kana", SENSITIVITY_TIERS.PUBLIC],
  ["company.name", SENSITIVITY_TIERS.PUBLIC],
  ["company.department", SENSITIVITY_TIERS.PUBLIC],
  ["company.title", SENSITIVITY_TIERS.PUBLIC],
  ["company.website", SENSITIVITY_TIERS.PUBLIC],
  ["person.email.primary", SENSITIVITY_TIERS.PERSONAL],
  ["person.phone.country_code", SENSITIVITY_TIERS.PERSONAL],
  ["person.phone.mobile_auto", SENSITIVITY_TIERS.PERSONAL],
  ["person.address.postal_code_auto", SENSITIVITY_TIERS.PERSONAL],
  ["person.address.country", SENSITIVITY_TIERS.PERSONAL],
  ["person.address.prefecture", SENSITIVITY_TIERS.PERSONAL],
  ["person.address.city", SENSITIVITY_TIERS.PERSONAL],
  ["person.address.line1", SENSITIVITY_TIERS.PERSONAL],
  ["person.address.line2", SENSITIVITY_TIERS.PERSONAL],
  ["person.address.full", SENSITIVITY_TIERS.PERSONAL],
  ["person.birthdate.year", SENSITIVITY_TIERS.SENSITIVE],
  ["person.birthdate.month", SENSITIVITY_TIERS.SENSITIVE],
  ["person.birthdate.day", SENSITIVITY_TIERS.SENSITIVE],
  ["person.birthdate.iso", SENSITIVITY_TIERS.SENSITIVE],
  ["person.gender", SENSITIVITY_TIERS.SENSITIVE],
  ["account.password.generated", SENSITIVITY_TIERS.HIGHLY_SENSITIVE]
]);

const HIGHLY_SENSITIVE_FIELD_RULES = [
  {
    pattern: /password|passwd|passphrase|パスワード|暗証番号|contraseña|contrasena|mot de passe|passwort|senha|wachtwoord|hasło|haslo|şifre|sifre|пароль|비밀번호|密码|密碼|كلمة المرور|पासवर्ड|kata sandi|mật khẩu|รหัสผ่าน/i,
    reason: "password_default_skip",
    semantic_key: "account.password.generated"
  },
  {
    pattern: /credit card|card number|cc-number|ccnum|クレジット|カード番号|creditcard|numéro de carte|numero de tarjeta|cartão|cartao|kreditkarte|카드번호|信用卡|信用卡號|بطاقة ائتمان/i,
    reason: "payment_card_skip",
    semantic_key: null
  },
  {
    pattern: /bank account|routing number|iban|swift|口座番号|銀行口座|支店番号|bankkonto|compte bancaire|cuenta bancaria|계좌|银行账户|銀行帳戶/i,
    reason: "bank_account_skip",
    semantic_key: null
  },
  {
    pattern: /ssn|social security|tax id|tin|マイナンバー|個人番号|sin number|national id|identity number|身份证|身分證|주민등록번호/i,
    reason: "government_id_skip",
    semantic_key: null
  },
  {
    pattern: /captcha|one[- ]?time|otp|verification code|sms code|認証コード|確認コード|ワンタイム|验证码|驗證碼|인증번호/i,
    reason: "verification_code_skip",
    semantic_key: null
  }
];

export function getSemanticSensitivity(semanticKey = "") {
  if (String(semanticKey).startsWith("custom.")) return SENSITIVITY_TIERS.PERSONAL;
  return SEMANTIC_TIER.get(semanticKey) || SENSITIVITY_TIERS.PERSONAL;
}

export function classifyFieldSensitivity(field = {}) {
  const haystack = [
    field.type,
    field.autocomplete,
    field.name,
    field.id,
    field.label,
    field.aria_label,
    field.placeholder,
    field.nearby_text,
    field.section_title
  ].filter(Boolean).join(" ");

  const normalizedType = String(field.type || "").toLowerCase();
  const autocomplete = String(field.autocomplete || "").toLowerCase();
  if (normalizedType === "password") {
    return {
      tier: SENSITIVITY_TIERS.HIGHLY_SENSITIVE,
      reason: "password_default_skip",
      semantic_key: "account.password.generated"
    };
  }
  if (/^(cc-|webauthn|one-time-code)/i.test(autocomplete)) {
    return {
      tier: SENSITIVITY_TIERS.HIGHLY_SENSITIVE,
      reason: autocomplete.startsWith("one-time-code") ? "verification_code_skip" : "payment_card_skip",
      semantic_key: null
    };
  }

  const matched = HIGHLY_SENSITIVE_FIELD_RULES.find((rule) => rule.pattern.test(haystack));
  if (matched) {
    return {
      tier: SENSITIVITY_TIERS.HIGHLY_SENSITIVE,
      reason: matched.reason,
      semantic_key: matched.semantic_key
    };
  }

  return { tier: null, reason: "", semantic_key: null };
}

export function shouldSkipAutofill({ field = {}, semanticKey = "" } = {}) {
  const fieldSensitivity = classifyFieldSensitivity(field);
  if (fieldSensitivity.tier >= SENSITIVITY_TIERS.HIGHLY_SENSITIVE) {
    return {
      skip: true,
      tier: fieldSensitivity.tier,
      reason: fieldSensitivity.reason,
      semantic_key: fieldSensitivity.semantic_key
    };
  }

  const semanticTier = getSemanticSensitivity(semanticKey);
  if (semanticTier >= SENSITIVITY_TIERS.HIGHLY_SENSITIVE) {
    return {
      skip: true,
      tier: semanticTier,
      reason: "highly_sensitive_default_skip",
      semantic_key: semanticKey
    };
  }

  return { skip: false, tier: semanticTier, reason: "" };
}

export function getConfidenceBand(confidence = 0) {
  const value = Number(confidence) || 0;
  if (value >= 0.9) return CONFIDENCE_BANDS.HIGH;
  if (value >= 0.68) return CONFIDENCE_BANDS.MEDIUM;
  return CONFIDENCE_BANDS.LOW;
}
