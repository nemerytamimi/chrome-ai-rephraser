const PROVIDER_FIELDS = {
  openai:      ["openaiApiKey", "openaiModel"],
  gemini:      ["geminiApiKey", "geminiModel"],
  claude:      ["claudeApiKey", "claudeModel"],
  openrouter:  ["openrouterApiKey", "openrouterModel"],
  ollama:      ["ollamaUrl", "ollamaModel"],
  lmstudio:    ["lmstudioUrl", "lmstudioModel"],
  mcp:         ["mcpEndpoint", "mcpApiKey", "mcpTool"],
};

const GENERAL_FIELDS = ["activeProvider", "defaultMode"];

// Providers with a user-supplied URL need a runtime-granted host permission,
// since only the four fixed cloud APIs are declared as install-time permissions.
const URL_FIELD_BY_PROVIDER = {
  ollama: "ollamaUrl",
  lmstudio: "lmstudioUrl",
  mcp: "mcpEndpoint",
};
const DEFAULT_URL_BY_PROVIDER = {
  ollama: "http://localhost:11434",
  lmstudio: "http://localhost:1234",
};

// Must be the first await in a click handler: permissions.request() needs the
// user gesture. It resolves true without prompting if already granted, so no
// permissions.contains() check first. Match patterns carry no port, hence hostname.
// new URL() alone is not enough of a check: "localhost:11434" parses as scheme
// "localhost:" with an empty hostname, and permissions.request() throws — rather
// than resolving false — on a pattern that is malformed or outside
// optional_host_permissions.
async function ensureHostPermission(url) {
  const MALFORMED = "Enter a full URL, including http:// or https://";
  let origin;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return { ok: false, error: MALFORMED };
    if (!parsed.hostname) return { ok: false, error: MALFORMED };
    origin = `${parsed.protocol}//${parsed.hostname}/*`;
  } catch {
    return { ok: false, error: MALFORMED };
  }

  try {
    const granted = await chrome.permissions.request({ origins: [origin] });
    return granted ? { ok: true } : { ok: false, error: `Permission to reach ${origin} was denied.` };
  } catch (err) {
    return { ok: false, error: `Could not request access to ${origin}: ${err.message}` };
  }
}

// ── Tab navigation ────────────────────────────────────────────────────────────

document.querySelectorAll(".nav-item").forEach((item) => {
  item.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    item.classList.add("active");
    document.getElementById(`tab-${item.dataset.tab}`).classList.add("active");
  });
});

// ── Toggle password visibility ────────────────────────────────────────────────

document.querySelectorAll(".toggle-secret").forEach((btn) => {
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.target);
    input.type = input.type === "password" ? "text" : "password";
  });
});

// ── Provider card selection ───────────────────────────────────────────────────

document.querySelectorAll(".provider-card").forEach((card) => {
  card.addEventListener("click", () => {
    document.querySelectorAll(".provider-card").forEach((c) => c.classList.remove("selected"));
    card.classList.add("selected");
  });
});

// ── Load saved settings ───────────────────────────────────────────────────────

async function loadSettings() {
  const allKeys = [
    ...GENERAL_FIELDS,
    ...Object.values(PROVIDER_FIELDS).flat(),
  ];
  const data = await chrome.storage.sync.get(allKeys);

  allKeys.forEach((key) => {
    const el = document.getElementById(key);
    if (el && data[key] !== undefined) el.value = data[key];
  });

  if (data.activeProvider) {
    document.querySelectorAll(".provider-card").forEach((c) => {
      c.classList.toggle("selected", c.dataset.provider === data.activeProvider);
    });
  }
}

// ── Save general settings ─────────────────────────────────────────────────────

document.getElementById("saveGeneral").addEventListener("click", async () => {
  const selected = document.querySelector(".provider-card.selected");
  const activeProvider = selected?.dataset.provider || "";
  const defaultMode = document.getElementById("defaultMode").value;

  await chrome.storage.sync.set({ activeProvider, defaultMode });
  showToast("General settings saved!", "success");
});

// ── Save & test provider settings ─────────────────────────────────────────────

document.querySelectorAll("[data-save]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const provider = btn.dataset.save;
    const fields = PROVIDER_FIELDS[provider] || [];
    const values = {};
    fields.forEach((key) => {
      const el = document.getElementById(key);
      if (el) values[key] = el.value.trim();
    });

    const urlField = URL_FIELD_BY_PROVIDER[provider];
    if (urlField) {
      const url = values[urlField] || DEFAULT_URL_BY_PROVIDER[provider];
      const permission = await ensureHostPermission(url);
      if (!permission.ok) {
        const resultEl = document.getElementById(`test-${provider}`);
        resultEl.className = "test-result error";
        resultEl.textContent = `✗ ${permission.error}`;
        resultEl.style.display = "block";
        return;
      }
    }

    await chrome.storage.sync.set(values);
    showToast("Settings saved!", "success");

    const ok = await testProvider(provider, values);
    if (ok) {
      await chrome.storage.sync.set({ activeProvider: provider });
      // Reflect in the General tab provider grid
      document.querySelectorAll(".provider-card").forEach((c) => {
        c.classList.toggle("selected", c.dataset.provider === provider);
      });
      showToast(`✓ ${providerName(provider)} is now your active provider`, "success");
    }
  });
});

function providerName(id) {
  return { openai: "OpenAI", gemini: "Gemini", claude: "Claude",
           openrouter: "OpenRouter", ollama: "Ollama", lmstudio: "LM Studio", mcp: "MCP" }[id] || id;
}

async function testProvider(provider, settings) {
  const resultEl = document.getElementById(`test-${provider}`);
  resultEl.className = "test-result";
  resultEl.textContent = "Testing connection…";
  resultEl.style.display = "block";

  const TEST_PROMPT = "Reply with only the word: OK";

  try {
    await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: "REPHRASE_REQUEST",
          text: TEST_PROMPT,
          mode: "rephrase",
          provider,
          settings,
        },
        (response) => {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
          else if (response?.success) resolve(response.result);
          else reject(new Error(response?.error || "Unknown error"));
        }
      );
    });
    resultEl.className = "test-result success";
    resultEl.textContent = "✓ Connection successful! This provider is now active.";
    return true;
  } catch (err) {
    resultEl.className = "test-result error";
    resultEl.textContent = `✗ ${err.message}`;
    return false;
  }
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

// ── Init ──────────────────────────────────────────────────────────────────────

loadSettings();
