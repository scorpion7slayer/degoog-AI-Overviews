export const ProtocolId = Object.freeze({
  OpenAIChat: "openai-chat",
  OpenAIResponses: "openai-responses",
  Anthropic: "anthropic",
  Gemini: "gemini",
  Ollama: "ollama",
});

export const ChunkKind = Object.freeze({
  Text: "text",
  Thinking: "thinking",
  Done: "done",
  Error: "error",
});

export const ChatRole = Object.freeze({
  System: "system",
  User: "user",
  Assistant: "assistant",
});

export const AuthMode = Object.freeze({
  Bearer: "bearer",
  Anthropic: "anthropic",
  Gemini: "gemini",
  None: "none",
});
