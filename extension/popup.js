import { SEMANTIC_LABELS, buildSchema, buildInputPlan } from "./src/schema-engine.js";
import { inferSchemaFromApi } from "./src/schema-client.js";
import { SAMPLE_PROFILE, getCustomProfileEntries, readPath } from "./src/profile-formatters.js";
import { lookupJapaneseAddressByPostalCode, normalizePostalCode } from "./src/postal-code-client.js";
import { getProviderForDate } from "./src/provider-router.js";
import { canUseFill, createUsageEvent, FREE_MONTHLY_FILL_LIMIT, getCurrentMonthKey } from "./src/usage-meter.js";
import { fetchEntitlement } from "./src/entitlement-client.js";
import { PUBLIC_BASE_URL } from "./src/release-config.js";
import {
  VAULT_STORAGE_KEY,
  buildMemoryContext,
  getActiveProfileValues,
  learnMappingsFromPlan,
  recordCorrectionEvent,
  summarizeMemory,
  updateActiveProfileValues
} from "./src/profile-memory.js";
import { loadRuntimeVaultState, persistVaultState } from "./src/vault-crypto.js";

const profileForm = document.getElementById("profileForm");
const loadSample = document.getElementById("loadSample");
const saveProfile = document.getElementById("saveProfile");
const saveStatus = document.getElementById("saveStatus");
const scanPage = document.getElementById("scanPage");
const fillPage = document.getElementById("fillPage");
const planSummary = document.getElementById("planSummary");
const planStats = document.getElementById("planStats");
const planList = document.getElementById("planList");
const providerStatus = document.getElementById("providerStatus");
const usageStatus = document.getElementById("usageStatus");
const upgradePlan = document.getElementById("upgradePlan");
const memoryStatus = document.getElementById("memoryStatus");
const licenseKey = document.getElementById("licenseKey");
const checkLicense = document.getElementById("checkLicense");
const settingsToggle = document.getElementById("settingsToggle");
const settingsContent = document.getElementById("settingsContent");
const saveProfileRow = document.getElementById("saveProfileRow");
const helpButton = document.querySelector(".help-button");
const customFieldList = document.getElementById("customFieldList");
const addCustomField = document.getElementById("addCustomField");
const ledgerSearch = document.getElementById("ledgerSearch");
const postalLookupStatus = document.getElementById("postalLookupStatus");
const ledgerPresetButtons = Array.from(document.querySelectorAll("[data-ledger-preset]"));
const settingsTabs = Array.from(document.querySelectorAll("[data-settings-tab]"));
const settingsSections = Array.from(document.querySelectorAll("[data-settings-section]"));
const profileInputIds = {
  last: "profileLast",
  first: "profileFirst",
  lastKana: "profileLastKana",
  firstKana: "profileFirstKana",
  email: "profileEmail",
  phone1: "profilePhone1",
  phone2: "profilePhone2",
  phone3: "profilePhone3",
  postal: "profilePostal",
  prefecture: "profilePrefecture",
  city: "profileCity",
  address1: "profileAddress1",
  address2: "profileAddress2",
  company: "profileCompany",
  title: "profileTitle"
};

const PRICING_URL = PUBLIC_BASE_URL;

let currentPlan = [];
let currentFields = [];
let currentLocaleContext = {};
let entitlement = { plan: "free" };
let usage = {};
let vaultState = null;

init();

async function init() {
  localizeStaticText();
  providerStatus.textContent = "";
  settingsToggle.textContent = `${t("profileVault")} / ${t("profileCustom")} / ${t("plan")}`;
  settingsToggle.setAttribute("aria-expanded", "false");
  fillPage.textContent = t("fillAfterCheck");
  helpButton.title = t("footnote");
  setSettingsTab("profile");

  const stored = await chrome.storage.local.get(["profile", "entitlement", "usage", "licenseKey", VAULT_STORAGE_KEY]);
  entitlement = stored.entitlement || entitlement;
  usage = stored.usage || {};
  vaultState = await loadRuntimeVaultState(stored[VAULT_STORAGE_KEY], {
    storage: chrome.storage.local,
    profile: stored.profile || createEmptyProfile()
  });
  populateProfileForm(getActiveProfileValues(vaultState));
  licenseKey.value = stored.licenseKey || "";
  await persistVaultState(chrome.storage.local, vaultState);
  if (stored.profile) await chrome.storage.local.remove("profile");
  renderUsage();
  renderMemory();
}

settingsToggle.addEventListener("click", () => {
  settingsContent.hidden = !settingsContent.hidden;
  settingsToggle.setAttribute("aria-expanded", String(!settingsContent.hidden));
});

loadSample.addEventListener("click", () => {
  populateProfileForm(SAMPLE_PROFILE);
});

addCustomField.addEventListener("click", () => {
  addCustomFieldRow();
  filterLedgerRows();
});

for (const tab of settingsTabs) {
  tab.addEventListener("click", () => setSettingsTab(tab.dataset.settingsTab));
}

document.getElementById("profilePostal")?.addEventListener("input", () => {
  void autoLookupAddressFromPostalCode();
});

document.getElementById("profilePostal")?.addEventListener("blur", () => {
  const input = document.getElementById("profilePostal");
  if (input) input.value = formatPostalInput(input.value);
});

ledgerSearch?.addEventListener("input", filterLedgerRows);

for (const button of ledgerPresetButtons) {
  button.addEventListener("click", () => addLedgerPreset(button.dataset.ledgerPreset));
}

saveProfile.addEventListener("click", async () => {
  const profile = readProfileForm();
  vaultState = updateActiveProfileValues(vaultState, profile);
  await persistVaultState(chrome.storage.local, vaultState);
  await chrome.storage.local.remove("profile");
  planSummary.textContent = t("profileSaved");
  showSaveStatus(t("profileSavedShort"));
  renderMemory();
});

scanPage.addEventListener("click", async () => {
  scanPage.disabled = true;
  fillPage.disabled = true;
  scanPage.textContent = t("checkingForm");
  fillPage.textContent = t("fillAfterCheck");
  setWorkflowStage("scan");
  try {
    const profile = readProfileForm();
    vaultState = updateActiveProfileValues(vaultState, profile);
    await persistVaultState(chrome.storage.local, vaultState);
    await chrome.storage.local.remove("profile");
    const tab = await getActiveTab();
    await ensureContentScript(tab.id);
    const response = await chrome.tabs.sendMessage(tab.id, { type: "AFA_COLLECT_FIELDS" });
    const fields = response?.fields || [];
    currentLocaleContext = response?.locale_context || {};
    currentFields = fields;
    const memoryContext = buildMemoryContext({ vaultState, url: tab.url || "", fields, localeContext: currentLocaleContext });
    if (fields.length === 0) {
      currentPlan = [];
      renderNoFormFound();
      renderMemory(memoryContext);
      return;
    }
    const provider = getProviderForDate(new Date());
    const schema = await inferSchemaWithFallback({ fields, memoryContext, provider });
    currentPlan = buildInputPlan({ fields, schema, profile });
    renderPlan(currentPlan, fields.length);
    renderMemory(memoryContext);
  } finally {
    scanPage.disabled = false;
    scanPage.textContent = t("checkAgain");
  }
});

fillPage.addEventListener("click", async () => {
  const fillable = currentPlan.filter((item) => item.action === "fill" || item.action === "select");
  const gate = canUseFill({ entitlement, usage, date: new Date() });
  if (!gate.allowed) {
    planSummary.textContent = t("freeLimitReached");
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
    await chrome.storage.local.set({ usage });
    await persistVaultState(chrome.storage.local, vaultState);
    renderMemory(buildMemoryContext({ vaultState, url: tab.url || "", fields: currentFields, localeContext: currentLocaleContext }));
  }
  planSummary.textContent = t("filledReview", [String(response?.filled || 0)]);
  fillPage.textContent = t("filledButton", [String(response?.filled || 0)]);
  setWorkflowStage("done");
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
      ? t("licenseActive", [remoteEntitlement.plan.toUpperCase()])
      : t("licenseInactive");
  } catch (error) {
    planSummary.textContent = t("licenseFailed", [error.message]);
  }
});

function readProfileForm() {
  const base = cloneProfile(getActiveProfileValues(vaultState) || SAMPLE_PROFILE);
  const values = Object.fromEntries(
    Object.entries(profileInputIds).map(([key, id]) => [key, document.getElementById(id)?.value.trim() || ""])
  );
  base.person ||= {};
  base.person.name ||= {};
  base.person.email ||= {};
  base.person.phone ||= {};
  base.person.address ||= {};
  base.company ||= {};
  base.account ||= {};
  const customEntries = readCustomFieldRows();

  base.person.name.last = values.last;
  base.person.name.first = values.first;
  base.person.name.full = [values.last, values.first].filter(Boolean).join(" ");
  base.person.name.last_kana = values.lastKana;
  base.person.name.first_kana = values.firstKana;
  base.person.name.full_kana = [values.lastKana, values.firstKana].filter(Boolean).join(" ");
  base.person.email.primary = values.email;
  const phone = combinePhoneParts(values.phone1, values.phone2, values.phone3);
  base.person.phone.mobile_hyphen = phone.hyphen;
  base.person.phone.mobile = phone.digits;
  base.person.address.postal_code_hyphen = values.postal;
  base.person.address.postal_code = values.postal.replace(/\D/g, "");
  base.person.address.prefecture = values.prefecture;
  base.person.address.city = values.city;
  base.person.address.line1 = values.address1;
  base.person.address.line2 = values.address2;
  base.person.address.full = [values.prefecture, values.city, values.address1, values.address2].filter(Boolean).join("");
  base.person.address.country ||= "日本";
  base.person.address.country_code ||= "JP";
  base.company.name = values.company;
  base.company.title = values.title;
  base.custom = Object.fromEntries(customEntries.map((entry) => [entry.key, entry.value]));
  base.custom_labels = Object.fromEntries(customEntries.map((entry) => [entry.key, entry.label]));
  base.custom_aliases = Object.fromEntries(customEntries.map((entry) => [entry.key, entry.aliases]));
  base.custom_categories = Object.fromEntries(customEntries.map((entry) => [entry.key, entry.category]));
  base.custom_order = customEntries.map((entry) => entry.key);
  base.account.default_password_policy ||= "generate";
  return base;
}

function populateProfileForm(profile = {}) {
  const values = {
    last: readPath(profile, "person.name.last"),
    first: readPath(profile, "person.name.first"),
    lastKana: readPath(profile, "person.name.last_kana"),
    firstKana: readPath(profile, "person.name.first_kana"),
    email: readPath(profile, "person.email.primary"),
    phone: readPath(profile, "person.phone.mobile_hyphen") || readPath(profile, "person.phone.mobile"),
    postal: readPath(profile, "person.address.postal_code_hyphen") || readPath(profile, "person.address.postal_code"),
    prefecture: readPath(profile, "person.address.prefecture"),
    city: readPath(profile, "person.address.city"),
    address1: readPath(profile, "person.address.line1"),
    address2: readPath(profile, "person.address.line2"),
    company: readPath(profile, "company.name"),
    title: readPath(profile, "company.title")
  };

  const phoneParts = splitPhoneNumber(values.phone);
  const displayValues = { ...values, phone1: phoneParts[0], phone2: phoneParts[1], phone3: phoneParts[2] };
  for (const [key, id] of Object.entries(profileInputIds)) {
    const input = document.getElementById(id);
    if (input) input.value = displayValues[key] || "";
  }

  renderCustomFields(profile);
}

function renderCustomFields(profile = {}) {
  customFieldList.innerHTML = "";
  const entries = getCustomProfileEntries(profile);
  if (entries.length === 0) {
    addCustomFieldRow();
    return;
  }

  for (const entry of entries) {
    addCustomFieldRow({
      key: entry.key,
      label: entry.label,
      value: entry.value,
      aliases: entry.aliases,
      category: entry.category
    });
  }
}

function addCustomFieldRow({ key = createCustomKey(), label = "", value = "", aliases = [], category = "basic" } = {}) {
  const row = document.createElement("div");
  row.className = "custom-field-row";
  row.dataset.customKey = key;

  const categoryInput = document.createElement("select");
  categoryInput.className = "custom-category-input";
  categoryInput.setAttribute("aria-label", t("customCategory"));
  for (const [value, labelKey] of [
    ["basic", "customCategoryBasic"],
    ["id", "customCategoryId"],
    ["sheet", "customCategorySheet"],
    ["work", "customCategoryWork"],
    ["other", "customCategoryOther"]
  ]) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = t(labelKey);
    categoryInput.append(option);
  }
  categoryInput.value = category;

  const labelInput = document.createElement("input");
  labelInput.className = "custom-key-input";
  labelInput.value = label;
  labelInput.setAttribute("aria-label", t("customKey"));
  labelInput.setAttribute("placeholder", t("customKeyPlaceholder"));

  const valueInput = document.createElement("input");
  valueInput.className = "custom-value-input";
  valueInput.value = value || "";
  valueInput.setAttribute("aria-label", t("customValue"));
  valueInput.setAttribute("placeholder", t("customValuePlaceholder"));

  const aliasInput = document.createElement("input");
  aliasInput.className = "custom-alias-input";
  aliasInput.value = Array.isArray(aliases) ? aliases.join(", ") : "";
  aliasInput.setAttribute("aria-label", t("customAliases"));
  aliasInput.setAttribute("placeholder", t("customAliasPlaceholder"));

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "custom-remove";
  remove.textContent = "x";
  remove.title = t("removeCustomField");
  remove.setAttribute("aria-label", t("removeCustomField"));
  remove.addEventListener("click", () => {
    row.remove();
    if (customFieldList.children.length === 0) addCustomFieldRow();
  });

  row.append(
    createLedgerCell("customCategory", categoryInput),
    createLedgerCell("customKey", labelInput),
    createLedgerCell("customValue", valueInput),
    createLedgerCell("customAliases", aliasInput),
    remove
  );
  customFieldList.append(row);
  filterLedgerRows();
}

function createLedgerCell(labelKey, input) {
  const label = document.createElement("label");
  label.className = "custom-ledger-cell";
  const text = document.createElement("span");
  text.textContent = t(labelKey);
  label.append(text, input);
  return label;
}

function readCustomFieldRows() {
  const entries = [];
  const usedKeys = new Set();
  for (const row of customFieldList.querySelectorAll(".custom-field-row")) {
    const label = row.querySelector(".custom-key-input")?.value.trim() || "";
    const value = row.querySelector(".custom-value-input")?.value.trim() || "";
    const aliases = splitAliases(row.querySelector(".custom-alias-input")?.value || "");
    const category = row.querySelector(".custom-category-input")?.value || "basic";
    if (!label && !value && aliases.length === 0) continue;

    let key = row.dataset.customKey || createCustomKey(label);
    if (usedKeys.has(key)) key = createCustomKey(label);
    usedKeys.add(key);
    row.dataset.customKey = key;
    entries.push({
      key,
      label: label || key,
      value,
      aliases,
      category
    });
  }
  return entries;
}

function splitAliases(value = "") {
  return String(value)
    .split(/[,、，\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter((entry, index, array) => array.indexOf(entry) === index);
}

function createCustomKey(seed = "") {
  const slug = String(seed)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  return `${slug || "item"}_${suffix}`;
}

function cloneProfile(profile) {
  return JSON.parse(JSON.stringify(profile || {}));
}

function createEmptyProfile() {
  return {
    person: {
      name: {},
      email: {},
      phone: {},
      address: { country: "日本", country_code: "JP" }
    },
    company: {},
    custom: {},
    custom_labels: {},
    custom_aliases: {},
    custom_categories: {},
    custom_order: [],
    account: { default_password_policy: "generate" }
  };
}

function splitPhoneNumber(value = "") {
  const digits = String(value).replace(/\D/g, "");
  if (digits.length >= 10) return [digits.slice(0, 3), digits.slice(3, 7), digits.slice(7, 11)];
  return String(value).split("-").concat(["", "", ""]).slice(0, 3);
}

function combinePhoneParts(part1 = "", part2 = "", part3 = "") {
  const parts = [part1, part2, part3].map((part) => String(part || "").replace(/\D/g, "")).filter(Boolean);
  const digits = parts.join("");
  return {
    digits,
    hyphen: parts.length > 1 ? parts.join("-") : digits
  };
}

function formatPostalInput(value = "") {
  const normalized = normalizePostalCode(value);
  if (normalized.length !== 7) return value;
  return `${normalized.slice(0, 3)}-${normalized.slice(3)}`;
}

let postalLookupTimer = null;
async function autoLookupAddressFromPostalCode() {
  clearTimeout(postalLookupTimer);
  postalLookupTimer = setTimeout(async () => {
    const postalInput = document.getElementById("profilePostal");
    const postalCode = normalizePostalCode(postalInput?.value || "");
    if (postalCode.length !== 7) {
      setPostalLookupStatus("");
      return;
    }
    try {
      setPostalLookupStatus(t("postalLookupSearching"));
      const address = await lookupJapaneseAddressByPostalCode({ postalCode });
      if (!address) {
        setPostalLookupStatus(t("postalLookupNotFound"), "warning");
        return;
      }
      if (postalInput) postalInput.value = address.postal_code;
      setInputValue("profilePrefecture", address.prefecture);
      setInputValue("profileCity", address.city);
      setInputValue("profileAddress1", address.line1);
      setPostalLookupStatus(t("postalLookupFilled"), "success");
    } catch (_error) {
      setPostalLookupStatus(t("postalLookupFailed"), "warning");
    }
  }, 260);
}

function setInputValue(id, value) {
  const input = document.getElementById(id);
  if (input && value) input.value = value;
}

function setPostalLookupStatus(message = "", type = "") {
  if (!postalLookupStatus) return;
  postalLookupStatus.textContent = message;
  postalLookupStatus.dataset.status = type;
}

function showSaveStatus(message) {
  if (!saveStatus) return;
  saveStatus.textContent = message;
  saveStatus.dataset.status = "success";
  clearTimeout(showSaveStatus.timer);
  showSaveStatus.timer = setTimeout(() => {
    saveStatus.textContent = "";
    delete saveStatus.dataset.status;
  }, 2600);
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error(t("noActiveTab"));
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
  const fieldById = new Map(currentFields.map((field) => [field.field_id, field]));
  fillPage.disabled = fillable.length === 0;
  fillPage.textContent = fillable.length > 0 ? t("fillCount", [String(fillable.length)]) : t("fillAfterCheck");
  planSummary.textContent = t("planSummary", [String(fieldCount), String(fillable.length), String(asks.length)]);
  renderPlanStats({ fieldCount, fillableCount: fillable.length, askCount: asks.length });
  setWorkflowStage(fillable.length > 0 ? "fill" : "scan");
  planList.innerHTML = "";

  for (const item of plan) {
    const row = document.createElement("div");
    row.className = `plan-item ${item.action === "ask" ? "ask" : ""}`;

    const field = fieldById.get(item.field_id);
    const left = document.createElement("div");
    const pair = document.createElement("div");
    pair.className = "plan-pair";
    const pageSide = createPlanSide({
      caption: t("formSide"),
      text: pageFieldLabel(field, item)
    });
    const savedSide = createPlanSide({
      caption: item.action === "ask" ? t("manualEntry") : t("savedSide"),
      text: item.action === "ask" ? t("uncertainManual") : formatSavedValue(item),
      strong: item.action !== "ask"
    });
    pair.append(pageSide, savedSide);
    left.append(pair);
    if (item.action === "ask") {
      left.append(createCorrectionControls(item));
      left.append(createDetectedLedgerControls(item, field));
    }

    const confidence = document.createElement("div");
    confidence.className = `status-badge ${item.action === "ask" ? "needs-check" : "ready"}`;
    confidence.textContent = item.action === "ask" ? t("needsManual") : t("inputOk");
    confidence.title = `${Math.round((item.confidence || 0) * 100)}%`;

    row.append(left, confidence);
    planList.append(row);
  }
}

function renderNoFormFound() {
  fillPage.disabled = true;
  fillPage.textContent = t("fillAfterCheck");
  planSummary.textContent = t("noFormFound");
  renderPlanStats({ fieldCount: 0, fillableCount: 0, askCount: 0, noForm: true });
  setWorkflowStage("scan");
  planList.innerHTML = "";
  const empty = document.createElement("div");
  empty.className = "empty-state";
  empty.textContent = t("noFormHint");
  planList.append(empty);
}

function createPlanSide({ caption, text, strong = false }) {
  const side = document.createElement("div");
  side.className = `plan-side ${strong ? "strong" : ""}`;
  const captionNode = document.createElement("div");
  captionNode.className = "plan-caption";
  captionNode.textContent = caption;
  const textNode = document.createElement("div");
  textNode.className = "plan-text";
  textNode.textContent = text || "-";
  side.append(captionNode, textNode);
  return side;
}

function pageFieldLabel(field, item) {
  return field?.label || field?.placeholder || field?.name || field?.id || item.display_label || item.field_id;
}

function formatSavedValue(item) {
  const label = semanticLabel(item.profile_key) || item.display_label || item.profile_key || "";
  const value = item.profile_key === "account.password.generated" ? "••••••••" : item.value_preview;
  return label ? `${label}: ${value}` : value;
}

function renderUsage() {
  const monthKey = getCurrentMonthKey(new Date());
  const fills = usage[monthKey]?.fills || 0;
  if (entitlement.plan && entitlement.plan !== "free") {
    usageStatus.textContent = t("paidUsage", [entitlement.plan.toUpperCase(), String(fills)]);
    return;
  }
  usageStatus.textContent = t("freeUsage", [String(fills), String(FREE_MONTHLY_FILL_LIMIT)]);
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
  select.setAttribute("aria-label", t("profileKey"));

  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = t("rememberAs");
  select.append(empty);

  for (const [key, label] of Object.entries(SEMANTIC_LABELS)) {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = `${semanticLabel(key) || label} (${key})`;
    select.append(option);
  }

  const customEntries = getCustomProfileEntries(readProfileForm());
  if (customEntries.length > 0) {
    const separator = document.createElement("option");
    separator.disabled = true;
    separator.textContent = `-- ${t("profileCustom")} --`;
    select.append(separator);
  }
  for (const entry of customEntries) {
    const option = document.createElement("option");
    option.value = entry.profile_key;
    option.textContent = `${entry.label} (${entry.profile_key})`;
    select.append(option);
  }

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = t("learn");
  button.addEventListener("click", () => rememberCorrection(item, select.value));

  controls.append(select, button);
  return controls;
}

function createDetectedLedgerControls(item, field) {
  const controls = document.createElement("div");
  controls.className = "detected-ledger-controls";

  const title = document.createElement("div");
  title.className = "detected-ledger-title";
  title.textContent = t("detectedLedgerTitle");
  const hint = document.createElement("div");
  hint.className = "detected-ledger-hint";
  hint.textContent = t("detectedLedgerHint");

  const labelInput = document.createElement("input");
  labelInput.value = pageFieldLabel(field, item);
  labelInput.setAttribute("aria-label", t("customKey"));
  labelInput.setAttribute("placeholder", t("customKeyPlaceholder"));

  const valueInput = document.createElement("input");
  valueInput.setAttribute("aria-label", t("customValue"));
  valueInput.setAttribute("placeholder", t("customValuePlaceholder"));

  const aliasInput = document.createElement("input");
  aliasInput.value = suggestedAliases(field, labelInput.value).join(", ");
  aliasInput.setAttribute("aria-label", t("customAliases"));
  aliasInput.setAttribute("placeholder", t("customAliasPlaceholder"));

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = t("addDetectedField");
  button.addEventListener("click", () => addDetectedFieldToLedger({
    item,
    field,
    label: labelInput.value,
    value: valueInput.value,
    aliases: aliasInput.value
  }));

  controls.append(
    title,
    hint,
    createLedgerCell("customKey", labelInput),
    createLedgerCell("customValue", valueInput),
    createLedgerCell("customAliases", aliasInput),
    button
  );
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
  await persistVaultState(chrome.storage.local, vaultState);

  const profile = readProfileForm();
  const memoryContext = buildMemoryContext({ vaultState, url: tab.url || "", fields: currentFields, localeContext: currentLocaleContext });
  const schema = buildSchema(currentFields, { memoryContext });
  currentPlan = buildInputPlan({ fields: currentFields, schema, profile });
  renderPlan(currentPlan, currentFields.length);
  renderMemory(memoryContext);
  planSummary.textContent = t("memoryUpdated");
}

async function addDetectedFieldToLedger({ item, field, label, value, aliases }) {
  const fieldLabel = String(label || "").trim() || pageFieldLabel(field, item);
  if (!fieldLabel) return;

  const profile = readProfileForm();
  const key = createCustomKey(fieldLabel);
  const aliasList = splitAliases(aliases);
  profile.custom ||= {};
  profile.custom_labels ||= {};
  profile.custom_aliases ||= {};
  profile.custom_categories ||= {};
  profile.custom_order = Array.isArray(profile.custom_order) ? profile.custom_order : [];
  profile.custom[key] = String(value || "").trim();
  profile.custom_labels[key] = fieldLabel;
  profile.custom_aliases[key] = aliasList;
  profile.custom_categories[key] = "other";
  profile.custom_order.push(key);

  populateProfileForm(profile);
  settingsContent.hidden = false;
  settingsToggle.setAttribute("aria-expanded", "true");
  setSettingsTab("ledger");
  highlightCustomRow(key);
  vaultState = updateActiveProfileValues(vaultState, readProfileForm());
  await persistVaultState(chrome.storage.local, vaultState);
  await chrome.storage.local.remove("profile");
  await rememberCorrection(item, `custom.${key}`);
}

function highlightCustomRow(key) {
  for (const row of customFieldList.querySelectorAll(".custom-field-row")) {
    if (row.dataset.customKey !== key) continue;
    row.classList.add("just-added");
    row.scrollIntoView({ block: "nearest" });
    setTimeout(() => row.classList.remove("just-added"), 1800);
    break;
  }
}

function setSettingsTab(tabName = "profile") {
  for (const tab of settingsTabs) {
    const selected = tab.dataset.settingsTab === tabName;
    tab.classList.toggle("is-active", selected);
    tab.setAttribute("aria-selected", String(selected));
  }
  for (const section of settingsSections) {
    section.hidden = section.dataset.settingsSection !== tabName;
  }
  if (saveProfileRow) saveProfileRow.hidden = tabName === "plan";
}

function addLedgerPreset(preset) {
  const presets = {
    customer_id: {
      category: "id",
      label: t("presetCustomerIdLabel"),
      aliases: splitAliases(t("presetCustomerIdAliases"))
    },
    sheet_term: {
      category: "sheet",
      label: t("presetSheetTermLabel"),
      aliases: splitAliases(t("presetSheetTermAliases"))
    },
    internal_id: {
      category: "work",
      label: t("presetInternalIdLabel"),
      aliases: splitAliases(t("presetInternalIdAliases"))
    }
  };
  const config = presets[preset] || {};
  settingsContent.hidden = false;
  settingsToggle.setAttribute("aria-expanded", "true");
  setSettingsTab("ledger");
  addCustomFieldRow(config);
  const row = customFieldList.lastElementChild;
  row?.classList.add("just-added");
  row?.querySelector(".custom-value-input")?.focus();
  setTimeout(() => row?.classList.remove("just-added"), 1800);
}

function filterLedgerRows() {
  const query = normalizeSearchText(ledgerSearch?.value || "");
  for (const row of customFieldList.querySelectorAll(".custom-field-row")) {
    const text = normalizeSearchText([
      row.querySelector(".custom-category-input")?.selectedOptions?.[0]?.textContent,
      row.querySelector(".custom-key-input")?.value,
      row.querySelector(".custom-value-input")?.value,
      row.querySelector(".custom-alias-input")?.value
    ].filter(Boolean).join(" "));
    row.hidden = Boolean(query) && !text.includes(query);
  }
}

function normalizeSearchText(value = "") {
  return String(value).normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
}

function renderPlanStats({ fieldCount, fillableCount, askCount, noForm = false }) {
  if (!planStats) return;
  planStats.hidden = false;
  planStats.innerHTML = "";
  const stats = noForm
    ? [{ label: t("noFormShort"), type: "warning" }]
    : [
        { label: t("fieldsFoundShort", [String(fieldCount)]), type: "neutral" },
        { label: t("canFillShort", [String(fillableCount)]), type: "ready" },
        { label: t("needsCheckShort", [String(askCount)]), type: askCount > 0 ? "warning" : "neutral" }
      ];
  for (const stat of stats) {
    const chip = document.createElement("span");
    chip.className = `stat-chip ${stat.type}`;
    chip.textContent = stat.label;
    planStats.append(chip);
  }
}

function setWorkflowStage(stage) {
  const order = ["profile", "scan", "fill"];
  const activeIndex = stage === "done" ? order.length : Math.max(0, order.indexOf(stage));
  for (const step of document.querySelectorAll(".workflow-step")) {
    const index = order.indexOf(step.dataset.step);
    step.classList.toggle("is-done", index < activeIndex || stage === "done");
    step.classList.toggle("is-active", index === activeIndex && stage !== "done");
  }
}

function suggestedAliases(field = {}, label = "") {
  return [
    label,
    field.placeholder,
    field.name,
    field.id,
    field.aria_label
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index)
    .slice(0, 4);
}

function renderMemory(memoryContext = null) {
  if (!memoryStatus) return;
  const summary = summarizeMemory(vaultState);
  const hits = memoryContext ? Object.keys(memoryContext.field_mappings || {}).length : 0;
  memoryStatus.textContent = t("memorySummary", [String(summary.profiles), String(summary.mapping_cache), String(hits)]);
}

async function inferSchemaWithFallback({ fields, memoryContext, provider }) {
  try {
    const schema = await inferSchemaFromApi({ fields, memoryContext, provider });
    providerStatus.textContent = "";
    return schema;
  } catch (error) {
    providerStatus.textContent = "";
    return buildSchema(fields, { memoryContext });
  }
}

function localizeStaticText() {
  const uiLanguage = chrome.i18n?.getUILanguage?.() || "en";
  const lang = uiLanguage.replace("_", "-");
  document.documentElement.lang = lang;
  document.documentElement.dir = /^(ar|fa|he|ur)(-|$)/i.test(lang) ? "rtl" : "ltr";
  document.title = t("extName");
  for (const node of document.querySelectorAll("[data-i18n]")) {
    const value = t(node.dataset.i18n);
    if (value) node.textContent = value;
  }
  for (const node of document.querySelectorAll("[data-i18n-placeholder]")) {
    const value = t(node.dataset.i18nPlaceholder);
    if (value) node.setAttribute("placeholder", value);
  }
}

function semanticLabel(key = "") {
  if (!key) return "";
  return t(`semantic_${key.replaceAll(".", "_")}`) || "";
}

function t(key, substitutions = []) {
  return chrome.i18n?.getMessage?.(key, substitutions) || "";
}
