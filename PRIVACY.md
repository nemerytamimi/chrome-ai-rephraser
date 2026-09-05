# Privacy Policy — AI Text Rephraser

**Last updated: 1 September 2026**

AI Text Rephraser ("the extension") is a free, open-source Chrome extension that rewrites text you
select or type, using an AI provider that you configure yourself.

This policy explains exactly what the extension does with your data. In short: the extension has no
backend, no account system and no analytics. The developer never receives your text, your API keys,
or any information about your browsing.

## What the extension handles

**Text you choose to rewrite (website content).**
When you click the rewrite button in a text field, choose a mode from the right-click menu, or paste
text into the toolbar popup, that text is sent directly from your browser to the API endpoint of the
AI provider you configured, and the reply is written back into the field. The text is used for that
single request only. It is not stored by the extension, not logged, and not sent anywhere else.

Because you can invoke a rewrite in any text field, that text may itself be a personal
communication — an email you are drafting, a chat message, a comment. The extension does not read
your mailbox, your message history or any field you have not acted on; it only handles the specific
text you submit for a rewrite, at the moment you submit it, and it sends that text only to the
provider you configured.

**Your provider settings and API key.**
The provider you select, the model name, any local server URL, your default rewrite mode, and the
API key you enter in Settings are saved with the Chrome extension storage API
(`chrome.storage.sync`), so that Chrome can keep them available on the browsers where you are signed
in. They stay under your Chrome profile. The API key is only ever sent to the provider it belongs
to, as the authentication header of a rewrite or connection-test request.

## What the extension does not do

- It does not collect, transmit or store personally identifiable information.
- It does not track your browsing, page visits, clicks or keystrokes.
- It does not read text from pages on its own; it only reads the field or selection you act on, at
  the moment you ask for a rewrite.
- It contains no analytics, telemetry, advertising or third-party trackers.
- It does not sell or transfer user data to third parties.
- It does not use or transfer user data for any purpose unrelated to rewriting the text you asked it
  to rewrite.
- It does not use or transfer user data to determine creditworthiness or for lending purposes.

## Third-party AI providers

The rewrite itself is performed by whichever provider you configure. When a rewrite runs, your text
is transmitted to that provider under their own terms and privacy policy:

| Provider | Privacy policy |
| --- | --- |
| OpenAI | https://openai.com/policies/privacy-policy |
| Google Gemini | https://policies.google.com/privacy |
| Anthropic Claude | https://www.anthropic.com/legal/privacy |
| OpenRouter | https://openrouter.ai/privacy |
| Ollama (local) | Runs on your machine — no data leaves your computer |
| LM Studio (local) | Runs on your machine — no data leaves your computer |
| Custom MCP endpoint | Governed by whoever operates the endpoint you enter |

If you do not want your text to leave your machine at all, configure a local provider (Ollama or
LM Studio) or your own MCP endpoint.

## Permissions

- `contextMenus` — adds the "AI Rephraser" right-click menu.
- `storage` — saves your provider settings and API key, as described above.
- `activeTab`, `scripting` — inject the ✦ button into a tab only when you open the popup or use the
  right-click menu on it, and read/write the text of the field you invoked the extension on. The
  extension does not run on pages you haven't invoked it on.
- Host access to the four fixed cloud providers (OpenAI, Gemini, Anthropic, OpenRouter). For Ollama,
  LM Studio, or a custom MCP endpoint, the extension requests permission for that specific URL the
  first time you save it in Settings.

## Removing your data

Uninstalling the extension removes everything it stored, including your API key. You can also clear
the fields in the Settings page at any time.

## Changes

If this policy changes, the updated version will be published in this file in the extension's public
repository, with a new "last updated" date.

## Contact

Questions or concerns: open an issue at
https://github.com/nemerytamimi/chrome-ai-rephraser/issues
