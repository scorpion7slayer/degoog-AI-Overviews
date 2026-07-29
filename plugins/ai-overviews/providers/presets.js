import { AuthMode, ProtocolId } from "./types.js";

export const ProviderId = Object.freeze({
  OllamaLocal: "ollama-local",
  OllamaCloud: "ollama-cloud",
  OpenCodeZen: "opencode-zen",
  OpenCodeGo: "opencode-go",
  OpenAI: "openai",
  OpenAICompatible: "openai-compatible",
  Gemini: "gemini",
  Kilo: "kilo",
  Moonshot: "moonshot",
  Anthropic: "anthropic",
  OpenRouter: "openrouter",
  Qwen: "qwen",
  Zai: "zai",
  Perplexity: "perplexity",
  CloudflareWorkersAI: "cloudflare-workers-ai",
  Xai: "xai",
  CursorGateway: "cursor-gateway",
});

export const PROVIDER_PRESETS = Object.freeze({
  [ProviderId.OllamaLocal]: {
    label: "Ollama local",
    protocol: ProtocolId.Ollama,
    baseUrl: "http://localhost:11434",
    authMode: AuthMode.None,
    requiresApiKey: false,
    modelExample: "qwen3:8b",
  },
  [ProviderId.OllamaCloud]: {
    label: "Ollama Cloud",
    protocol: ProtocolId.Ollama,
    baseUrl: "https://ollama.com",
    authMode: AuthMode.Bearer,
    requiresApiKey: true,
    modelExample: "gpt-oss:120b",
  },
  [ProviderId.OpenCodeZen]: {
    label: "OpenCode Zen",
    protocol: "auto-opencode-zen",
    baseUrl: "https://opencode.ai/zen/v1",
    authMode: AuthMode.Bearer,
    requiresApiKey: true,
    modelExample: "big-pickle",
  },
  [ProviderId.OpenCodeGo]: {
    label: "OpenCode Go",
    protocol: "auto-opencode-go",
    baseUrl: "https://opencode.ai/zen/go/v1",
    authMode: AuthMode.Bearer,
    requiresApiKey: true,
    modelExample: "kimi-k3",
  },
  [ProviderId.OpenAI]: {
    label: "OpenAI",
    protocol: ProtocolId.OpenAIResponses,
    baseUrl: "https://api.openai.com/v1",
    authMode: AuthMode.Bearer,
    requiresApiKey: true,
    modelExample: "gpt-5-mini",
  },
  [ProviderId.OpenAICompatible]: {
    label: "OpenAI compatible",
    protocol: ProtocolId.OpenAIChat,
    baseUrl: "",
    authMode: AuthMode.Bearer,
    requiresApiKey: false,
    requiresBaseUrl: true,
    modelExample: "your-model-id",
  },
  [ProviderId.Gemini]: {
    label: "Google Gemini",
    protocol: ProtocolId.Gemini,
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    authMode: AuthMode.Gemini,
    requiresApiKey: true,
    modelExample: "gemini-2.5-flash",
  },
  [ProviderId.Kilo]: {
    label: "Kilo Code Gateway",
    protocol: ProtocolId.OpenAIChat,
    baseUrl: "https://api.kilo.ai/api/gateway",
    authMode: AuthMode.Bearer,
    requiresApiKey: true,
    modelExample: "anthropic/claude-sonnet-4.6",
  },
  [ProviderId.Moonshot]: {
    label: "Moonshot / Kimi",
    protocol: ProtocolId.OpenAIChat,
    baseUrl: "https://api.moonshot.ai/v1",
    authMode: AuthMode.Bearer,
    requiresApiKey: true,
    modelExample: "kimi-k3",
  },
  [ProviderId.Anthropic]: {
    label: "Anthropic Claude",
    protocol: ProtocolId.Anthropic,
    baseUrl: "https://api.anthropic.com/v1",
    authMode: AuthMode.Anthropic,
    requiresApiKey: true,
    modelExample: "claude-haiku-4-5",
  },
  [ProviderId.OpenRouter]: {
    label: "OpenRouter",
    protocol: ProtocolId.OpenAIChat,
    baseUrl: "https://openrouter.ai/api/v1",
    authMode: AuthMode.Bearer,
    requiresApiKey: true,
    modelExample: "openai/gpt-5-mini",
  },
  [ProviderId.Qwen]: {
    label: "Qwen / Alibaba Model Studio",
    protocol: ProtocolId.OpenAIChat,
    baseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    authMode: AuthMode.Bearer,
    requiresApiKey: true,
    modelExample: "qwen-plus",
    thinkingFormat: "qwen",
  },
  [ProviderId.Zai]: {
    label: "Z.AI / GLM",
    protocol: ProtocolId.OpenAIChat,
    baseUrl: "https://api.z.ai/api/paas/v4",
    authMode: AuthMode.Bearer,
    requiresApiKey: true,
    modelExample: "glm-5",
    thinkingFormat: "zai",
  },
  [ProviderId.Perplexity]: {
    label: "Perplexity Sonar",
    protocol: ProtocolId.OpenAIChat,
    baseUrl: "https://api.perplexity.ai",
    authMode: AuthMode.Bearer,
    requiresApiKey: true,
    modelExample: "sonar-pro",
  },
  [ProviderId.CloudflareWorkersAI]: {
    label: "Cloudflare Workers AI",
    protocol: ProtocolId.OpenAIChat,
    baseUrl: "",
    authMode: AuthMode.Bearer,
    requiresApiKey: true,
    modelExample: "@cf/meta/llama-3.1-8b-instruct",
  },
  [ProviderId.Xai]: {
    label: "xAI",
    protocol: ProtocolId.OpenAIChat,
    baseUrl: "https://api.x.ai/v1",
    authMode: AuthMode.Bearer,
    requiresApiKey: true,
    modelExample: "grok-4",
  },
  [ProviderId.CursorGateway]: {
    label: "Cursor via compatible gateway",
    protocol: ProtocolId.OpenAIChat,
    baseUrl: "",
    authMode: AuthMode.Bearer,
    requiresApiKey: true,
    requiresBaseUrl: true,
    modelExample: "gateway-model-id",
  },
});

const modelStartsWith = (model, prefixes) =>
  prefixes.some((prefix) => model.toLowerCase().startsWith(prefix));

const inferOpenCodeProtocol = (provider, model) => {
  if (provider === ProviderId.OpenCodeGo) {
    if (modelStartsWith(model, ["qwen", "minimax"])) return ProtocolId.Anthropic;
    return ProtocolId.OpenAIChat;
  }
  if (modelStartsWith(model, ["gpt-"])) return ProtocolId.OpenAIResponses;
  if (modelStartsWith(model, ["claude-", "qwen3.5", "qwen3.6", "qwen3.7"])) {
    return ProtocolId.Anthropic;
  }
  if (modelStartsWith(model, ["gemini-"])) return ProtocolId.Gemini;
  return ProtocolId.OpenAIChat;
};

const cleanBaseUrl = (value) => String(value ?? "").trim().replace(/\/+$/, "");

export const listProviderIds = () => Object.keys(PROVIDER_PRESETS);

export const providerLabel = (provider) =>
  PROVIDER_PRESETS[provider]?.label ?? PROVIDER_PRESETS[ProviderId.OpenAICompatible].label;

export const resolveProviderConfig = (settings) => {
  const provider = PROVIDER_PRESETS[settings.provider]
    ? settings.provider
    : ProviderId.OllamaLocal;
  const preset = PROVIDER_PRESETS[provider];
  const override = String(settings.providerProtocol ?? "auto");
  let protocol = preset.protocol;
  if (override !== "auto" && Object.values(ProtocolId).includes(override)) {
    protocol = override;
  } else if (String(protocol).startsWith("auto-opencode")) {
    protocol = inferOpenCodeProtocol(provider, settings.model);
  }

  let baseUrl = cleanBaseUrl(settings.baseUrl) || preset.baseUrl;
  if (provider === ProviderId.CloudflareWorkersAI && !baseUrl && settings.cloudflareAccountId) {
    baseUrl = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(settings.cloudflareAccountId)}/ai/v1`;
  }

  const extraHeaders = {};
  if (provider === ProviderId.CloudflareWorkersAI && settings.cloudflareGatewayId) {
    extraHeaders["cf-aig-gateway-id"] = settings.cloudflareGatewayId;
  }

  return {
    provider,
    providerLabel: preset.label,
    protocol,
    baseUrl: cleanBaseUrl(baseUrl),
    model: String(settings.model ?? "").trim(),
    apiKey: String(settings.apiKey ?? "").trim(),
    authMode:
      (provider === ProviderId.OpenCodeZen || provider === ProviderId.OpenCodeGo)
        ? AuthMode.Bearer
        : preset.authMode,
    requiresApiKey: preset.requiresApiKey,
    requiresBaseUrl: preset.requiresBaseUrl || provider === ProviderId.CloudflareWorkersAI,
    thinkingFormat: preset.thinkingFormat,
    extraHeaders,
  };
};

export const configurationError = (settings) => {
  const config = resolveProviderConfig(settings);
  if (!config.model) return "A model ID is required.";
  if (!config.baseUrl && config.requiresBaseUrl) {
    if (config.provider === ProviderId.CloudflareWorkersAI) {
      return "Set a Cloudflare account ID or an API base URL.";
    }
    if (config.provider === ProviderId.CursorGateway) {
      return "Cursor has no public chat inference endpoint. Set the URL of your own OpenAI-compatible gateway.";
    }
    return "An API base URL is required.";
  }
  if (config.requiresApiKey && !config.apiKey) return "An API key is required.";
  return null;
};
