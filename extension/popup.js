const SUPABASE_URL = "https://imbxkjabvxovsehclert.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltYnhramFidnhvdnNlaGNsZXJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MjE2MDgsImV4cCI6MjA4OTQ5NzYwOH0.8lRRg-4yiyP3WD-XNOb7dFzgDqqAoGpMWYLD26Dfjyk";

const $ = (id) => document.getElementById(id);

// --- Auth helpers ---
async function supabaseSignIn(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error_description || err.msg || "Login failed");
  }
  return res.json();
}

async function checkPro(accessToken) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/check-pro`, {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "apikey": SUPABASE_ANON_KEY,
    },
  });
  return res.json();
}

function showStatus(el, msg, type) {
  el.textContent = msg;
  el.className = `status ${type}`;
  el.style.display = "block";
}

// --- Init ---
async function init() {
  const stored = await chrome.storage.local.get(["session"]);
  if (stored.session?.access_token) {
    showMain(stored.session);
  } else {
    $("loginSection").classList.add("active");
    $("mainSection").classList.remove("active");
  }
}

async function showMain(session) {
  $("loginSection").classList.remove("active");
  $("mainSection").classList.add("active");

  const email = session.user?.email || "User";
  $("userEmail").textContent = email;
  $("avatarLetter").textContent = email[0].toUpperCase();

  try {
    const pro = await checkPro(session.access_token);
    if (pro.isPro) {
      $("proBadge").style.display = "inline-block";
      $("dubBtn").disabled = false;
    } else {
      $("proBadge").style.display = "none";
      showStatus($("mainStatus"), "Pro subscription required to use dubbing.", "error");
      $("dubBtn").disabled = true;
    }
  } catch {
    showStatus($("mainStatus"), "Could not verify subscription.", "error");
  }
}

// --- Login ---
$("loginBtn").addEventListener("click", async () => {
  const email = $("email").value.trim();
  const password = $("password").value;
  if (!email || !password) return showStatus($("loginStatus"), "Enter email and password.", "error");

  $("loginBtn").textContent = "Signing in...";
  $("loginBtn").disabled = true;
  try {
    const session = await supabaseSignIn(email, password);
    await chrome.storage.local.set({ session });
    $("loginStatus").style.display = "none";
    showMain(session);
  } catch (err) {
    showStatus($("loginStatus"), err.message, "error");
  } finally {
    $("loginBtn").textContent = "Sign In";
    $("loginBtn").disabled = false;
  }
});

// --- Logout ---
$("logoutBtn").addEventListener("click", async () => {
  await chrome.storage.local.remove("session");
  $("mainSection").classList.remove("active");
  $("loginSection").classList.add("active");
  $("mainStatus").style.display = "none";
});

// --- Dub ---
$("dubBtn").addEventListener("click", async () => {
  const targetLang = $("targetLang").value;
  const statusEl = $("mainStatus");

  showStatus(statusEl, "Detecting video on the page...", "info");

  // Ask content script to find the video URL
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return showStatus(statusEl, "No active tab found.", "error");

  chrome.tabs.sendMessage(tab.id, { action: "getVideoUrl" }, async (response) => {
    if (chrome.runtime.lastError || !response?.videoUrl) {
      return showStatus(statusEl, "No video found on this page. Navigate to a page with a video.", "error");
    }

    const videoUrl = response.videoUrl;
    showStatus(statusEl, "Starting dubbing... This may take a few minutes.", "info");
    $("dubBtn").disabled = true;

    try {
      const stored = await chrome.storage.local.get(["session"]);
      const token = stored.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      // Start dubbing
      const dubRes = await fetch(`${SUPABASE_URL}/functions/v1/murf-dub`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "apikey": SUPABASE_ANON_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source_url: videoUrl,
          target_lang: targetLang,
          source_lang: "en",
        }),
      });

      const dubData = await dubRes.json();
      if (dubData.error) throw new Error(dubData.error);

      const dubbingId = dubData.dubbing_id;
      if (!dubbingId) throw new Error("No dubbing ID returned");

      showStatus(statusEl, "Dubbing in progress... Checking status...", "info");

      // Poll for completion
      const pollInterval = setInterval(async () => {
        try {
          const sRes = await fetch(
            `${SUPABASE_URL}/functions/v1/murf-dub?action=status&dubbing_id=${dubbingId}`,
            {
              headers: {
                "Authorization": `Bearer ${token}`,
                "apikey": SUPABASE_ANON_KEY,
              },
            }
          );
          const sData = await sRes.json();

          if (sData.status === "dubbed" || sData.status === "completed") {
            clearInterval(pollInterval);
            showStatus(statusEl, "Dubbing complete! Overlaying audio...", "success");

            // Get dubbed audio
            const audioRes = await fetch(
              `${SUPABASE_URL}/functions/v1/murf-dub?action=download&dubbing_id=${dubbingId}&language_code=${targetLang}`,
              {
                headers: {
                  "Authorization": `Bearer ${token}`,
                  "apikey": SUPABASE_ANON_KEY,
                },
              }
            );

            if (!audioRes.ok) throw new Error("Failed to download dubbed audio");

            const audioBlob = await audioRes.blob();
            const audioDataUrl = await blobToDataUrl(audioBlob);

            // Send to content script to overlay
            chrome.tabs.sendMessage(tab.id, {
              action: "overlayAudio",
              audioDataUrl,
            }, (overlayResponse) => {
              if (overlayResponse?.success) {
                showStatus(statusEl, "✅ Dubbed audio is now playing!", "success");
              } else {
                showStatus(statusEl, "Audio ready but couldn't overlay. Try refreshing.", "error");
              }
              $("dubBtn").disabled = false;
            });
          } else if (sData.status === "failed" || sData.status === "error") {
            clearInterval(pollInterval);
            showStatus(statusEl, "Dubbing failed. Please try again.", "error");
            $("dubBtn").disabled = false;
          } else {
            showStatus(statusEl, `Dubbing in progress (${sData.status || "processing"})...`, "info");
          }
        } catch (pollErr) {
          clearInterval(pollInterval);
          showStatus(statusEl, `Error: ${pollErr.message}`, "error");
          $("dubBtn").disabled = false;
        }
      }, 5000);
    } catch (err) {
      showStatus(statusEl, `Error: ${err.message}`, "error");
      $("dubBtn").disabled = false;
    }
  });
});

function blobToDataUrl(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

init();
