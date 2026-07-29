import {
  authHeaders,
  endpointFor,
  providerErrorMessage,
  streamProviderErrorMessage,
} from "./http.js";
import { readSse } from "./sse.js";
import { ChatRole, ChunkKind } from "./types.js";

const toResponsesInput = (messages) => {
  const instructions = messages
    .filter((message) => message.role === ChatRole.System)
    .map((message) => message.content)
    .join("\n\n");
  const input = messages
    .filter((message) => message.role !== ChatRole.System)
    .map((message) => ({
      role: message.role === ChatRole.Assistant ? "assistant" : "user",
      content: message.content,
    }));
  return { instructions, input };
};

export const streamOpenAIResponses = async function* (config, messages, options) {
  const { instructions, input } = toResponsesInput(messages);
  const body = {
    model: config.model,
    input,
    stream: true,
    max_output_tokens: options.maxTokens,
  };
  if (instructions) body.instructions = instructions;
  if (options.enableThinking) {
    body.reasoning = { effort: "medium", summary: "auto" };
  }

  let response;
  try {
    response = await options.fetch(endpointFor(config.baseUrl, "responses"), {
      method: "POST",
      headers: {
        ...authHeaders(config),
        Accept: "text/event-stream",
      },
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
    const type = payload.type || event.event;
    if (type === "response.output_text.delta" && payload.delta) {
      emittedText = true;
      yield { kind: ChunkKind.Text, text: payload.delta };
    } else if (
      (type === "response.reasoning_summary_text.delta" ||
        type === "response.reasoning_text.delta") &&
      payload.delta
    ) {
      yield { kind: ChunkKind.Thinking, text: payload.delta };
    } else if (type === "response.completed") {
      finishReason = payload.response?.status || "completed";
    } else if (type === "response.incomplete") {
      finishReason = "incomplete";
    } else if (type === "response.failed" || type === "error") {
      yield {
        kind: ChunkKind.Error,
        message: streamProviderErrorMessage(
          payload.response?.error ?? payload.error ?? payload.message,
        ),
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

export const openAIResponsesAdapter = { stream: streamOpenAIResponses };
