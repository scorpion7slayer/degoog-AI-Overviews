import {
  authHeaders,
  endpointFor,
  providerErrorMessage,
  streamProviderErrorMessage,
} from "./http.js";
import { readNdjson } from "./sse.js";
import { ChunkKind } from "./types.js";

export const streamOllama = async function* (config, messages, options) {
  const body = {
    model: config.model,
    messages,
    stream: true,
    think: options.enableThinking,
    options: { num_predict: options.maxTokens },
  };
  let response;
  try {
    response = await options.fetch(endpointFor(config.baseUrl, "api/chat"), {
      method: "POST",
      headers: authHeaders(config),
      body: JSON.stringify(body),
      signal: options.signal,
    });
  } catch {
    yield { kind: ChunkKind.Error, message: "Could not reach Ollama." };
    return;
  }
  if (!response.ok || !response.body) {
    yield { kind: ChunkKind.Error, message: providerErrorMessage(response) };
    return;
  }

  let finishReason;
  let emittedText = false;
  for await (const payload of readNdjson(response.body)) {
    if (payload.error) {
      yield {
        kind: ChunkKind.Error,
        message: streamProviderErrorMessage(payload.error),
      };
      return;
    }
    if (payload.message?.thinking) {
      yield { kind: ChunkKind.Thinking, text: payload.message.thinking };
    }
    if (payload.message?.content) {
      emittedText = true;
      yield { kind: ChunkKind.Text, text: payload.message.content };
    }
    if (payload.done) finishReason = payload.done_reason || "stop";
  }
  if (!emittedText) {
    yield { kind: ChunkKind.Error, message: "The model returned no answer text." };
    return;
  }
  yield { kind: ChunkKind.Done, finishReason };
};

export const ollamaAdapter = { stream: streamOllama };
