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
    primary_model: "@cf/zai-org/glm-4.7-flash",
    fallback_model: "@cf/qwen/qwen3-30b-a3b-fp8",
    free_allocation: "10000_neurons_per_day",
    call_from: "server_proxy_or_worker_only"
  }
};

export function getProviderForDate(date = new Date()) {
  const ymd = toTokyoDateString(date);
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

