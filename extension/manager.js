import { PUBLIC_BASE_URL } from "./src/release-config.js";
import { getCustomProfileEntries, readPath } from "./src/profile-formatters.js";
import { FREE_MONTHLY_FILL_LIMIT, getCurrentMonthKey } from "./src/usage-meter.js";
import {
  VAULT_STORAGE_KEY,
  createVaultState,
  getActiveProfileValues,
  normalizeVaultState,
  summarizeMemory,
  updateActiveProfileValues
} from "./src/profile-memory.js";
import { destroyLocalVaultStorage, loadRuntimeVaultState, persistVaultState } from "./src/vault-crypto.js";

const navItems = Array.from(document.querySelectorAll(".nav-item"));
const viewPanels = Array.from(document.querySelectorAll("[data-view-panel]"));
const viewTitle = document.getElementById("viewTitle");
const ledgerRows = document.getElementById("ledgerRows");
const ledgerFilter = document.getElementById("ledgerFilter");
const addLedgerRow = document.getElementById("addLedgerRow");
const saveLedger = document.getElementById("saveLedger");
const ledgerStatus = document.getElementById("ledgerStatus");
const planBadge = document.getElementById("planBadge");
const openPricing = document.getElementById("openPricing");
const upgradeFromManager = document.getElementById("upgradeFromManager");
const showDeleteVault = document.getElementById("showDeleteVault");
const deleteVaultPanel = document.getElementById("deleteVaultPanel");
const deleteVaultConfirm = document.getElementById("deleteVaultConfirm");
const confirmDeleteVault = document.getElementById("confirmDeleteVault");
const deleteVaultStatus = document.getElementById("deleteVaultStatus");

let vaultState = null;
let usage = {};
let entitlement = { plan: "free" };

init();

async function init() {
  localizeStaticText();
  const stored = await chrome.storage.local.get(["profile", "entitlement", "usage", "licenseKey", VAULT_STORAGE_KEY]);
  entitlement = stored.entitlement || entitlement;
  usage = stored.usage || {};
  vaultState = await loadRuntimeVaultState(stored[VAULT_STORAGE_KEY], {
    storage: chrome.storage.local,
    profile: stored.profile || createEmptyProfile()
  });
  await persistVaultState(chrome.storage.local, vaultState);
  if (stored.profile) await chrome.storage.local.remove("profile");
  renderAll();
}

for (const item of navItems) {
  item.addEventListener("click", () => setView(item.dataset.view));
}

ledgerFilter?.addEventListener("input", filterLedgerRows);
addLedgerRow?.addEventListener("click", () => {
  addEditableLedgerRow();
  filterLedgerRows();
});
saveLedger?.addEventListener("click", saveLedgerRows);
openPricing?.addEventListener("click", openPricingPage);
upgradeFromManager?.addEventListener("click", openPricingPage);
showDeleteVault?.addEventListener("click", () => {
  deleteVaultPanel.hidden = false;
  deleteVaultConfirm?.focus();
});
deleteVaultConfirm?.addEventListener("input", () => {
  confirmDeleteVault.disabled = deleteVaultConfirm.value !== "DELETE";
});
confirmDeleteVault?.addEventListener("click", deleteEverything);

function renderAll() {
  renderTopbar();
  renderDashboard();
  renderLedger();
  renderProfiles();
  renderInbox();
  renderSites();
  renderReceipts();
  renderPlan();
}

function renderTopbar() {
  const plan = (entitlement.plan || "free").toUpperCase();
  planBadge.textContent = plan;
}

function renderDashboard() {
  const profile = getActiveProfileValues(vaultState);
  const monthKey = getCurrentMonthKey(new Date());
  const fills = usage[monthKey]?.fills || 0;
  const fieldsFilled = usage[monthKey]?.fields_filled || 0;
  setText("metricLedger", String(countLedgerEntries(profile)));
  setText("metricSites", String(countSites(vaultState)));
  setText("metricUsage", entitlement.plan && entitlement.plan !== "free" ? String(fills) : `${fills}/${FREE_MONTHLY_FILL_LIMIT}`);
  setText("metricSaved", t("savedMinutes", [String(Math.round(fieldsFilled * 8 / 60))]) || `${Math.round(fieldsFilled * 8 / 60)} min`);

  const actions = document.getElementById("nextActions");
  actions.innerHTML = "";
  const inboxCount = normalizeVaultState(vaultState).capture_inbox?.length || 0;
  const actionItems = [
    {
      title: t("managerActionLedgerTitle"),
      body: t("managerActionLedgerBody", [String(countLedgerEntries(profile))])
    },
    {
      title: t("managerActionInboxTitle"),
      body: inboxCount > 0 ? t("managerActionInboxBody", [String(inboxCount)]) : t("managerInboxZero")
    },
    {
      title: t("managerActionTrustTitle"),
      body: t("managerActionTrustBody")
    }
  ];
  for (const action of actionItems) {
    const node = document.createElement("div");
    node.className = "action-item";
    node.innerHTML = `<strong></strong><span></span>`;
    node.querySelector("strong").textContent = action.title;
    node.querySelector("span").textContent = action.body;
    actions.append(node);
  }
}

function renderLedger() {
  const profile = getActiveProfileValues(vaultState);
  ledgerRows.innerHTML = "";
  for (const row of baseLedgerRows(profile)) addReadonlyLedgerRow(row);
  for (const entry of getCustomProfileEntries(profile)) addEditableLedgerRow(entry);
  filterLedgerRows();
}

function addReadonlyLedgerRow(row) {
  const tr = document.createElement("tr");
  tr.className = "is-readonly";
  tr.dataset.search = normalizeSearchText([row.category, row.label, row.value, row.aliases.join(" ")].join(" "));
  tr.innerHTML = `
    <td>${escapeHtml(row.category)}</td>
    <td>${escapeHtml(row.label)}</td>
    <td><span class="value-mask">${escapeHtml(maskValue(row.value))}</span></td>
    <td>${escapeHtml(row.aliases.join(", "))}</td>
    <td>${escapeHtml(t("managerSourceBuiltIn"))}</td>
    <td></td>
  `;
  ledgerRows.append(tr);
}

function addEditableLedgerRow({ key = createCustomKey(), label = "", value = "", aliases = [], category = "other" } = {}) {
  const tr = document.createElement("tr");
  tr.dataset.customKey = key;
  tr.innerHTML = `
    <td>${categorySelect(category)}</td>
    <td><input class="ledger-label" value="${escapeAttr(label)}" placeholder="${escapeAttr(t("customKeyPlaceholder"))}"></td>
    <td><input class="ledger-value" value="${escapeAttr(value)}" placeholder="${escapeAttr(t("customValuePlaceholder"))}"></td>
    <td><input class="ledger-aliases" value="${escapeAttr(Array.isArray(aliases) ? aliases.join(", ") : "")}" placeholder="${escapeAttr(t("customAliasPlaceholder"))}"></td>
    <td>${escapeHtml(t("managerSourceLedger"))}</td>
    <td><button class="row-remove" type="button" title="${escapeAttr(t("deleteEntry"))}">x</button></td>
  `;
  tr.querySelector(".row-remove").addEventListener("click", () => {
    tr.remove();
    filterLedgerRows();
  });
  tr.querySelectorAll("input, select").forEach((input) => {
    input.addEventListener("input", () => {
      tr.dataset.search = editableRowSearchText(tr);
      filterLedgerRows();
    });
  });
  tr.dataset.search = editableRowSearchText(tr);
  ledgerRows.append(tr);
}

async function saveLedgerRows() {
  const profile = getActiveProfileValues(vaultState);
  const entries = [];
  const usedKeys = new Set();
  for (const tr of ledgerRows.querySelectorAll("tr:not(.is-readonly)")) {
    const label = tr.querySelector(".ledger-label")?.value.trim() || "";
    const value = tr.querySelector(".ledger-value")?.value.trim() || "";
    const aliases = splitAliases(tr.querySelector(".ledger-aliases")?.value || "");
    const category = tr.querySelector(".ledger-category")?.value || "other";
    if (!label && !value && aliases.length === 0) continue;
    let key = tr.dataset.customKey || createCustomKey(label);
    if (usedKeys.has(key)) key = createCustomKey(label);
    usedKeys.add(key);
    entries.push({ key, label: label || key, value, aliases, category });
  }
  profile.custom = Object.fromEntries(entries.map((entry) => [entry.key, entry.value]));
  profile.custom_labels = Object.fromEntries(entries.map((entry) => [entry.key, entry.label]));
  profile.custom_aliases = Object.fromEntries(entries.map((entry) => [entry.key, entry.aliases]));
  profile.custom_categories = Object.fromEntries(entries.map((entry) => [entry.key, entry.category]));
  profile.custom_order = entries.map((entry) => entry.key);
  vaultState = updateActiveProfileValues(vaultState, profile);
  await persistVaultState(chrome.storage.local, vaultState);
  ledgerStatus.textContent = t("managerLedgerSaved", [String(entries.length)]);
  renderAll();
}

function renderProfiles() {
  const list = document.getElementById("profilesList");
  const state = normalizeVaultState(vaultState);
  list.innerHTML = "";
  for (const profile of state.vault_profiles) {
    const node = document.createElement("div");
    node.className = "profile-item";
    node.innerHTML = `<strong></strong><span></span>`;
    node.querySelector("strong").textContent = profile.label || profile.profile_id;
    node.querySelector("span").textContent = profile.profile_id === state.active_profile_id
      ? t("managerProfileActive")
      : t("managerProfilePlus");
    list.append(node);
  }
}

function renderInbox() {
  const list = document.getElementById("inboxList");
  const state = normalizeVaultState(vaultState);
  const inbox = Array.isArray(state.capture_inbox) ? state.capture_inbox : [];
  list.innerHTML = "";
  if (inbox.length === 0) {
    list.append(emptyItem(t("managerInboxZero"), t("managerInboxZeroBody")));
    return;
  }
  for (const item of inbox) {
    list.append(emptyItem(item.suggested_label || t("managerInbox"), item.origin || ""));
  }
}

function renderSites() {
  const list = document.getElementById("siteMemoryList");
  const state = normalizeVaultState(vaultState);
  const groups = new Map();
  for (const entry of state.mapping_cache || []) {
    if (!entry.origin) continue;
    const group = groups.get(entry.origin) || { count: 0, last: "", confidence: 0 };
    group.count += 1;
    group.last = entry.last_success_at || entry.updated_at || group.last;
    group.confidence = Math.max(group.confidence, entry.confidence || 0);
    groups.set(entry.origin, group);
  }
  list.innerHTML = "";
  if (groups.size === 0) {
    list.append(emptyItem(t("managerSitesEmpty"), t("managerSitesEmptyBody")));
    return;
  }
  for (const [origin, group] of groups) {
    const node = document.createElement("div");
    node.className = "site-item";
    node.innerHTML = `<strong></strong><span></span>`;
    node.querySelector("strong").textContent = origin;
    node.querySelector("span").textContent = t("managerSiteSummary", [
      String(group.count),
      String(Math.round(group.confidence * 100))
    ]);
    list.append(node);
  }
}

function renderReceipts() {
  const list = document.getElementById("receiptList");
  if (!list) return;
  const events = Object.values(usage || {})
    .flatMap((month) => Array.isArray(month?.events) ? month.events : [])
    .filter((event) => event?.type === "form_fill")
    .sort((left, right) => String(right.timestamp).localeCompare(String(left.timestamp)))
    .slice(0, 80);

  list.innerHTML = "";
  if (events.length === 0) {
    list.append(emptyItem(t("managerReceiptsEmpty"), t("managerReceiptsEmptyBody")));
    return;
  }

  for (const event of events) {
    const node = document.createElement("div");
    node.className = "receipt-item";
    const fields = (event.items || [])
      .slice(0, 8)
      .map((item) => `${item.label || item.profile_key || item.field_id} -> ${item.profile_key || ""}`)
      .filter(Boolean)
      .join(" / ");
    node.innerHTML = `
      <strong></strong>
      <div class="receipt-meta"></div>
      <div class="receipt-fields"></div>
    `;
    node.querySelector("strong").textContent = event.origin || "local_or_unknown";
    node.querySelector(".receipt-meta").textContent = [
      formatDateTime(event.timestamp),
      t("managerReceiptFields", [String(event.fields_filled || 0)]),
      event.plan ? String(event.plan).toUpperCase() : ""
    ].filter(Boolean).join("  |  ");
    node.querySelector(".receipt-fields").textContent = fields || t("managerReceiptNoValues");
    list.append(node);
  }
}

function renderPlan() {
  const plan = entitlement.plan || "free";
  setText("planSummaryManager", plan === "free"
    ? t("managerPlanFree")
    : t("managerPlanPaid", [plan.toUpperCase()]));
}

function setView(view) {
  for (const item of navItems) {
    item.classList.toggle("is-active", item.dataset.view === view);
  }
  for (const panel of viewPanels) {
    panel.classList.toggle("is-active", panel.dataset.viewPanel === view);
  }
  const active = navItems.find((item) => item.dataset.view === view);
  viewTitle.textContent = active?.textContent || "";
}

function filterLedgerRows() {
  const query = normalizeSearchText(ledgerFilter?.value || "");
  for (const row of ledgerRows.querySelectorAll("tr")) {
    row.hidden = Boolean(query) && !String(row.dataset.search || "").includes(query);
  }
}

function baseLedgerRows(profile = {}) {
  return [
    ["basic", t("semantic_person_name_full"), readPath(profile, "person.name.full")],
    ["basic", t("semantic_person_email_primary"), readPath(profile, "person.email.primary")],
    ["basic", t("semantic_person_phone_mobile_auto"), readPath(profile, "person.phone.mobile_hyphen") || readPath(profile, "person.phone.mobile")],
    ["address", t("semantic_person_address_postal_code_auto"), readPath(profile, "person.address.postal_code_hyphen") || readPath(profile, "person.address.postal_code")],
    ["address", t("semantic_person_address_full"), readPath(profile, "person.address.full")],
    ["work", t("semantic_company_name"), readPath(profile, "company.name")],
    ["work", t("semantic_company_title"), readPath(profile, "company.title")]
  ]
    .filter(([, , value]) => value)
    .map(([category, label, value]) => ({ category, label, value, aliases: [] }));
}

function categorySelect(value) {
  const options = [
    ["basic", t("customCategoryBasic")],
    ["id", t("customCategoryId")],
    ["sheet", t("customCategorySheet")],
    ["work", t("customCategoryWork")],
    ["other", t("customCategoryOther")]
  ];
  return `<select class="ledger-category">${options.map(([optionValue, label]) => (
    `<option value="${escapeAttr(optionValue)}"${optionValue === value ? " selected" : ""}>${escapeHtml(label)}</option>`
  )).join("")}</select>`;
}

function editableRowSearchText(row) {
  return normalizeSearchText([
    row.querySelector(".ledger-category")?.value,
    row.querySelector(".ledger-label")?.value,
    row.querySelector(".ledger-value")?.value,
    row.querySelector(".ledger-aliases")?.value
  ].filter(Boolean).join(" "));
}

function countLedgerEntries(profile = {}) {
  return baseLedgerRows(profile).length + getCustomProfileEntries(profile).filter((entry) => entry.value).length;
}

function countSites(state) {
  return new Set((normalizeVaultState(state).mapping_cache || []).map((entry) => entry.origin).filter(Boolean)).size;
}

function emptyItem(title, body) {
  const node = document.createElement("div");
  node.className = "inbox-item";
  node.innerHTML = `<strong></strong><span></span>`;
  node.querySelector("strong").textContent = title;
  node.querySelector("span").textContent = body;
  return node;
}

function openPricingPage() {
  chrome.tabs.create({ url: `${PUBLIC_BASE_URL}/#pricing` });
}

async function deleteEverything() {
  if (deleteVaultConfirm?.value !== "DELETE") return;
  await destroyLocalVaultStorage(chrome.storage.local);
  vaultState = createVaultState({ profile: createEmptyProfile() });
  usage = {};
  entitlement = { plan: "free" };
  await persistVaultState(chrome.storage.local, vaultState);
  if (deleteVaultConfirm) deleteVaultConfirm.value = "";
  if (confirmDeleteVault) confirmDeleteVault.disabled = true;
  if (deleteVaultStatus) deleteVaultStatus.textContent = t("managerDeleteDone");
  renderAll();
}

function createEmptyProfile() {
  return {
    person: { name: {}, email: {}, phone: {}, address: { country: "日本", country_code: "JP" } },
    company: {},
    custom: {},
    custom_labels: {},
    custom_aliases: {},
    custom_categories: {},
    custom_order: [],
    account: { default_password_policy: "generate" }
  };
}

function splitAliases(value = "") {
  return String(value).split(/[,、，\n]/).map((entry) => entry.trim()).filter(Boolean);
}

function createCustomKey(seed = "") {
  const slug = String(seed).normalize("NFKC").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 32);
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  return `${slug || "item"}_${suffix}`;
}

function normalizeSearchText(value = "") {
  return String(value).normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
}

function formatDateTime(value) {
  try {
    return new Intl.DateTimeFormat(document.documentElement.lang || undefined, {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(value));
  } catch {
    return String(value || "");
  }
}

function maskValue(value = "") {
  const text = String(value || "");
  if (!text) return "";
  if (text.includes("@")) {
    const [name, domain] = text.split("@");
    return `${name.slice(0, 1)}***@${domain || "***"}`;
  }
  const digits = text.replace(/\D/g, "");
  if (digits.length >= 8) return text.replace(/\d(?=\d{2})/g, "*");
  return text;
}

function setText(id, value) {
  const node = document.getElementById(id);
  if (node) node.textContent = value;
}

function localizeStaticText() {
  const uiLanguage = chrome.i18n?.getUILanguage?.() || "en";
  const lang = uiLanguage.replace("_", "-");
  document.documentElement.lang = lang;
  document.documentElement.dir = /^(ar|fa|he|ur)(-|$)/i.test(lang) ? "rtl" : "ltr";
  document.title = t("managerTitle") || "FormPilot Manager";
  for (const node of document.querySelectorAll("[data-i18n]")) {
    const value = t(node.dataset.i18n);
    if (value) node.textContent = value;
  }
  for (const node of document.querySelectorAll("[data-i18n-placeholder]")) {
    const value = t(node.dataset.i18nPlaceholder);
    if (value) node.setAttribute("placeholder", value);
  }
}

function t(key, substitutions = []) {
  return chrome.i18n?.getMessage?.(key, substitutions) || "";
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function escapeAttr(value = "") {
  return escapeHtml(value);
}
