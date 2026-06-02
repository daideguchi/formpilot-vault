const LICENSE_KEY_STORAGE = "afa_license_key";
const PRODUCTION_API_BASE = "https://formpilot-vault-api.vercel.app";
const ENTITLEMENT_ENDPOINT = `${resolveApiBase()}/api/entitlement/check`;

const query = new URLSearchParams(location.search);
const licenseKey = query.get("license_key") || localStorage.getItem(LICENSE_KEY_STORAGE) || "";
const display = document.getElementById("licenseKeyDisplay");
const copyButton = document.getElementById("copyLicense");
const recheckButton = document.getElementById("recheckEntitlement");
const copyStatus = document.getElementById("copyStatus");
const entitlementStatus = document.getElementById("entitlementStatus");

display.value = licenseKey;
if (licenseKey) localStorage.setItem(LICENSE_KEY_STORAGE, licenseKey);
if (!licenseKey) {
  copyButton.disabled = true;
  recheckButton.disabled = true;
  setEntitlementStatus("License keyが見つかりません。決済ページを開いたブラウザで戻ってください。", "warning");
} else {
  checkEntitlement();
}

copyButton.addEventListener("click", async () => {
  if (!display.value) return;
  await navigator.clipboard.writeText(display.value);
  copyStatus.textContent = "コピーしました。Chrome拡張のPlan欄に貼り付けてください。";
});

recheckButton.addEventListener("click", () => {
  if (licenseKey) checkEntitlement();
});

async function checkEntitlement() {
  setEntitlementStatus("ライセンス状態を確認しています。", "pending");
  recheckButton.disabled = true;

  try {
    const response = await fetch(`${ENTITLEMENT_ENDPOINT}?license_key=${encodeURIComponent(licenseKey)}`);
    if (!response.ok) throw new Error(`entitlement_http_${response.status}`);
    const entitlement = await response.json();
    const plan = String(entitlement.plan || "free").toUpperCase();

    if (entitlement.active && entitlement.plan && entitlement.plan !== "free") {
      setEntitlementStatus(`${plan}が有効です。License keyをChrome拡張へ貼り付けてください。`, "success");
      return;
    }

    setEntitlementStatus("決済完了後の権利反映を待っています。1分ほど置いてから再確認してください。", "pending");
  } catch (error) {
    setEntitlementStatus(`ライセンス確認に失敗しました: ${error.message}`, "warning");
  } finally {
    recheckButton.disabled = false;
  }
}

function setEntitlementStatus(message, status) {
  entitlementStatus.textContent = message;
  entitlementStatus.dataset.status = status;
}

function resolveApiBase() {
  return location.hostname.endsWith("github.io") ? PRODUCTION_API_BASE : "";
}
