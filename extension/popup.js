import { SEMANTIC_LABELS, buildSchema, buildInputPlan } from "./src/schema-engine.js";
import { SAMPLE_PROFILE } from "./src/profile-formatters.js";
import { getProviderForDate } from "./src/provider-router.js";
import { canUseFill, createUsageEvent, FREE_MONTHLY_FILL_LIMIT, getCurrentMonthKey } from "./src/usage-meter.js";
import { fetchEntitlement } from "./src/entitlement-client.js";
import {
  VAULT_STORAGE_KEY,
  buildMemoryContext,
  getActiveProfileValues,
  learnMappingsFromPlan,
  normalizeVaultState,
  recordCorrectionEvent,
  summarizeMemory,
  updateActiveProfileValues
} from "./src/profile-memory.js";

const profileJson = document.getElementById("profileJson");
const loadSample = document.getElementById("loadSample");
const saveProfile = document.getElementById("saveProfile");
const scanPage = document.getElementById("scanPage");
const fillPage = document.getElementById("fillPage");
const planSummary = document.getElementById("planSummary");
const planList = document.getElementById("planList");
const providerStatus = document.getElementById("providerStatus");
const usageStatus = document.getElementById("usageStatus");
const upgradePlan = document.getElementById("upgradePlan");
const memoryStatus = document.getElementById("memoryStatus");
const licenseKey = document.getElementById("licenseKey");
const checkLicense = document.getElementById("checkLicense");

const PRICING_URL = "https://example.com/ai-form-autofill";

let currentPlan = [];
let currentFields = [];
let entitlement = { plan: "free" };
let usage = {};
let vaultState = null;

init();

async function init() {
  const provider = getProviderForDate(new Date());
  providerStatus.textContent = provider.label;

  const stored = await chrome.storage.local.get(["profile", "entitlement", "usage", "licenseKey", VAULT_STORAGE_KEY]);
  entitlement = stored.entitlement || entitlement;
  usage = stored.usage || {};
  vaultState = normalizeVaultState(stored[VAULT_STORAGE_KEY], { profile: stored.profile || SAMPLE_PROFILE });
  profileJson.value = JSON.stringify(getActiveProfileValues(vaultState), null, 2);
  licenseKey.value = stored.licenseKey || "";
  await chrome.storage.local.set({ [VAULT_STORAGE_KEY]: vaultState });
  renderUsage();
  renderMemory();
}

loadSample.addEventListener("click", () => {
  profileJson.value = JSON.stringify(SAMPLE_PROFILE, null, 2);
});

saveProfile.addEventListener("click", async () => {
  const profile = parseProfile();
  vaultState = updateActiveProfileValues(vaultState, profile);
  await chrome.storage.local.set({ [VAULT_STORAGE_KEY]: vaultState, profile });
  planSummary.textContent = "Profile saved to local Vault.";
  renderMemory();
});

scanPage.addEventListener("click", async () => {
  const profile = parseProfile();
  vaultState = updateActiveProfileValues(vaultState, profile);
  await chrome.storage.local.set({ [VAULT_STORAGE_KEY]: vaultState, profile });
  const tab = await getActiveTab();
  await ensureContentScript(tab.id);
  const response = await chrome.tabs.sendMessage(tab.id, { type: "AFA_COLLECT_FIELDS" });
  const fields = response?.fields || [];
  currentFields = fields;
  const memoryContext = buildMemoryContext({ vaultState, url: tab.url || "", fields });
  const schema = buildSchema(fields, { memoryContext });
  currentPlan = buildInputPlan({ fields, schema, profile });
  renderPlan(currentPlan, fields.length);
  renderMemory(memoryContext);
});

fillPage.addEventListener("click", async () => {
  const fillable = currentPlan.filter((item) => item.action === "fill" || item.action === "select");
  const gate = canUseFill({ entitlement, usage, date: new Date() });
  if (!gate.allowed) {
    planSummary.textContent = "Free monthly limit reached. Upgrade to continue filling forms.";
    renderUsage();
    return;
  }
  const tab = await getActiveTab();
  await ensureContentScript(tab.id);
  const response = await chrome.tabs.sendMessage(tab.id, { type: "AFA_FILL_FIELDS", plan: fillable });
  if ((response?.filled || 0) > 0) {
    vaultState = learnMappingsFromPlan({
      vaultState,
      url: tab.url || "",
      fields: currentFields,
      plan: fillable,
      date: new Date()
    });
    const event = createUsageEvent({
      url: tab.url || "",
      fields_scanned: currentPlan.length,
      fields_filled: response.filled,
      plan: entitlement.plan,
      date: new Date()
    });
    const monthKey = getCurrentMonthKey(new Date());
    usage = {
      ...usage,
      [monthKey]: {
        fills: (usage[monthKey]?.fills || 0) + 1,
        fields_filled: (usage[monthKey]?.fields_filled || 0) + response.filled,
        events: [...(usage[monthKey]?.events || []), event].slice(-100)
      }
    };
    await chrome.storage.local.set({ usage, [VAULT_STORAGE_KEY]: vaultState });
    renderMemory(buildMemoryContext({ vaultState, url: tab.url || "", fields: currentFields }));
  }
  planSummary.textContent = `Filled ${response?.filled || 0} fields. Please review before submit.`;
  renderUsage();
});

upgradePlan.addEventListener("click", () => {
  const license = ensureLicenseKey();
  chrome.storage.local.set({ licenseKey: license });
  chrome.tabs.create({ url: `${PRICING_URL}/?license_key=${encodeURIComponent(license)}#pricing` });
});

checkLicense.addEventListener("click", async () => {
  try {
    const license = licenseKey.value.trim();
    const remoteEntitlement = await fetchEntitlement({ licenseKey: license });
    entitlement = remoteEntitlement.active ? remoteEntitlement : { plan: "free", status: remoteEntitlement.status };
    await chrome.storage.local.set({ entitlement, licenseKey: license });
    renderUsage();
    planSummary.textContent = remoteEntitlement.active
      ? `${remoteEntitlement.plan.toUpperCase()} license active.`
      : "License was not active. Free plan remains enabled.";
  } catch (error) {
    planSummary.textContent = `License check failed: ${error.message}`;
  }
});

function parseProfile() {
  try {
    return JSON.parse(profileJson.value);
  } catch (error) {
    throw new Error(`Profile JSON is invalid: ${error.message}`);
  }
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("No active tab");
  return tab;
}

async function ensureContentScript(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["src/collector.js"]
  });
}

function renderPlan(plan, fieldCount) {
  const fillable = plan.filter((item) => item.action === "fill" || item.action === "select");
  const asks = plan.filter((item) => item.action === "ask");
  fillPage.disabled = fillable.length === 0;
  planSummary.textContent = `${fieldCount} fields scanned / ${fillable.length} ready / ${asks.length} need review`;
  planList.innerHTML = "";

  for (const item of plan) {
    const row = document.createElement("div");
    row.className = `plan-item ${item.action === "ask" ? "ask" : ""}`;

    const left = document.createElement("div");
    const label = document.createElement("div");
    label.className = "plan-label";
    label.textContent = item.display_label || item.profile_key || item.field_id;
    const value = document.createElement("div");
    value.className = "plan-value";
    const source = item.source === "mapping_cache" || item.source === "user_correction" ? "Memory" : "Rules";
    value.textContent = item.action === "ask"
      ? "Uncertain. User should answer manually."
      : `${item.value_preview} / ${source}`;
    left.append(label, value);
    if (item.action === "ask") {
      left.append(createCorrectionControls(item));
    }

    const confidence = document.createElement("div");
    confidence.className = "confidence";
    confidence.textContent = `${Math.round((item.confidence || 0) * 100)}%`;

    row.append(left, confidence);
    planList.append(row);
  }
}

function renderUsage() {
  const monthKey = getCurrentMonthKey(new Date());
  const fills = usage[monthKey]?.fills || 0;
  if (entitlement.plan && entitlement.plan !== "free") {
    usageStatus.textContent = `${entitlement.plan.toUpperCase()} plan / ${fills} fills this month`;
    return;
  }
  usageStatus.textContent = `Free usage: ${fills}/${FREE_MONTHLY_FILL_LIMIT} fills this month`;
}

function ensureLicenseKey() {
  const current = licenseKey.value.trim();
  if (current) return current;
  const generated = `afa_${crypto.randomUUID().replace(/-/g, "")}`;
  licenseKey.value = generated;
  return generated;
}

function createCorrectionControls(item) {
  const controls = document.createElement("div");
  controls.className = "correction-controls";

  const select = document.createElement("select");
  select.setAttribute("aria-label", "Profile key");

  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = "Remember as...";
  select.append(empty);

  for (const [key, label] of Object.entries(SEMANTIC_LABELS)) {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = `${label} (${key})`;
    select.append(option);
  }

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Learn";
  button.addEventListener("click", () => rememberCorrection(item, select.value));

  controls.append(select, button);
  return controls;
}

async function rememberCorrection(item, profileKey) {
  if (!profileKey) return;
  const field = currentFields.find((entry) => entry.field_id === item.field_id);
  if (!field) return;

  const tab = await getActiveTab();
  vaultState = recordCorrectionEvent({
    vaultState,
    url: tab.url || "",
    field,
    from_profile_key: item.profile_key,
    to_profile_key: profileKey,
    date: new Date()
  });
  await chrome.storage.local.set({ [VAULT_STORAGE_KEY]: vaultState });

  const profile = parseProfile();
  const memoryContext = buildMemoryContext({ vaultState, url: tab.url || "", fields: currentFields });
  const schema = buildSchema(currentFields, { memoryContext });
  currentPlan = buildInputPlan({ fields: currentFields, schema, profile });
  renderPlan(currentPlan, currentFields.length);
  renderMemory(memoryContext);
  planSummary.textContent = "Memory updated. Review the refreshed input plan.";
}

function renderMemory(memoryContext = null) {
  if (!memoryStatus) return;
  const summary = summarizeMemory(vaultState);
  const hits = memoryContext ? Object.keys(memoryContext.field_mappings || {}).length : 0;
  memoryStatus.textContent = `${summary.profiles} profile / ${summary.mapping_cache} learned mappings / ${hits} hits on this form`;
}
