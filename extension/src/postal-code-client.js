export const ZIPCLOUD_API_URL = "https://zipcloud.ibsnet.co.jp/api/search";

export function normalizePostalCode(value = "") {
  return String(value).replace(/\D/g, "").slice(0, 7);
}

export function formatPostalCode(value = "") {
  const normalized = normalizePostalCode(value);
  if (normalized.length !== 7) return value;
  return `${normalized.slice(0, 3)}-${normalized.slice(3)}`;
}

export async function lookupJapaneseAddressByPostalCode({
  postalCode,
  fetchImpl = globalThis.fetch
} = {}) {
  const normalized = normalizePostalCode(postalCode);
  if (normalized.length !== 7) return null;

  const url = new URL(ZIPCLOUD_API_URL);
  url.searchParams.set("zipcode", normalized);
  const response = await fetchImpl(url.toString(), { method: "GET" });
  if (!response.ok) throw new Error(`postal_lookup_${response.status}`);
  const payload = await response.json();
  const first = Array.isArray(payload.results) ? payload.results[0] : null;
  if (!first) return null;

  return {
    postal_code: formatPostalCode(first.zipcode || normalized),
    prefecture: first.address1 || "",
    city: first.address2 || "",
    line1: first.address3 || "",
    source: "zipcloud"
  };
}
