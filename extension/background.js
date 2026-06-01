chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ installed_at: new Date().toISOString() });
});
