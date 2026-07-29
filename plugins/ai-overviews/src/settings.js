import {
  listProviderIds,
  ProviderId,
  PROVIDER_PRESETS,
} from "../providers/presets.js";
import { ProtocolId } from "../providers/types.js";
import { DEFAULT_SYSTEM_PROMPT } from "./prompt.js";

export const DEFAULT_TIMEOUT_S = 180;
export const DEFAULT_MAX_TOKENS = 2048;
export const DEFAULT_MAX_SOURCES = 8;
export const FOLLOWUP_MIN_TOKENS = 768;

const asString = (value) => (typeof value === "string" ? value : String(value ?? ""));
const asBool = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") return fallback;
  return value === true || value === "true";
};
const asInt = (value, fallback, min, max) => {
  const parsed = Number.parseInt(asString(value), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

export const parseSettings = (raw = {}) => {
  const provider = listProviderIds().includes(asString(raw.provider))
    ? asString(raw.provider)
    : ProviderId.OllamaLocal;
  const protocol = asString(raw.providerProtocol);
  return {
    provider,
    providerProtocol:
      protocol === "auto" || Object.values(ProtocolId).includes(protocol) ? protocol : "auto",
    baseUrl: asString(raw.baseUrl),
    model: asString(raw.model),
    apiKey: asString(raw.apiKey),
    cloudflareAccountId: asString(raw.cloudflareAccountId),
    cloudflareGatewayId: asString(raw.cloudflareGatewayId),
    timeoutMs:
      asInt(raw.timeoutSeconds, DEFAULT_TIMEOUT_S, 5, 3600) * 1000,
    maxTokens: asInt(raw.maxTokens, DEFAULT_MAX_TOKENS, 128, 131072),
    maxSources: asInt(raw.maxSources, DEFAULT_MAX_SOURCES, 3, 12),
    cacheMinutes: asInt(raw.cacheMinutes, 10, 0, 1440),
    systemPrompt: asString(raw.systemPrompt),
    summaryStyle: ["concise", "balanced", "detailed"].includes(asString(raw.summaryStyle))
      ? asString(raw.summaryStyle)
      : "balanced",
    questionMarkOnly: asBool(raw.questionMarkOnly),
    enableThinking: asBool(raw.enableThinking),
    hideOnError: asBool(raw.hideOnError),
    showSources: asBool(raw.showSources, true),
  };
};

const providerIds = listProviderIds();

export const settingsSchema = [
  {
    key: "provider",
    label: "LLM provider",
    type: "select",
    options: providerIds,
    optionLabels: providerIds.map((id) => PROVIDER_PRESETS[id].label),
    default: ProviderId.OllamaLocal,
    description:
      "Requests run on the degoog server. Cursor requires your own compatible gateway because Cursor does not publish a chat inference API.",
  },
  {
    key: "model",
    label: "Model ID",
    type: "text",
    required: true,
    placeholder: "qwen3:8b / gpt-5-mini / gemini-2.5-flash",
    description:
      "Use the exact model ID exposed by your provider. OpenCode Zen automatically selects its protocol from the model family.",
  },
  {
    key: "apiKey",
    label: "API key",
    type: "password",
    secret: true,
    placeholder: "Not required for local Ollama",
    description: "Stored as a degoog secret and never returned to the browser.",
  },
  {
    key: "cloudflareAccountId",
    label: "Cloudflare account ID",
    type: "text",
    visibleWhen: { key: "provider", equals: ProviderId.CloudflareWorkersAI },
    description: "Used to build the official Workers AI OpenAI-compatible endpoint.",
  },
  {
    key: "cloudflareGatewayId",
    label: "Cloudflare AI Gateway ID",
    type: "text",
    advanced: true,
    visibleWhen: { key: "provider", equals: ProviderId.CloudflareWorkersAI },
    placeholder: "default",
    description: "Optional. Adds the `cf-aig-gateway-id` header.",
  },
  {
    key: "baseUrl",
    label: "API base URL override",
    type: "url",
    advanced: true,
    placeholder: "Leave blank to use the provider preset",
    description:
      "Required for OpenAI-compatible and Cursor gateway presets. For local Ollama in Docker, use a URL reachable from the degoog container.",
  },
  {
    key: "providerProtocol",
    label: "API protocol override",
    type: "select",
    advanced: true,
    options: [
      "auto",
      ProtocolId.OpenAIChat,
      ProtocolId.OpenAIResponses,
      ProtocolId.Anthropic,
      ProtocolId.Gemini,
      ProtocolId.Ollama,
    ],
    optionLabels: [
      "Automatic",
      "OpenAI Chat Completions",
      "OpenAI Responses",
      "Anthropic Messages",
      "Google GenerateContent",
      "Ollama native chat",
    ],
    default: "auto",
    description:
      "Keep Automatic for presets. Override only when a gateway exposes a different protocol for the selected model.",
  },
  {
    key: "summaryStyle",
    label: "Answer depth",
    type: "select",
    options: ["concise", "balanced", "detailed"],
    optionLabels: ["Concise", "Balanced", "Detailed"],
    default: "balanced",
  },
  {
    key: "maxSources",
    label: "Search sources",
    type: "number",
    default: String(DEFAULT_MAX_SOURCES),
    placeholder: String(DEFAULT_MAX_SOURCES),
    description: "Number of top degoog results included in the overview (3–12).",
  },
  {
    key: "showSources",
    label: "Show source strip",
    type: "toggle",
    default: "true",
  },
  {
    key: "questionMarkOnly",
    label: "Only trigger for questions (?)",
    type: "toggle",
    description: "Only show the overview when the query ends with a question mark.",
  },
  {
    key: "hideOnError",
    label: "Hide panel on error",
    type: "toggle",
    description: "Otherwise the panel keeps a compact error state with a retry button.",
  },
  {
    key: "enableThinking",
    label: "Enable model reasoning",
    type: "toggle",
    advanced: true,
    description: "Can increase latency and cost. Reasoning is never included in the final answer.",
  },
  {
    key: "timeoutSeconds",
    label: "Timeout in seconds",
    type: "number",
    advanced: true,
    default: String(DEFAULT_TIMEOUT_S),
  },
  {
    key: "maxTokens",
    label: "Maximum output tokens",
    type: "number",
    advanced: true,
    default: String(DEFAULT_MAX_TOKENS),
  },
  {
    key: "cacheMinutes",
    label: "Overview cache in minutes",
    type: "number",
    advanced: true,
    default: "10",
    description: "Set to 0 to disable summary caching.",
  },
  {
    key: "systemPrompt",
    label: "Custom system prompt",
    type: "textarea",
    advanced: true,
    placeholder: DEFAULT_SYSTEM_PROMPT,
    description: "Blank uses the source-grounded prompt shipped with the plugin.",
  },
];
