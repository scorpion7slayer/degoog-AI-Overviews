import {
  authHeaders,
  endpointFor,
  providerErrorMessage,
  streamProviderErrorMessage,
} from "./http.js";
import { readSse } from "./sse.js";
import { ChatRole, ChunkKind } from "./types.js";

const toGeminiContents = (messages) => {
  const system = messages
    .filter((message) => message.role === ChatRole.System)
    .map((message) => message.content)
    .join("\n\n");
  const contents = messages
    .filter((message) => message.role !== ChatRole.System)
    .map((message) => ({
      role: message.role === ChatRole.Assistant ? "model" : "user",
      parts: [{ text: message.content }],
    }));
  return { system, contents };
};

export const streamGemini = async function* (config, messages, options) {
  const { system, contents } = toGeminiContents(messages);
  const body = {
    contents,
    generationConfig: {
      maxOutputTokens: options.maxTokens,
      thinkingConfig: options.enableThinking
        ? { includeThoughts: true }
        : { thinkingBudget: 0 },
    },
  };
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  const endpoint = endpointFor(
    config.baseUrl,
    `models/${encodeURIComponent(config.model)}:streamGenerateContent`,
  );
  const url = `${endpoint}?alt=sse`;

  let response;
  try {
    response = await options.fetch(url, {
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
    if (payload.error) {
      yield {
        kind: ChunkKind.Error,
        message: streamProviderErrorMessage(payload.error),
      };
      return;
    }
    const candidate = payload.candidates?.[0];
    if (!candidate) continue;
    for (const part of candidate.content?.parts ?? []) {
      if (!part.text) continue;
      if (part.thought) {
        yield { kind: ChunkKind.Thinking, text: part.text };
      } else {
        emittedText = true;
        yield { kind: ChunkKind.Text, text: part.text };
      }
    }
    finishReason = candidate.finishReason || finishReason;
  }
  if (!emittedText) {
    yield { kind: ChunkKind.Error, message: "The model returned no answer text." };
    return;
  }
  yield { kind: ChunkKind.Done, finishReason };
};

export const geminiAdapter = { stream: streamGemini };
