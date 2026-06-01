export const PROVIDER_SWITCH_POLICY = {
  timezone: "Asia/Tokyo",
  azure_through: "2026-06-06",
  cloudflare_from: "2026-06-07",
  azure: {
    id: "azure_deepseek_v4",
    label: "Azure DeepSeek V4",
    model: "DeepSeek-V4-Pro",
    call_from: "server_proxy_only"
  },
  cloudflare: {
    id: "cloudflare_workers_ai_free",
    label: "Cloudflare Workers AI",
    primary_model: "@cf/meta/llama-3.2-3b-instruct",
    fallback_model: "@cf/zai-org/glm-4.7-flash",
    free_allocation: "10000_neurons_per_day",
    call_from: "server_proxy_or_worker_only"
  }
};

export function getProviderForDate(date = new Date(), { overrideId = "" } = {}) {
  const ymd = toTokyoDateString(date);
  const override = getProviderById(overrideId);
  if (override) {
    return {
      ...override,
      date: ymd,
      label: `Provider override: ${override.id}`
    };
  }

  if (ymd <= PROVIDER_SWITCH_POLICY.azure_through) {
    return {
      ...PROVIDER_SWITCH_POLICY.azure,
      date: ymd,
      label: `Azure until ${PROVIDER_SWITCH_POLICY.azure_through}`
    };
  }
  return {
    ...PROVIDER_SWITCH_POLICY.cloudflare,
    date: ymd,
    label: "Cloudflare free"
  };
}

export function getProviderById(providerId = "") {
  const normalized = String(providerId).trim();
  if (!normalized) return null;
  if (normalized === PROVIDER_SWITCH_POLICY.azure.id) return PROVIDER_SWITCH_POLICY.azure;
  if (normalized === PROVIDER_SWITCH_POLICY.cloudflare.id) return PROVIDER_SWITCH_POLICY.cloudflare;
  return null;
}

export function toTokyoDateString(date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: PROVIDER_SWITCH_POLICY.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
