// Vakshiksha AI Dubbing - Background Service Worker
// Periodically checks for extension updates

const UPDATE_CHECK_URL = "https://vakshiksha-voice-learn.lovable.app/extension-version.json";
const CHECK_INTERVAL_HOURS = 6;

// Check for updates on install and periodically
chrome.runtime.onInstalled.addListener(() => {
  checkForUpdate();
  chrome.alarms.create("updateCheck", { periodInMinutes: CHECK_INTERVAL_HOURS * 60 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "updateCheck") checkForUpdate();
});

async function checkForUpdate() {
  try {
    const res = await fetch(UPDATE_CHECK_URL, { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    const currentVersion = chrome.runtime.getManifest().version;
    if (data.version && isNewerVersion(currentVersion, data.version)) {
      await chrome.storage.local.set({
        updateAvailable: {
          version: data.version,
          downloadUrl: data.download_url || UPDATE_CHECK_URL.replace("extension-version.json", "vakshiksha-dubbing-extension.zip"),
          changelog: data.changelog || "",
        },
      });
      chrome.action.setBadgeText({ text: "NEW" });
      chrome.action.setBadgeBackgroundColor({ color: "#06b6d4" });
    } else {
      await chrome.storage.local.remove("updateAvailable");
      chrome.action.setBadgeText({ text: "" });
    }
  } catch {
    // Silently fail - will retry next interval
  }
}

function isNewerVersion(current, latest) {
  const c = current.split(".").map(Number);
  const l = latest.split(".").map(Number);
  for (let i = 0; i < Math.max(c.length, l.length); i++) {
    const cv = c[i] || 0;
    const lv = l[i] || 0;
    if (lv > cv) return true;
    if (lv < cv) return false;
  }
  return false;
}

// Allow popup to trigger manual check
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "checkUpdate") {
    checkForUpdate().then(() => sendResponse({ done: true }));
    return true;
  }
});
