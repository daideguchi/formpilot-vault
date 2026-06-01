const LICENSE_KEY_STORAGE = "afa_license_key";

const query = new URLSearchParams(location.search);
const licenseKey = query.get("license_key") || localStorage.getItem(LICENSE_KEY_STORAGE) || "";
const display = document.getElementById("licenseKeyDisplay");
const copyButton = document.getElementById("copyLicense");
const copyStatus = document.getElementById("copyStatus");

display.value = licenseKey;
if (licenseKey) localStorage.setItem(LICENSE_KEY_STORAGE, licenseKey);

copyButton.addEventListener("click", async () => {
  await navigator.clipboard.writeText(display.value);
  copyStatus.textContent = "コピーしました。Chrome拡張のPlan欄に貼り付けてください。";
});
