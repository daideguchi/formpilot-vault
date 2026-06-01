export const SAMPLE_PROFILE = {
  person: {
    name: {
      full: "山田 太郎",
      last: "山田",
      first: "太郎",
      full_kana: "ヤマダ タロウ",
      last_kana: "ヤマダ",
      first_kana: "タロウ",
      full_hiragana: "やまだ たろう"
    },
    email: {
      primary: "taro@example.com"
    },
    phone: {
      country_code: "+81",
      mobile: "09012345678",
      mobile_hyphen: "090-1234-5678"
    },
    birthdate: {
      iso: "1995-04-12",
      year: "1995",
      month: "04",
      day: "12"
    },
    gender: "male",
    address: {
      postal_code: "1500001",
      postal_code_hyphen: "150-0001",
      prefecture: "東京都",
      city: "渋谷区",
      line1: "神宮前1-2-3",
      line2: "サンプルマンション101",
      full: "東京都渋谷区神宮前1-2-3 サンプルマンション101",
      country: "日本",
      country_code: "JP"
    }
  },
  company: {
    name: "株式会社サンプル",
    department: "営業部",
    title: "代表",
    website: "https://example.com"
  },
  account: {
    default_password_policy: "generate"
  }
};

export function getProfileValue(profile, key, field = {}) {
  if (key === "account.password.generated") {
    return getOrCreatePassword(profile);
  }

  if (key === "person.address.postal_code_auto") {
    const wantsHyphen = /-/.test(field.placeholder || "") || /ハイフン|郵便番号.*-/.test(field.label || "");
    return wantsHyphen
      ? readPath(profile, "person.address.postal_code_hyphen")
      : readPath(profile, "person.address.postal_code");
  }

  if (key === "person.phone.mobile_auto") {
    const wantsHyphen = /-/.test(field.placeholder || "") || /ハイフン|電話.*-/.test(field.label || "");
    return wantsHyphen
      ? readPath(profile, "person.phone.mobile_hyphen")
      : readPath(profile, "person.phone.mobile");
  }

  if (key === "person.address.country") {
    return selectCountryValue(profile, field);
  }

  return readPath(profile, key);
}

export function readPath(source, path) {
  return path.split(".").reduce((value, part) => value?.[part], source);
}

function getOrCreatePassword(profile) {
  if (profile?.account?.generated_password) return profile.account.generated_password;
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!#$%";
  const bytes = new Uint8Array(18);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 255);
  }
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

function selectCountryValue(profile, field = {}) {
  const country = readPath(profile, "person.address.country");
  const countryCode = readPath(profile, "person.address.country_code");
  const candidates = [
    country,
    countryCode,
    countryCode === "JP" ? "Japan" : "",
    countryCode === "JP" ? "JPN" : "",
    country === "日本" ? "Japan" : ""
  ].filter(Boolean);

  if (Array.isArray(field.options)) {
    const normalized = candidates.map((value) => String(value).toLowerCase());
    const option = field.options.find((entry) => {
      const values = [entry.value, entry.text].filter(Boolean).map((value) => String(value).toLowerCase());
      return values.some((value) => normalized.includes(value));
    });
    if (option) return option.value || option.text;
  }

  return country || countryCode;
}
