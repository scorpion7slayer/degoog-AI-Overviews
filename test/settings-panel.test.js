import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPanelHtml,
  buildSources,
  escapeHtml,
  normalizeQuery,
  summaryCacheKey,
} from "../plugins/ai-overviews/src/panel.js";
import {
  DEFAULT_MAX_SOURCES,
  DEFAULT_MAX_TOKENS,
  DEFAULT_TIMEOUT_S,
  parseSettings,
} from "../plugins/ai-overviews/src/settings.js";

test("settings defaults and clamps untrusted values", () => {
  const defaults = parseSettings();
  assert.equal(defaults.provider, "ollama-local");
  assert.equal(defaults.timeoutMs, DEFAULT_TIMEOUT_S * 1000);
  assert.equal(defaults.maxTokens, DEFAULT_MAX_TOKENS);
  assert.equal(defaults.maxSources, DEFAULT_MAX_SOURCES);
  assert.equal(defaults.showSources, true);

  const parsed = parseSettings({
    provider: "not-real",
    timeoutSeconds: "1",
    maxTokens: "999999",
    maxSources: "99",
    cacheMinutes: "-3",
    questionMarkOnly: "true",
    showSources: "false",
  });
  assert.equal(parsed.provider, "ollama-local");
  assert.equal(parsed.timeoutMs, 5000);
  assert.equal(parsed.maxTokens, 131072);
  assert.equal(parsed.maxSources, 12);
  assert.equal(parsed.cacheMinutes, 0);
  assert.equal(parsed.questionMarkOnly, true);
  assert.equal(parsed.showSources, false);
});

test("sources are sanitized, compacted, and numbered after empty results", () => {
  const sources = buildSources(
    [
      { title: "", snippet: "", url: "https://empty.example" },
      {
        title: "Safe result",
        snippet: "A snippet",
        url: "https://www.example.com/article",
      },
      {
        title: "Unsafe link",
        snippet: "Still usable as source text",
        url: "javascript:alert(1)",
      },
      { title: "Third", snippet: "ignored by max", url: "https://third.example" },
    ],
    2,
  );
  assert.equal(sources.length, 2);
  assert.deepEqual(
    sources.map(({ index, host, url }) => ({ index, host, url })),
    [
      { index: 1, host: "example.com", url: "https://www.example.com/article" },
      { index: 2, host: "", url: "" },
    ],
  );
});

test("panel HTML escapes data and never renders unsafe URLs as links", () => {
  const sources = buildSources(
    [{ title: "<img src=x onerror=1>", snippet: "snippet", url: "javascript:alert(1)" }],
    8,
  );
  const html = buildPanelHtml({
    query: '" onmouseover="alert(1)',
    sources,
    providerLabel: "<OpenAI>",
    hideOnError: false,
    showSources: true,
  });
  assert.doesNotMatch(html, /<img src=x/);
  assert.doesNotMatch(html, /href="javascript:/);
  assert.match(html, /&lt;OpenAI&gt;/);
  assert.match(html, /&quot; onmouseover=&quot;alert\(1\)/);
  assert.equal(escapeHtml("<>&\"'"), "&lt;&gt;&amp;&quot;&#39;");
});

test("query normalization and cache keys are deterministic", () => {
  const query = `  ${"A".repeat(600)}  `;
  assert.equal(normalizeQuery(query).length, 512);
  const sources = buildSources([{ title: "One", snippet: "Text", url: "https://one.test" }], 8);
  const first = summaryCacheKey(" Query ", sources, "provider");
  const second = summaryCacheKey("query", sources, "provider");
  assert.equal(first, second);
  assert.notEqual(first, summaryCacheKey("query", sources, "other"));
});

