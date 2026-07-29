import { anthropicAdapter } from "./anthropic.js";
import { geminiAdapter } from "./gemini.js";
import { ollamaAdapter } from "./ollama.js";
import { openAIChatAdapter } from "./openai-chat.js";
import { openAIResponsesAdapter } from "./openai-responses.js";
import { ProtocolId } from "./types.js";

export * from "./presets.js";
export * from "./types.js";

const ADAPTERS = {
  [ProtocolId.OpenAIChat]: openAIChatAdapter,
  [ProtocolId.OpenAIResponses]: openAIResponsesAdapter,
  [ProtocolId.Anthropic]: anthropicAdapter,
  [ProtocolId.Gemini]: geminiAdapter,
  [ProtocolId.Ollama]: ollamaAdapter,
};

export const pickAdapter = (protocol) => ADAPTERS[protocol] ?? openAIChatAdapter;
