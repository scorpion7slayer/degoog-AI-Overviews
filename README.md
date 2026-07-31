# AI Overviews for degoog

A slot plugin for [degoog](https://github.com/degoog-org/degoog) that generates a
concise, source-grounded answer above search results. It brings together the
useful interactions found in Google AI Overviews—direct answers, citations,
visible sources, and follow-up questions—without calling or scraping Google's AI
Overviews.

The plugin builds on the architecture of the official
[AI Summary](https://github.com/degoog-org/official-extensions/tree/main/plugins/ai-summary)
plugin, with more providers, an OpenAI Responses adapter, and an interface
designed to feel more like a search overview.

## Features

- Streams answers in the native `at-a-glance` slot.
- Adds an **AI Mode** action to the degoog home and results search bars.
- Provides a dedicated **AI Mode** page, opened from the Overview, with degoog
  search, full-page answers, a source sidebar, and follow-up questions.
- Links `[N]` citations to the exact degoog results sent to the model.
- Includes a compact source button with stacked avatars and a detailed source drawer.
- Displays result thumbnails through degoog's signed image proxy.
- Enhances code blocks with language labels, line numbers, and number-free copying.
- Supports full-answer copying, expandable answers, and follow-up questions.
- Runs local Ollama models without an API key and supports cloud providers and compatible gateways.
- Automatically selects the protocol by model family for OpenCode Zen and Go.
- Makes all LLM calls server-side (`isClientExposed: false`).
- Stores API keys as degoog secrets and never exposes them to the browser.
- Protects against instructions injected into search-result titles or snippets.
- Offers configurable caching, request limits, timeouts, and question-only mode.
- Provides a responsive English interface with reduced-motion support.

## Installation

### From the degoog Store

1. Open **Settings → Store**.
2. Add the repository `https://github.com/scorpion7slayer/degoog-AI-Overviews`.
3. Install **AI Overviews**.
4. Restart degoog if the instance does not reload extensions automatically.
5. Open the plugin settings and select a provider, a model, and an API key when required.

The root `package.json` follows the
[degoog Store repository format](https://degoog-org.github.io/docs/store.html).

### Manual installation

Copy the `plugins/ai-overviews` directory to:

```text
data/plugins/ai-overviews
```

or to the directory configured through `DEGOOG_PLUGINS_DIR`, then restart degoog.

## Providers

| Preset | Protocol | Default URL | API key |
|---|---|---|---|
| Local Ollama | Ollama `/api/chat` | `http://localhost:11434` | No |
| Ollama Cloud | Ollama `/api/chat` | `https://ollama.com` | Yes |
| OpenCode Zen | Automatic by model | `https://opencode.ai/zen/v1` | Yes |
| OpenCode Go | Automatic by model | `https://opencode.ai/zen/go/v1` | Yes |
| OpenAI | Responses API | `https://api.openai.com/v1` | Yes |
| OpenAI-compatible | Chat Completions | User-defined | Gateway-dependent |
| Google Gemini | Native GenerateContent | `https://generativelanguage.googleapis.com/v1beta` | Yes |
| Kilo Code Gateway | Chat Completions | `https://api.kilo.ai/api/gateway` | Yes |
| Moonshot / Kimi | Chat Completions | `https://api.moonshot.ai/v1` | Yes |
| Anthropic | Messages API | `https://api.anthropic.com/v1` | Yes |
| OpenRouter | Chat Completions | `https://openrouter.ai/api/v1` | Yes |
| Qwen / Alibaba | Chat Completions | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` | Yes |
| Z.AI / GLM | Chat Completions | `https://api.z.ai/api/paas/v4` | Yes |
| Perplexity Sonar | Chat Completions | `https://api.perplexity.ai` | Yes |
| Cloudflare Workers AI | Chat Completions | Built from the Account ID | Yes |
| xAI | Chat Completions | `https://api.x.ai/v1` | Yes |
| Cursor through a gateway | Chat Completions | User-defined | Yes |

Model identifiers change more quickly than the plugin. Use the exact identifier
shown by the provider. For OpenCode, enter the direct API model identifier
(`gpt-5.6-terra`, `qwen3.7-plus`, `kimi-k3`, and so on), without the `opencode/`
or `opencode-go/` prefix used in the TUI configuration.

### Provider notes

**Ollama and Docker.** `localhost` refers to the degoog container. On Docker
Desktop, use `http://host.docker.internal:11434` as the URL override in most
cases. On Linux, expose the Ollama host to the container or place both services
on the same network.

**OpenCode Zen.** The plugin automatically selects Responses for GPT models,
Messages for Claude and Qwen, GenerateContent for Gemini, and Chat Completions
for other model families. The advanced protocol setting can override this
selection if the provider changes its behavior.

**OpenCode Go.** Qwen and MiniMax use Messages; the other currently documented
model families use Chat Completions.

**Cloudflare Workers AI.** Enter the Account ID and API key. The AI Gateway ID
is optional and is sent in the `cf-aig-gateway-id` header. A complete base URL
can also override the preset.

**Cursor.** Cursor does not publish a general OpenAI-compatible chat or inference
API. This preset therefore does not claim to use a Cursor subscription directly:
it requires the URL and key for your own compatible gateway.

## Configuration

The main settings are:

- **LLM provider**, **Model ID**, and **API key**;
- **Answer depth**: concise, balanced, or detailed;
- the number of degoog sources, from 3 to 12;
- source visibility and question-mark-only triggering.

Advanced settings let you override the URL and protocol, enable reasoning,
change the timeout, token limit, cache, and system prompt. Enabling reasoning can
increase cost and latency; reasoning content is never merged into the final
answer.

## Architecture

```text
plugins/ai-overviews/
├── index.js               # slot contract, search-bar action, settings, and routes
├── script.js              # search-bar navigation, streaming, citations, and follow-ups
├── style.css              # native degoog presentation
├── mode.html              # full-page AI Mode
├── mode.css               # desktop/mobile research workspace
├── mode.js                # degoog search, streaming, and conversation
├── locales/               # degoog locale resources with English interface strings
├── providers/             # protocol adapters
└── src/                   # prompt, panel, SSE pipeline, and validation
```

The browser sends the query and rendered results to
`/api/plugin/<id>/stream`. The server sanitizes the data, builds a prompt that
marks results as untrusted, calls the provider, and returns `delta`, `thinking`,
`done`, or `error` SSE events.

Thumbnails continue to be served through degoog's signed image proxy; adding
them does not make the client responsible for requests to source websites.

The **AI Mode** action in degoog's home and results search bars opens the
full-page experience and carries over the current query when one is present.
From an Overview, the existing **AI Mode** button also carries the loaded sources
into the full-page experience temporarily. A new question submitted from that
page queries the degoog search API and sends only its sanitized results through
the same server-side LLM pipeline. The page URL is built from the installed
plugin ID so that it remains valid after Store installation. The page can also
be opened directly at `<ctx.apiBase>/mode`; a query supplied in `?q=` is rerun
with the active degoog search engines.

## Limitations

- A citation means that the model associated a claim with a result snippet; it
  is not a substitute for checking the source page.
- The plugin synthesizes degoog results. It does not reproduce Google's ranking,
  models, proprietary data, or answers.
- The current AI Mode supports text and follow-up questions. It does not yet
  support voice input, files, user images, or persistent history.
- Quality depends on the search engine, available snippets, selected model, and
  the model's citation discipline.
- Pricing, model availability, limits, and privacy policies remain those of each
  provider.

## Development and testing

Requires Node.js 20 or later.

```bash
npm test
npm run check
```

The test suite covers presets, automatic protocol selection, settings
validation, HTML/URL escaping, prompts, and OpenAI Chat, OpenAI Responses,
Anthropic, Gemini, and Ollama streams.

Development references:

- [degoog plugins](https://degoog-org.github.io/docs/plugins.html)
- [degoog styles and variables](https://degoog-org.github.io/docs/styling.html)
- [degoog translations](https://degoog-org.github.io/docs/translations.html)
- [Google AI Overviews interaction reference](https://search.google/ways-to-search/ai-overviews/)

## License

[MIT](LICENSE)
