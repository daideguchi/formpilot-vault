export const DEFAULT_ENTITLEMENT_API_URL = "https://example.com/api/entitlement/check";

export async function fetchEntitlement({
  licenseKey,
  apiUrl = DEFAULT_ENTITLEMENT_API_URL,
  fetchImpl = globalThis.fetch
} = {}) {
  if (!licenseKey) throw new Error("license_key_required");
  const response = await fetchImpl(apiUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ license_key: licenseKey })
  });
  if (!response.ok) throw new Error(`entitlement_http_${response.status}`);
  return normalizeEntitlement(await response.json());
}

export function normalizeEntitlement(raw = {}) {
  const plan = ["free", "plus", "pro", "team"].includes(raw.plan) ? raw.plan : "free";
  return {
    plan,
    status: raw.status || "unknown",
    active: Boolean(raw.active) && plan !== "free",
    current_period_end: raw.current_period_end || null,
    license_key: raw.license_key || null,
    limits: raw.limits || {}
  };
}
