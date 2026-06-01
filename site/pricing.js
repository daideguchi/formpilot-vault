const CHECKOUT_ENDPOINT = "/api/stripe/checkout-session";
const LICENSE_KEY_STORAGE = "afa_license_key";

const checkoutStatus = document.getElementById("checkoutStatus");
let activeLanguage = "ja";

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

setLanguage(document.documentElement.lang === "en" ? "en" : "ja");

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
  activeLanguage = language === "en" ? "en" : "ja";
  document.documentElement.lang = activeLanguage;

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

function capitalize(value = "") {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
