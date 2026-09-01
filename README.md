# AI Text Rephraser

A Chrome extension that rephrases text in any input field on any website, using the AI provider of your choice — OpenAI, Gemini, Claude, OpenRouter, or a fully local model via Ollama / LM Studio / MCP.

Your API keys stay in your browser. There is no backend, no telemetry, and no third party in the middle: requests go straight from the extension to the provider you configured.

## Features

- **Six rewrite modes** — Rephrase, Make Formal, Make Casual, Make Concise, Expand, and Fix Grammar & Spelling.
- **Works in any text field** — a ✦ button appears when you focus an input, textarea, or contenteditable element.
- **Right-click any selection** — pick a mode from the *AI Rephraser* context menu.
- **Quick rephrase popup** — paste text into the toolbar popup without touching the page.
- **Seven providers**, including local ones, so nothing has to leave your machine.
- **Connection test** built into Settings — saving a provider verifies it with a real request before making it active.

## Supported providers

| Provider | Needs a key | Notes |
| --- | --- | --- |
| OpenAI | Yes | `gpt-4o-mini`, `gpt-4o`, `gpt-4-turbo`, `gpt-3.5-turbo` |
| Google Gemini | Yes | `gemini-1.5-flash`, `gemini-1.5-pro`, `gemini-2.0-flash`, `gemini-2.5-pro` |
| Anthropic Claude | Yes | Haiku 4.5, Sonnet 4.6, Opus 4.8 |
| OpenRouter | Yes | Any model slug, including free tiers |
| Ollama | No | Local, default `http://localhost:11434` |
| LM Studio | No | Local, default `http://localhost:1234` |
| MCP server | Optional | JSON-RPC `tools/call` against your own endpoint |

## Installation

The extension is not on the Chrome Web Store yet, so load it unpacked:

1. Clone this repository:
   ```bash
   git clone https://github.com/NemerYTamimi/chrome-ai-rephraser.git
   ```
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select the cloned folder.
5. Open the extension's **Settings**, pick a provider, enter its API key (or local URL), and click **Save & Test**.

Works in any Chromium browser that supports Manifest V3 — Chrome, Edge, Brave, Arc.

## Usage

**In a text field.** Focus any input, textarea, or contenteditable area. A ✦ button appears — click it, choose a mode, and the field's text is replaced with the rewrite.

**On a selection.** Select text anywhere, right-click, and choose **AI Rephraser → <mode>**.

**From the popup.** Click the toolbar icon, pick a mode, paste your text, and hit **Rephrase**.

## Using a local model

Both local providers block cross-origin requests by default, so the extension needs them opened up:

**Ollama** — start the server with browser origins allowed:
```bash
OLLAMA_ORIGINS=* ollama serve
```

**LM Studio** — go to **Settings → Local Server** and enable *Allow requests from any origin (CORS)*.

## Configuration and your keys

Settings live in `chrome.storage.sync`, which means Chrome syncs them across the browsers you're signed into. Nothing is written to this repository, and no key is ever hardcoded — every API key in the code is read from storage at request time.

If you'd rather your keys not sync across devices, use a local provider (Ollama or LM Studio), which needs no key at all.

## Project structure

```
manifest.json     Manifest V3 declaration, permissions, entry points
background.js     Service worker: context menus + all provider API calls
content.js        In-page ✦ button, mode menu, and text replacement
content.css       Styles for the injected UI
popup.html/js/css Toolbar popup with quick-rephrase
settings.html/js/css  Options page: provider config and connection tests
icons/            Extension icons (16/32/48/128)
```

## Permissions, and why each is needed

- `contextMenus` — adds the right-click *AI Rephraser* menu.
- `storage` — saves your provider choice and keys.
- `activeTab` / `scripting` — replaces text in the field you're editing.
- `<all_urls>` — the extension is meant to work in text fields on any site, and must reach whichever provider API you configure.

## Contributing

Issues and pull requests are welcome. Since there's no build step, the loop is quick: edit a file, hit reload on `chrome://extensions`, and try it.

Please don't commit API keys — `.gitignore` covers `.env` files and local config, but keys belong in the extension's Settings page, never in the source.

## License

[MIT](LICENSE) © Nemer Tamimi
