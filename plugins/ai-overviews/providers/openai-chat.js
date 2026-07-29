import {
  authHeaders,
  endpointFor,
  providerErrorMessage,
  streamProviderErrorMessage,
} from "./http.js";
import { readSse } from "./sse.js";
import { ChunkKind } from "./types.js";

const THINK_OPEN = "<think>";
const THINK_CLOSE = "</think>";
const STOP_MARKERS = ["<|endoftext|>", "<|im_end|>", "<|im_start|>"];

const reasoningText = (delta) => {
  if (typeof delta?.reasoning_content === "string") return delta.reasoning_content;
  if (typeof delta?.reasoning === "string") return delta.reasoning;
  if (typeof delta?.thinking === "string") return delta.thinking;
  if (typeof delta?.reasoning?.content === "string") return delta.reasoning.content;
  return "";
};

const contentText = (content) => {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((part) => part?.type === "text" || part?.type === "output_text")
    .map((part) => part.text ?? "")
    .join("");
};

const firstStopMarker = (text) => {
  let first = -1;
  for (const marker of STOP_MARKERS) {
    const index = text.indexOf(marker);
    if (index >= 0 && (first < 0 || index < first)) first = index;
  }
  return first;
};

const createThinkSplitter = () => {
  let inThinking = false;
  let carry = "";
  return (raw) => {
    let work = carry + raw;
    carry = "";
    let thinking = "";
    let text = "";
    while (work) {
      const tag = inThinking ? THINK_CLOSE : THINK_OPEN;
      const index = work.indexOf(tag);
      if (index < 0) {
        const possibleTag = work.lastIndexOf("<");
        if (possibleTag >= 0 && tag.startsWith(work.slice(possibleTag))) {
          const complete = work.slice(0, possibleTag);
          if (inThinking) thinking += complete;
          else text += complete;
          carry = work.slice(possibleTag);
          break;
        }
        if (inThinking) thinking += work;
        else text += work;
        break;
      }
      const before = work.slice(0, index);
      if (inThinking) thinking += before;
      else text += before;
      work = work.slice(index + tag.length);
      inThinking = !inThinking;
    }
    const stopAt = firstStopMarker(text);
    return {
      thinking,
      text: stopAt >= 0 ? text.slice(0, stopAt) : text,
      stopped: stopAt >= 0,
    };
  };
};

const requestBody = (config, messages, options) => {
  const body = {
    model: config.model,
    messages,
    stream: true,
    max_tokens: options.maxTokens,
  };
  if (config.thinkingFormat === "qwen") {
    body.enable_thinking = options.enableThinking;
  } else if (config.thinkingFormat === "zai") {
    body.thinking = { type: options.enableThinking ? "enabled" : "disabled" };
  } else if (options.enableThinking) {
    body.reasoning_effort = "medium";
  }
  return body;
};

export const streamOpenAIChat = async function* (config, messages, options) {
  let response;
  try {
    response = await options.fetch(endpointFor(config.baseUrl, "chat/completions"), {
      method: "POST",
      headers: {
        ...authHeaders(config),
        Accept: "text/event-stream",
      },
      body: JSON.stringify(requestBody(config, messages, options)),
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

  const splitThinking = createThinkSplitter();
  let finishReason;
  let emittedText = false;
  for await (const event of readSse(response.body)) {
    if (event.data === "[DONE]") break;
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
    const choice = payload.choices?.[0];
    if (!choice) continue;
    const reasoning = reasoningText(choice.delta);
    if (reasoning) yield { kind: ChunkKind.Thinking, text: reasoning };
    const rawText = contentText(choice.delta?.content);
    if (rawText) {
      const split = splitThinking(rawText);
      if (split.thinking) yield { kind: ChunkKind.Thinking, text: split.thinking };
      if (split.text) {
        emittedText = true;
        yield { kind: ChunkKind.Text, text: split.text };
      }
      if (split.stopped) {
        finishReason = "stop";
        break;
      }
    }
    if (choice.finish_reason) finishReason = choice.finish_reason;
  }
  if (!emittedText) {
    yield { kind: ChunkKind.Error, message: "The model returned no answer text." };
    return;
  }
  yield { kind: ChunkKind.Done, finishReason };
};

export const openAIChatAdapter = { stream: streamOpenAIChat };
