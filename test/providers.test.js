import assert from "node:assert/strict";
import test from "node:test";

import { streamAnthropic } from "../plugins/ai-overviews/providers/anthropic.js";
import { streamGemini } from "../plugins/ai-overviews/providers/gemini.js";
import { streamOllama } from "../plugins/ai-overviews/providers/ollama.js";
import { streamOpenAIChat } from "../plugins/ai-overviews/providers/openai-chat.js";
import { streamOpenAIResponses } from "../plugins/ai-overviews/providers/openai-responses.js";
import { AuthMode, ChunkKind } from "../plugins/ai-overviews/providers/types.js";

const sse = (text) =>
  new Response(text, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });

const ndjson = (values) =>
  new Response(`${values.map((value) => JSON.stringify(value)).join("\n")}\n`, {
    status: 200,
    headers: { "Content-Type": "application/x-ndjson" },
  });

const collect = async (iterator) => {
  const chunks = [];
  for await (const chunk of iterator) chunks.push(chunk);
  return chunks;
};

const config = (extra = {}) => ({
  baseUrl: "https://provider.example/v1",
  model: "model-id",
  apiKey: "api-key",
  authMode: AuthMode.Bearer,
  extraHeaders: {},
  ...extra,
});

const messages = [
  { role: "system", content: "System" },
  { role: "user", content: "Question" },
];

const options = (fetch) => ({
  maxTokens: 512,
  enableThinking: false,
  signal: new AbortController().signal,
  fetch,
});

test("OpenAI Chat streams text and builds the compatible request", async () => {
  let request;
  const fetch = async (url, init) => {
    request = { url, init };
    return sse(
      'data: {"choices":[{"delta":{"content":"Answer "},"finish_reason":null}]}\n\n' +
        'data: {"choices":[{"delta":{"content":"[1]"},"finish_reason":"stop"}]}\n\n' +
        "data: [DONE]\n\n",
    );
  };
  const chunks = await collect(streamOpenAIChat(config(), messages, options(fetch)));
  assert.equal(request.url, "https://provider.example/v1/chat/completions");
  assert.equal(request.init.headers.Authorization, "Bearer api-key");
  assert.deepEqual(JSON.parse(request.init.body), {
    model: "model-id",
    messages,
    stream: true,
    max_tokens: 512,
  });
  assert.deepEqual(chunks, [
    { kind: ChunkKind.Text, text: "Answer " },
    { kind: ChunkKind.Text, text: "[1]" },
    { kind: ChunkKind.Done, finishReason: "stop" },
  ]);
});

test("OpenAI Responses reads typed streaming events", async () => {
  let body;
  const fetch = async (_url, init) => {
    body = JSON.parse(init.body);
    return sse(
      'event: response.output_text.delta\ndata: {"type":"response.output_text.delta","delta":"Hello"}\n\n' +
        'event: response.completed\ndata: {"type":"response.completed","response":{"status":"completed"}}\n\n',
    );
  };
  const chunks = await collect(streamOpenAIResponses(config(), messages, options(fetch)));
  assert.equal(body.instructions, "System");
  assert.deepEqual(body.input, [{ role: "user", content: "Question" }]);
  assert.deepEqual(chunks, [
    { kind: ChunkKind.Text, text: "Hello" },
    { kind: ChunkKind.Done, finishReason: "completed" },
  ]);
});

test("Anthropic Messages maps system and text deltas", async () => {
  let request;
  const fetch = async (url, init) => {
    request = { url, init };
    return sse(
      'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Claude"}}\n\n' +
        'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn"}}\n\n',
    );
  };
  const chunks = await collect(
    streamAnthropic(
      config({ authMode: AuthMode.Anthropic }),
      messages,
      options(fetch),
    ),
  );
  assert.equal(request.url, "https://provider.example/v1/messages");
  assert.equal(request.init.headers["x-api-key"], "api-key");
  assert.equal(request.init.headers["anthropic-version"], "2023-06-01");
  assert.equal(JSON.parse(request.init.body).system, "System");
  assert.deepEqual(chunks.at(-1), {
    kind: ChunkKind.Done,
    finishReason: "end_turn",
  });
});

test("Gemini streams answer parts and uses API-key header", async () => {
  let request;
  const fetch = async (url, init) => {
    request = { url, init };
    return sse(
      'data: {"candidates":[{"content":{"parts":[{"text":"Gemini"}]},"finishReason":"STOP"}]}\n\n',
    );
  };
  const chunks = await collect(
    streamGemini(
      config({ authMode: AuthMode.Gemini, model: "gemini-flash" }),
      messages,
      options(fetch),
    ),
  );
  assert.equal(
    request.url,
    "https://provider.example/v1/models/gemini-flash:streamGenerateContent?alt=sse",
  );
  assert.equal(request.init.headers["x-goog-api-key"], "api-key");
  assert.equal(JSON.parse(request.init.body).systemInstruction.parts[0].text, "System");
  assert.deepEqual(chunks.at(0), { kind: ChunkKind.Text, text: "Gemini" });
});

test("Ollama streams native NDJSON including optional thinking", async () => {
  let request;
  const fetch = async (url, init) => {
    request = { url, init };
    return ndjson([
      { message: { thinking: "Reason" }, done: false },
      { message: { content: "Ollama" }, done: false },
      { message: { content: " answer" }, done: true, done_reason: "stop" },
    ]);
  };
  const chunks = await collect(
    streamOllama(
      config({
        baseUrl: "http://localhost:11434",
        authMode: AuthMode.None,
        apiKey: "",
      }),
      messages,
      { ...options(fetch), enableThinking: true },
    ),
  );
  assert.equal(request.url, "http://localhost:11434/api/chat");
  assert.equal(JSON.parse(request.init.body).think, true);
  assert.deepEqual(chunks, [
    { kind: ChunkKind.Thinking, text: "Reason" },
    { kind: ChunkKind.Text, text: "Ollama" },
    { kind: ChunkKind.Text, text: " answer" },
    { kind: ChunkKind.Done, finishReason: "stop" },
  ]);
});

test("provider HTTP errors are mapped without exposing response bodies", async () => {
  const chunks = await collect(
    streamOpenAIChat(
      config(),
      messages,
      options(async () =>
        new Response('{"error":{"message":"secret upstream internals"}}', {
          status: 429,
        }),
      ),
    ),
  );
  assert.deepEqual(chunks, [
    { kind: ChunkKind.Error, message: "Provider rate limit reached." },
  ]);
});

test("provider stream errors are categorized without exposing upstream details", async () => {
  const chunks = await collect(
    streamOpenAIChat(
      config(),
      messages,
      options(async () =>
        sse(
          'data: {"error":{"message":"API key rejected for tenant internal-123"}}\n\n',
        ),
      ),
    ),
  );
  assert.deepEqual(chunks, [
    { kind: ChunkKind.Error, message: "Provider authentication failed." },
  ]);
});
