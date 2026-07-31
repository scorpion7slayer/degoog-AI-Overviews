import {
  configurationError,
  providerLabel,
  resolveProviderConfig,
} from "./providers/index.js";
import {
  buildOverviewMessages,
  DEFAULT_SYSTEM_PROMPT,
} from "./src/prompt.js";
import {
  buildPanelHtml,
  buildSources,
  normalizeQuery,
  summaryCacheKey,
} from "./src/panel.js";
import {
  basePathFromApiBase,
  buildModeClientScript,
  modeAssetResponse,
  modePageResponse,
  renderModePage,
} from "./src/mode-page.js";
import {
  FOLLOWUP_MIN_TOKENS,
  parseSettings,
  settingsSchema,
} from "./src/settings.js";
import { runStream } from "./src/pipeline.js";

const PLUGIN_ID = "ai-overviews";
const CACHE_NAMESPACE = "ext:ai-overviews:summary";
const DEFAULT_CACHE_TTL_MS = 10 * 60_000;
const MAX_REQUEST_BYTES = 160_000;
const MAX_CHAT_MESSAGES = 14;
const MAX_CHAT_CHARS = 50_000;

export const searchBarActions = [
  {
    id: "ai-mode",
    label: "AI Mode",
    type: "custom",
    isClientExposed: false,
  },
];

let currentSettings = parseSettings({});
let summaryCache = null;
let providerFetch = globalThis.fetch.bind(globalThis);
let pluginApiBase = `/api/plugin/${PLUGIN_ID}`;
let modePageTemplate = "";
let modePageStyles = "";
let modePageScript = "";

const jsonResponse = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const readJson = async (request) => {
  const contentLength = Number.parseInt(request.headers.get("content-length") || "0", 10);
  if (contentLength > MAX_REQUEST_BYTES) {
    return { error: jsonResponse({ error: "Request body is too large." }, 413) };
  }
  try {
    return { data: await request.json() };
  } catch {
    return { error: jsonResponse({ error: "Invalid JSON body." }, 400) };
  }
};

const normalizeChatMessages = (raw) => {
  if (!Array.isArray(raw) || !raw.length || raw.length > MAX_CHAT_MESSAGES) return null;
  const messages = [];
  let characters = 0;
  for (const message of raw) {
    if (!["system", "user", "assistant"].includes(message?.role)) return null;
    if (typeof message.content !== "string") return null;
    const content = message.content.slice(0, 12_000);
    characters += content.length;
    if (characters > MAX_CHAT_CHARS) return null;
    messages.push({ role: message.role, content });
  }
  return messages;
};

const streamFor = ({ messages, cacheKey = null, maxTokens }) => {
  const providerConfig = resolveProviderConfig(currentSettings);
  const settings = maxTokens
    ? { ...currentSettings, maxTokens: Math.max(currentSettings.maxTokens, maxTokens) }
    : currentSettings;
  return runStream({
    messages,
    cacheKey,
    settings,
    providerConfig,
    cache: summaryCache,
    fetchFn: providerFetch,
  });
};

export const slot = {
  id: PLUGIN_ID,
  settingsId: PLUGIN_ID,
  name: "AI Overviews",
  position: "at-a-glance",
  waitForResults: true,
  isClientExposed: false,
  needsAppRestart: true,
  get description() {
    return (
      this.t?.("ai-overviews.description") ||
      "A cited, multi-provider AI overview for degoog search results."
    );
  },

  async init(context) {
    if (typeof context?.useCache === "function") {
      summaryCache = context.useCache(CACHE_NAMESPACE, DEFAULT_CACHE_TTL_MS);
    } else if (typeof context?.createCache === "function") {
      summaryCache = context.createCache(DEFAULT_CACHE_TTL_MS);
    }
    if (typeof context?.fetch === "function") providerFetch = context.fetch;
    if (typeof context?.apiBase === "string" && context.apiBase) {
      pluginApiBase = context.apiBase;
    }
    if (typeof context?.readFile === "function") {
      const [page, styles, script] = await Promise.all([
        context.readFile("mode.html").catch(() => ""),
        context.readFile("mode.css").catch(() => ""),
        context.readFile("mode.js").catch(() => ""),
      ]);
      modePageTemplate = page;
      modePageStyles = styles;
      modePageScript = script;
    }
  },

  configure(settings) {
    currentSettings = parseSettings(settings);
  },

  trigger(query) {
    if (configurationError(currentSettings)) return false;
    if (currentSettings.questionMarkOnly && !String(query).trim().endsWith("?")) return false;
    return true;
  },

  async execute(query, context) {
    const normalizedQuery = normalizeQuery(query);
    if (!normalizedQuery) return { html: "" };
    if (currentSettings.questionMarkOnly && !normalizedQuery.endsWith("?")) {
      return { html: "" };
    }
    if (configurationError(currentSettings)) return { html: "" };
    const sources = buildSources(
      context?.results,
      currentSettings.maxSources,
      context?.signProxyUrl,
    );
    if (!sources.length) return { html: "" };
    return {
      html: buildPanelHtml({
        t: this.t,
        query: normalizedQuery,
        sources,
        providerLabel: providerLabel(currentSettings.provider),
        hideOnError: currentSettings.hideOnError,
        showSources: currentSettings.showSources,
        modeUrl: `${pluginApiBase}/mode?q=${encodeURIComponent(normalizedQuery)}`,
      }),
    };
  },

  settingsSchema,
};

export const routes = [
  {
    method: "get",
    path: "/mode",
    handler(request) {
      if (!modePageTemplate) {
        return new Response("AI Mode page is unavailable.", { status: 503 });
      }
      return modePageResponse(
        renderModePage(modePageTemplate, {
          apiBase: pluginApiBase,
          request,
        }),
      );
    },
  },
  {
    method: "get",
    path: "/mode.css",
    handler() {
      if (!modePageStyles) {
        return new Response("AI Mode styles are unavailable.", { status: 503 });
      }
      return modeAssetResponse(modePageStyles, "text/css; charset=utf-8");
    },
  },
  {
    method: "get",
    path: "/mode.js",
    handler() {
      if (!modePageScript) {
        return new Response("AI Mode client is unavailable.", { status: 503 });
      }
      return modeAssetResponse(
        buildModeClientScript(modePageScript, {
          apiBase: pluginApiBase,
          basePath: basePathFromApiBase(pluginApiBase),
          searchUrl: `${basePathFromApiBase(pluginApiBase)}/api/search`,
          maxSources: currentSettings.maxSources,
          providerLabel: providerLabel(currentSettings.provider),
        }),
        "text/javascript; charset=utf-8",
      );
    },
  },
  {
    method: "get",
    path: "/status",
    handler() {
      const providerConfig = resolveProviderConfig(currentSettings);
      const error = configurationError(currentSettings);
      return jsonResponse({
        configured: !error,
        provider: providerConfig.provider,
        providerLabel: providerConfig.providerLabel,
        protocol: providerConfig.protocol,
        model: providerConfig.model,
        error,
      });
    },
  },
  {
    method: "post",
    path: "/stream",
    async handler(request) {
      const parsed = await readJson(request);
      if (parsed.error) return parsed.error;
      const query = normalizeQuery(parsed.data?.query);
      const sources = buildSources(parsed.data?.results, currentSettings.maxSources);
      if (!query || !sources.length) {
        return jsonResponse({ error: "A query and at least one search result are required." }, 400);
      }
      if (currentSettings.questionMarkOnly && !query.endsWith("?")) {
        return jsonResponse({ error: "Question-only mode is enabled." }, 403);
      }
      const error = configurationError(currentSettings);
      if (error) return jsonResponse({ error }, 400);
      const providerConfig = resolveProviderConfig(currentSettings);
      const signature = [
        providerConfig.provider,
        providerConfig.protocol,
        providerConfig.baseUrl,
        providerConfig.model,
        currentSettings.summaryStyle,
        currentSettings.maxSources,
      ].join("|");
      const messages = buildOverviewMessages(
        query,
        sources,
        currentSettings.summaryStyle,
        currentSettings.systemPrompt || DEFAULT_SYSTEM_PROMPT,
      );
      return streamFor({
        messages,
        cacheKey: summaryCacheKey(query, sources, signature),
      });
    },
  },
  {
    method: "post",
    path: "/chat",
    async handler(request) {
      const parsed = await readJson(request);
      if (parsed.error) return parsed.error;
      const messages = normalizeChatMessages(parsed.data?.messages);
      if (!messages) {
        return jsonResponse({ error: "Invalid or oversized chat history." }, 400);
      }
      const error = configurationError(currentSettings);
      if (error) return jsonResponse({ error }, 400);
      return streamFor({ messages, maxTokens: FOLLOWUP_MIN_TOKENS });
    },
  },
];
