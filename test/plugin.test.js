import assert from "node:assert/strict";
import test from "node:test";

import { routes, slot } from "../plugins/ai-overviews/index.js";

const route = (path) => routes.find((candidate) => candidate.path === path);

test("slot follows the degoog at-a-glance contract", () => {
  assert.equal(slot.position, "at-a-glance");
  assert.equal(slot.waitForResults, true);
  assert.equal(slot.isClientExposed, false);
  assert.equal(slot.trigger("query"), false);
});

test("configured local Ollama renders a panel and streams through the server", async () => {
  const cache = new Map();
  const fakeCache = {
    async get(key) {
      return cache.get(key);
    },
    async set(key, value) {
      cache.set(key, value);
    },
  };
  let providerRequest;
  await slot.init({
    useCache: () => fakeCache,
    fetch: async (url, init) => {
      providerRequest = { url, init };
      return new Response(
        `${JSON.stringify({ message: { content: "Local answer [1]" }, done: false })}\n` +
          `${JSON.stringify({ message: {}, done: true, done_reason: "stop" })}\n`,
        { status: 200 },
      );
    },
  });
  slot.configure({
    provider: "ollama-local",
    model: "qwen3:8b",
    maxSources: "8",
    cacheMinutes: "10",
  });
  assert.equal(slot.trigger("what is degoog?"), true);

  const results = [
    {
      title: "degoog documentation",
      url: "https://degoog-org.github.io/docs/",
      snippet: "Documentation for degoog.",
    },
  ];
  const executed = await slot.execute("what is degoog?", { results });
  assert.match(executed.html, /class="dgo-overview/);
  assert.match(executed.html, /data-stream="1"/);

  const response = await route("/stream").handler(
    new Request("http://degoog.test/api/plugin/ai-overviews/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "what is degoog?", results }),
    }),
  );
  assert.equal(response.status, 200);
  const stream = await response.text();
  assert.match(stream, /event: delta/);
  assert.match(stream, /Local answer \[1\]/);
  assert.match(stream, /event: done/);
  assert.equal(providerRequest.url, "http://localhost:11434/api/chat");

  const cachedResponse = await route("/stream").handler(
    new Request("http://degoog.test/api/plugin/ai-overviews/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "what is degoog?", results }),
    }),
  );
  assert.match(await cachedResponse.text(), /"finishReason":"cache"/);
});

test("routes reject malformed or oversized requests", async () => {
  const invalid = await route("/stream").handler(
    new Request("http://degoog.test/api/plugin/ai-overviews/stream", {
      method: "POST",
      body: "{",
    }),
  );
  assert.equal(invalid.status, 400);

  const oversized = await route("/chat").handler(
    new Request("http://degoog.test/api/plugin/ai-overviews/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": "200000",
      },
      body: JSON.stringify({ messages: [{ role: "user", content: "hello" }] }),
    }),
  );
  assert.equal(oversized.status, 413);
});

