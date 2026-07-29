import {
  authHeaders,
  endpointFor,
  providerErrorMessage,
  streamProviderErrorMessage,
} from "./http.js";
import { readSse } from "./sse.js";
import { ChatRole, ChunkKind } from "./types.js";

const toAnthropicMessages = (messages) => {
  const system = messages
    .filter((message) => message.role === ChatRole.System)
    .map((message) => message.content)
    .join("\n\n");
  const turns = messages
    .filter((message) => message.role !== ChatRole.System)
    .map((message) => ({
      role: message.role === ChatRole.Assistant ? "assistant" : "user",
      content: message.content,
    }));
  return { system, turns };
};

export const streamAnthropic = async function* (config, messages, options) {
  const { system, turns } = toAnthropicMessages(messages);
  const body = {
    model: config.model,
    max_tokens: options.maxTokens,
    stream: true,
    messages: turns,
  };
  if (system) body.system = system;
  if (options.enableThinking && options.maxTokens >= 256) {
    body.thinking = {
      type: "enabled",
      budget_tokens: Math.min(1024, Math.max(128, options.maxTokens - 128)),
    };
  }
  const headers = authHeaders(config);
  headers.Accept = "text/event-stream";
  headers["anthropic-version"] = "2023-06-01";

  let response;
  try {
    response = await options.fetch(endpointFor(config.baseUrl, "messages"), {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: options.signal,
    });
  } catch {
    yield { kind: ChunkKind.Error, message: "Could not reach the provider." };
    return;
  }
  if (!response.ok || !response.body) {
    yield { kind: ChunkKind.Error, message: providerErrorMessage(response) };
    return;
  }

  let finishReason;
  let emittedText = false;
  for await (const event of readSse(response.body)) {
    let payload;
    try {
      payload = JSON.parse(event.data);
    } catch {
      continue;
    }
    if (payload.type === "content_block_delta") {
      if (payload.delta?.type === "text_delta" && payload.delta.text) {
        emittedText = true;
        yield { kind: ChunkKind.Text, text: payload.delta.text };
      }
      if (payload.delta?.type === "thinking_delta" && payload.delta.thinking) {
        yield { kind: ChunkKind.Thinking, text: payload.delta.thinking };
      }
    } else if (payload.type === "message_delta") {
      finishReason = payload.delta?.stop_reason || finishReason;
    } else if (payload.type === "error") {
      yield {
        kind: ChunkKind.Error,
        message: streamProviderErrorMessage(payload.error),
      };
      return;
    }
  }
  if (!emittedText) {
    yield { kind: ChunkKind.Error, message: "The model returned no answer text." };
    return;
  }
  yield { kind: ChunkKind.Done, finishReason };
};

export const anthropicAdapter = { stream: streamAnthropic };
