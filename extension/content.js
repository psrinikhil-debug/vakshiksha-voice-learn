// Vakshiksha AI Dubbing - Content Script
// Detects videos on the page and overlays dubbed audio

let dubbedAudio = null;
let dubbingOverlay = null;

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getVideoUrl") {
    const videoUrl = detectVideoUrl();
    sendResponse({ videoUrl });
    return true;
  }

  if (message.action === "overlayAudio") {
    const success = overlayDubbedAudio(message.audioDataUrl);
    sendResponse({ success });
    return true;
  }
});

function detectVideoUrl() {
  // 1. Check for standard HTML5 <video> elements
  const videos = document.querySelectorAll("video");
  for (const video of videos) {
    if (video.src && video.src.startsWith("http")) return video.src;
    const source = video.querySelector("source[src]");
    if (source?.src?.startsWith("http")) return source.src;
  }

  // 2. YouTube - construct URL from page
  if (window.location.hostname.includes("youtube.com") && window.location.pathname === "/watch") {
    return window.location.href;
  }

  // 3. Check for video in iframes (same-origin only)
  const iframes = document.querySelectorAll("iframe");
  for (const iframe of iframes) {
    const src = iframe.src || "";
    if (src.includes("youtube.com/embed/") || src.includes("player.vimeo.com")) {
      return src;
    }
  }

  // 4. Check og:video meta tag
  const ogVideo = document.querySelector('meta[property="og:video"]');
  if (ogVideo?.content) return ogVideo.content;

  // 5. Look for direct video file links
  const links = document.querySelectorAll('a[href*=".mp4"], a[href*=".webm"], a[href*=".mov"]');
  if (links.length > 0) return links[0].href;

  return null;
}

function overlayDubbedAudio(audioDataUrl) {
  try {
    // Remove previous overlay if any
    removeDubbingOverlay();

    // Find the video element and mute it
    const video = document.querySelector("video");
    if (video) {
      video.muted = true;
    }

    // Create audio element
    dubbedAudio = new Audio(audioDataUrl);
    dubbedAudio.volume = 1.0;

    // Sync with video if possible
    if (video) {
      dubbedAudio.currentTime = video.currentTime;

      video.addEventListener("play", () => dubbedAudio.play());
      video.addEventListener("pause", () => dubbedAudio.pause());
      video.addEventListener("seeked", () => {
        dubbedAudio.currentTime = video.currentTime;
      });

      if (!video.paused) {
        dubbedAudio.play();
      }
    } else {
      dubbedAudio.play();
    }

    // Show overlay control
    showDubbingOverlay();
    return true;
  } catch (e) {
    console.error("Vakshiksha dubbing overlay error:", e);
    return false;
  }
}

function showDubbingOverlay() {
  dubbingOverlay = document.createElement("div");
  dubbingOverlay.id = "vakshiksha-dub-overlay";
  dubbingOverlay.innerHTML = `
    <div class="vak-dub-bar">
      <span class="vak-dub-label">🎬 Vakshiksha Dubbed Audio</span>
      <input type="range" min="0" max="100" value="100" class="vak-dub-volume" title="Dubbed audio volume">
      <button class="vak-dub-restore" title="Restore original audio">✕</button>
    </div>
  `;
  document.body.appendChild(dubbingOverlay);

  // Volume control
  dubbingOverlay.querySelector(".vak-dub-volume").addEventListener("input", (e) => {
    if (dubbedAudio) dubbedAudio.volume = e.target.value / 100;
  });

  // Restore original
  dubbingOverlay.querySelector(".vak-dub-restore").addEventListener("click", () => {
    removeDubbingOverlay();
    const video = document.querySelector("video");
    if (video) video.muted = false;
  });
}

function removeDubbingOverlay() {
  if (dubbedAudio) {
    dubbedAudio.pause();
    dubbedAudio = null;
  }
  const existing = document.getElementById("vakshiksha-dub-overlay");
  if (existing) existing.remove();
  dubbingOverlay = null;
}
