export const FREE_MONTHLY_FILL_LIMIT = 20;

export const PLAN_LIMITS = {
  free: { monthly_fills: FREE_MONTHLY_FILL_LIMIT, multiple_profiles: false },
  plus: { monthly_fills: Infinity, multiple_profiles: true },
  pro: { monthly_fills: Infinity, multiple_profiles: true, company_profiles: true },
  team: { monthly_fills: Infinity, multiple_profiles: true, shared_templates: true }
};

export function getCurrentMonthKey(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit"
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}`;
}

export function canUseFill({ entitlement = {}, usage = {}, date = new Date() }) {
  const plan = entitlement.plan || "free";
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  const monthKey = getCurrentMonthKey(date);
  const currentFills = usage[monthKey]?.fills || 0;
  if (limits.monthly_fills === Infinity || currentFills < limits.monthly_fills) {
    return { allowed: true, plan, current_fills: currentFills, limit: limits.monthly_fills };
  }
  return { allowed: false, plan, current_fills: currentFills, limit: limits.monthly_fills };
}

export function createUsageEvent({ url, fields_scanned, fields_filled, plan, items = [], date = new Date() }) {
  return {
    receipt_id: `rcpt_${date.getTime().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    type: "form_fill",
    month: getCurrentMonthKey(date),
    timestamp: date.toISOString(),
    origin: safeOrigin(url),
    fields_scanned,
    fields_filled,
    plan: plan || "free",
    items: sanitizeReceiptItems(items)
  };
}

function safeOrigin(url) {
  try {
    const parsed = new URL(url);
    return parsed.origin;
  } catch {
    return "local_or_unknown";
  }
}

function sanitizeReceiptItems(items = []) {
  return items
    .filter((item) => item && ["fill", "select"].includes(item.action))
    .slice(0, 80)
    .map((item) => ({
      field_id: item.field_id || "",
      label: String(item.display_label || item.profile_key || item.field_id || "").slice(0, 120),
      profile_key: item.profile_key || "",
      confidence: Number.isFinite(Number(item.confidence)) ? Number(item.confidence) : 0,
      confidence_band: item.confidence_band || "",
      sensitive_tier: item.sensitive_tier || null
    }));
}
