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

export function createUsageEvent({ url, fields_scanned, fields_filled, plan, date = new Date() }) {
  return {
    type: "form_fill",
    month: getCurrentMonthKey(date),
    timestamp: date.toISOString(),
    origin: safeOrigin(url),
    fields_scanned,
    fields_filled,
    plan: plan || "free"
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
