let selectedMode = "rephrase";

// ── Activate the ✦ button on the current tab ─────────────────────────────────
// activeTab is granted for this tab because the user just opened the popup.

(async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    if (tab.url && !/^https?:\/\//.test(tab.url)) return; // chrome://, about:, view-source:
    // insertCSS stacks a fresh copy on every call, so drop any previous one first.
    try {
      await chrome.scripting.removeCSS({ target: { tabId: tab.id }, files: ["content.css"] });
    } catch (err) {
      // Nothing inserted yet — expected on first activation.
    }
    await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ["content.css"] });
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
  } catch (err) {
    // Restricted page — the ✦ button just won't be available here.
  }
})();

// ── Mode buttons ──────────────────────────────────────────────────────────────

document.querySelectorAll(".mode-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".mode-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    selectedMode = btn.dataset.mode;
  });
});

// ── Settings button ───────────────────────────────────────────────────────────

document.getElementById("openSettings").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "OPEN_SETTINGS" });
});

// ── Status indicator ──────────────────────────────────────────────────────────

async function updateStatus() {
  const dot = document.getElementById("statusDot");
  const label = document.getElementById("statusLabel");

  const data = await chrome.storage.sync.get(["activeProvider"]);
  if (data.activeProvider) {
    dot.className = "status-dot ok";
    const names = {
      openai: "OpenAI", gemini: "Gemini", claude: "Claude",
      openrouter: "OpenRouter", ollama: "Ollama", lmstudio: "LM Studio", mcp: "MCP",
    };
    label.textContent = `Active: ${names[data.activeProvider] || data.activeProvider}`;
  } else {
    dot.className = "status-dot warn";
    label.textContent = "No provider configured — open Settings";
  }
}

// ── Quick rephrase ────────────────────────────────────────────────────────────

document.getElementById("quickRephrase").addEventListener("click", async () => {
  const input = document.getElementById("quickInput");
  const text = input.value.trim();
  if (!text) return;

  const btn = document.getElementById("quickRephrase");
  btn.disabled = true;
  btn.textContent = "Rephrasing…";

  const resultEl = document.getElementById("quickResult");
  resultEl.className = "quick-result";

  try {
    const data = await chrome.storage.sync.get(null);
    const provider = data.activeProvider;
    if (!provider) throw new Error("No AI provider configured. Open Settings first.");

    const result = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: "REPHRASE_REQUEST", text, mode: selectedMode, provider, settings: data },
        (response) => {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
          else if (response?.success) resolve(response.result);
          else reject(new Error(response?.error || "Unknown error"));
        }
      );
    });

    resultEl.innerHTML = "";
    const resultText = document.createTextNode(result);
    resultEl.appendChild(resultText);

    const copyBtn = document.createElement("button");
    copyBtn.className = "copy-btn";
    copyBtn.textContent = "Copy";
    copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(result);
      copyBtn.textContent = "Copied!";
      setTimeout(() => (copyBtn.textContent = "Copy"), 1500);
    });
    resultEl.appendChild(document.createElement("br"));
    resultEl.appendChild(copyBtn);
    resultEl.className = "quick-result visible";
  } catch (err) {
    resultEl.textContent = `Error: ${err.message}`;
    resultEl.className = "quick-result visible";
    resultEl.style.borderColor = "rgba(239,68,68,0.4)";
    resultEl.style.color = "#fca5a5";
  } finally {
    btn.disabled = false;
    btn.textContent = "Rephrase";
  }
});

// ── Load default mode from settings ──────────────────────────────────────────

async function loadDefaultMode() {
  const data = await chrome.storage.sync.get(["defaultMode"]);
  if (data.defaultMode) {
    const btn = document.querySelector(`[data-mode="${data.defaultMode}"]`);
    if (btn) {
      document.querySelectorAll(".mode-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      selectedMode = data.defaultMode;
    }
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

updateStatus();
loadDefaultMode();
