import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { routes, slot } from "../plugins/ai-overviews/index.js";

const route = (path) => routes.find((candidate) => candidate.path === path);
const readPluginFile = (name) =>
  readFile(new URL(`../plugins/ai-overviews/${name}`, import.meta.url), "utf8");

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
    apiBase: "/api/plugin/store-installed-ai-overviews",
    readFile: readPluginFile,
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
  assert.match(
    executed.html,
    /href="\/api\/plugin\/store-installed-ai-overviews\/mode\?q=what%20is%20degoog%3F"/,
  );

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

  const modePage = await route("/mode").handler(
    new Request("http://degoog.test/api/plugin/store-installed-ai-overviews/mode", {
      headers: { "Accept-Language": "fr-FR,fr;q=0.9" },
    }),
  );
  assert.equal(modePage.status, 200);
  assert.match(modePage.headers.get("content-type"), /text\/html/);
  assert.match(modePage.headers.get("content-security-policy"), /default-src 'self'/);
  const modeHtml = await modePage.text();
  assert.match(modeHtml, /<title>Mode IA · degoog<\/title>/);
  assert.match(modeHtml, /\/api\/plugin\/store-installed-ai-overviews\/mode\.css/);

  const modeScript = await route("/mode.js").handler();
  assert.equal(modeScript.status, 200);
  assert.match(modeScript.headers.get("content-type"), /text\/javascript/);
  const modeScriptText = await modeScript.text();
  assert.match(modeScriptText, /"apiBase":"\/api\/plugin\/store-installed-ai-overviews"/);
  assert.match(modeScriptText, /"maxSources":8/);

  const modeStyles = await route("/mode.css").handler();
  assert.equal(modeStyles.status, 200);
  assert.match(modeStyles.headers.get("content-type"), /text\/css/);
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
