const PRODUCTION_API_BASE = "https://formpilot-vault-api.vercel.app";
const CHECKOUT_ENDPOINT = `${resolveApiBase()}/api/stripe/checkout-session`;
const LICENSE_KEY_STORAGE = "afa_license_key";
const LANGUAGE_STORAGE = "afa_site_language";

const checkoutStatus = document.getElementById("checkoutStatus");
const hasLanguageControls = Boolean(document.querySelector("[data-lang-panel], [data-lang]"));
let activeLanguage = normalizeLanguage(document.documentElement.lang || navigator.language || "en");

for (const button of document.querySelectorAll(".checkout-button")) {
  button.addEventListener("click", () => startCheckout(button));
}

for (const button of document.querySelectorAll("[data-lang]")) {
  button.addEventListener("click", () => setLanguage(button.dataset.lang || "ja"));
}

const query = new URLSearchParams(location.search);
if (query.get("license_key")) {
  localStorage.setItem(LICENSE_KEY_STORAGE, query.get("license_key"));
}

if (hasLanguageControls) {
  setLanguage(resolveInitialLanguage());
}

async function startCheckout(button) {
  const plan = button.dataset.plan;
  const license_key = getOrCreateLicenseKey();

  setStatus(activeLanguage === "ja"
    ? `${plan.toUpperCase()}の決済ページを準備しています。`
    : `Preparing the ${plan.toUpperCase()} checkout page.`);
  setButtonsDisabled(true);

  try {
    const response = await fetch(CHECKOUT_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ plan, license_key })
    });
    if (!response.ok) throw new Error(`checkout_http_${response.status}`);
    const session = await response.json();
    if (!session.url) throw new Error("checkout_url_missing");
    location.href = session.url;
  } catch (error) {
    setStatus(activeLanguage === "ja"
      ? `決済ページを開けませんでした: ${error.message}`
      : `Could not open checkout: ${error.message}`);
    setButtonsDisabled(false);
  }
}

function getOrCreateLicenseKey() {
  const existing = localStorage.getItem(LICENSE_KEY_STORAGE);
  if (existing) return existing;
  const generated = `afa_${crypto.randomUUID().replace(/-/g, "")}`;
  localStorage.setItem(LICENSE_KEY_STORAGE, generated);
  return generated;
}

function setStatus(message) {
  if (checkoutStatus) checkoutStatus.textContent = message;
}

function setButtonsDisabled(disabled) {
  for (const button of document.querySelectorAll(".checkout-button")) {
    button.disabled = disabled;
  }
}

function setLanguage(language) {
  if (!hasLanguageControls) {
    activeLanguage = normalizeLanguage(document.documentElement.lang || language);
    return;
  }

  activeLanguage = normalizeLanguage(language);
  localStorage.setItem(LANGUAGE_STORAGE, activeLanguage);
  document.documentElement.lang = activeLanguage;
  document.title = activeLanguage === "ja"
    ? "フォーム入力を自動入力するAI Chrome拡張 | FormPilot Vault"
    : "FormPilot Vault | AI form autofill Chrome extension";

  for (const panel of document.querySelectorAll("[data-lang-panel]")) {
    panel.classList.toggle("active", panel.dataset.langPanel === activeLanguage);
  }

  for (const button of document.querySelectorAll("[data-lang]")) {
    button.classList.toggle("active", button.dataset.lang === activeLanguage);
  }

  for (const node of document.querySelectorAll("[data-i18n-ja][data-i18n-en]")) {
    node.textContent = node.dataset[`i18n${activeLanguage === "ja" ? "Ja" : "En"}`];
  }

  for (const button of document.querySelectorAll(".checkout-button")) {
    const plan = button.dataset.plan;
    if (!plan) continue;
    button.textContent = activeLanguage === "ja"
      ? `${capitalize(plan)}で始める`
      : `Start ${capitalize(plan)}`;
  }
}

function resolveInitialLanguage() {
  if (/\/ja(?:\.html)?$/i.test(location.pathname)) return "ja";
  const queryLanguage = new URLSearchParams(location.search).get("lang");
  if (queryLanguage) return queryLanguage;
  const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE);
  if (savedLanguage) return savedLanguage;
  const browserLanguages = navigator.languages?.length ? navigator.languages : [navigator.language];
  return browserLanguages.some((language) => /^ja\b/i.test(language || "")) ? "ja" : "en";
}

function normalizeLanguage(language = "") {
  return /^ja\b/i.test(language) ? "ja" : "en";
}

function capitalize(value = "") {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function resolveApiBase() {
  return location.hostname.endsWith("github.io") ? PRODUCTION_API_BASE : "";
}
