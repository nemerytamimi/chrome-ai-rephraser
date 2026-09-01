const REPHRASE_MODES = [
  { id: "rephrase", label: "Rephrase" },
  { id: "formal", label: "Make Formal" },
  { id: "casual", label: "Make Casual" },
  { id: "concise", label: "Make Concise" },
  { id: "expand", label: "Expand" },
  { id: "fix", label: "Fix Grammar & Spelling" },
];

function createContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "ai-rephraser-parent",
      title: "AI Rephraser",
      contexts: ["selection"],
    });

    REPHRASE_MODES.forEach(({ id, label }) => {
      chrome.contextMenus.create({
        id: `rephrase-${id}`,
        parentId: "ai-rephraser-parent",
        title: label,
        contexts: ["selection"],
      });
    });
  });
}

chrome.runtime.onInstalled.addListener(createContextMenus);
chrome.runtime.onStartup.addListener(createContextMenus);

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const mode = info.menuItemId.replace("rephrase-", "");
  if (!REPHRASE_MODES.find((m) => m.id === mode)) return;

  chrome.tabs.sendMessage(tab.id, {
    type: "CONTEXT_MENU_REPHRASE",
    mode,
    selectedText: info.selectionText,
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "REPHRASE_REQUEST") {
    handleRephraseRequest(message)
      .then((result) => sendResponse({ success: true, result }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === "OPEN_SETTINGS") {
    chrome.runtime.openOptionsPage();
  }
});

async function handleRephraseRequest({ text, mode, provider, settings }) {
  const prompts = {
    rephrase: `Rephrase the following text to improve clarity and flow. Return only the rephrased text, nothing else:\n\n${text}`,
    formal: `Rewrite the following text in a formal, professional tone. Return only the rewritten text, nothing else:\n\n${text}`,
    casual: `Rewrite the following text in a casual, friendly tone. Return only the rewritten text, nothing else:\n\n${text}`,
    concise: `Make the following text more concise while keeping the core meaning. Return only the concise version, nothing else:\n\n${text}`,
    expand: `Expand the following text with more detail and context. Return only the expanded text, nothing else:\n\n${text}`,
    fix: `Fix all grammar, spelling, and punctuation errors in the following text. Return only the corrected text, nothing else:\n\n${text}`,
  };

  const prompt = prompts[mode] || prompts.rephrase;

  switch (provider) {
    case "openai":
      return callOpenAI(prompt, settings);
    case "gemini":
      return callGemini(prompt, settings);
    case "claude":
      return callClaude(prompt, settings);
    case "openrouter":
      return callOpenRouter(prompt, settings);
    case "ollama":
      return callOllama(prompt, settings);
    case "lmstudio":
      return callLMStudio(prompt, settings);
    case "mcp":
      return callMCP(prompt, settings);
    default:
      throw new Error("No AI provider configured. Please open Settings.");
  }
}

async function callOpenAI(prompt, settings) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.openaiApiKey}`,
    },
    body: JSON.stringify({
      model: settings.openaiModel || "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenAI error ${res.status}`);
  }
  const data = await res.json();
  return data.choices[0].message.content.trim();
}

async function callGemini(prompt, settings) {
  const model = settings.geminiModel || "gemini-1.5-flash";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${settings.geminiApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7 },
      }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gemini error ${res.status}`);
  }
  const data = await res.json();
  return data.candidates[0].content.parts[0].text.trim();
}

async function callClaude(prompt, settings) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": settings.claudeApiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: settings.claudeModel || "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Claude error ${res.status}`);
  }
  const data = await res.json();
  return data.content[0].text.trim();
}

async function callOpenRouter(prompt, settings) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.openrouterApiKey}`,
      "HTTP-Referer": "https://github.com/ai-rephraser",
    },
    body: JSON.stringify({
      model: settings.openrouterModel || "meta-llama/llama-3.1-8b-instruct:free",
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenRouter error ${res.status}`);
  }
  const data = await res.json();
  return data.choices[0].message.content.trim();
}

async function callOllama(prompt, settings) {
  const baseUrl = settings.ollamaUrl || "http://localhost:11434";
  const res = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: settings.ollamaModel || "llama3.2",
      messages: [{ role: "user", content: prompt }],
      stream: false,
    }),
  });
  if (!res.ok) {
    if (res.status === 403) {
      throw new Error(
        "Ollama blocked the request (403). Run Ollama with:\n" +
        "OLLAMA_ORIGINS=* ollama serve\n" +
        "or set the env var permanently — see the Settings page for details."
      );
    }
    throw new Error(`Ollama error ${res.status}. Is Ollama running at ${baseUrl}?`);
  }
  const data = await res.json();
  return data.message.content.trim();
}

async function callLMStudio(prompt, settings) {
  const baseUrl = settings.lmstudioUrl || "http://localhost:1234";
  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: settings.lmstudioModel || "local-model",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    }),
  });
  if (!res.ok) {
    if (res.status === 403) {
      throw new Error(
        "LM Studio blocked the request (403). In LM Studio go to:\n" +
        "Settings → Local Server → enable \"Allow requests from any origin (CORS)\""
      );
    }
    throw new Error(`LM Studio error ${res.status}. Is the local server running at ${baseUrl}?`);
  }
  const data = await res.json();
  return data.choices[0].message.content.trim();
}

async function callMCP(prompt, settings) {
  const res = await fetch(settings.mcpEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(settings.mcpApiKey ? { Authorization: `Bearer ${settings.mcpApiKey}` } : {}),
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: {
        name: settings.mcpTool || "rephrase",
        arguments: { text: prompt },
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`MCP error ${res.status}`);
  }
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const content = data.result?.content;
  if (Array.isArray(content)) return content.map((c) => c.text).join("").trim();
  return String(content).trim();
}
