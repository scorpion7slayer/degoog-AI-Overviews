import assert from "node:assert/strict";
import test from "node:test";

import {
  configurationError,
  listProviderIds,
  ProviderId,
  resolveProviderConfig,
} from "../plugins/ai-overviews/providers/presets.js";
import { ProtocolId } from "../plugins/ai-overviews/providers/types.js";

const configured = (provider, model, extra = {}) => ({
  provider,
  providerProtocol: "auto",
  model,
  apiKey: "secret",
  baseUrl: "",
  cloudflareAccountId: "",
  cloudflareGatewayId: "",
  ...extra,
});

test("all requested provider presets are available", () => {
  assert.deepEqual(listProviderIds(), [
    "ollama-local",
    "ollama-cloud",
    "opencode-zen",
    "opencode-go",
    "openai",
    "openai-compatible",
    "gemini",
    "kilo",
    "moonshot",
    "anthropic",
    "openrouter",
    "qwen",
    "zai",
    "perplexity",
    "cloudflare-workers-ai",
    "xai",
    "cursor-gateway",
  ]);
});

test("OpenCode Zen selects the documented protocol per model family", () => {
  assert.equal(
    resolveProviderConfig(configured(ProviderId.OpenCodeZen, "gpt-5.6-terra")).protocol,
    ProtocolId.OpenAIResponses,
  );
  assert.equal(
    resolveProviderConfig(configured(ProviderId.OpenCodeZen, "claude-sonnet-5")).protocol,
    ProtocolId.Anthropic,
  );
  assert.equal(
    resolveProviderConfig(configured(ProviderId.OpenCodeZen, "qwen3.7-plus")).protocol,
    ProtocolId.Anthropic,
  );
  assert.equal(
    resolveProviderConfig(configured(ProviderId.OpenCodeZen, "gemini-3.5-flash")).protocol,
    ProtocolId.Gemini,
  );
  assert.equal(
    resolveProviderConfig(configured(ProviderId.OpenCodeZen, "big-pickle")).protocol,
    ProtocolId.OpenAIChat,
  );
});

test("OpenCode Go selects Messages only for Qwen and MiniMax", () => {
  assert.equal(
    resolveProviderConfig(configured(ProviderId.OpenCodeGo, "qwen3.7-plus")).protocol,
    ProtocolId.Anthropic,
  );
  assert.equal(
    resolveProviderConfig(configured(ProviderId.OpenCodeGo, "minimax-m3")).protocol,
    ProtocolId.Anthropic,
  );
  assert.equal(
    resolveProviderConfig(configured(ProviderId.OpenCodeGo, "kimi-k3")).protocol,
    ProtocolId.OpenAIChat,
  );
});

test("Cloudflare account and gateway IDs build the Workers AI configuration", () => {
  const config = resolveProviderConfig(
    configured(ProviderId.CloudflareWorkersAI, "@cf/meta/llama-3.1-8b-instruct", {
      cloudflareAccountId: "account/id",
      cloudflareGatewayId: "production",
    }),
  );
  assert.equal(
    config.baseUrl,
    "https://api.cloudflare.com/client/v4/accounts/account%2Fid/ai/v1",
  );
  assert.deepEqual(config.extraHeaders, { "cf-aig-gateway-id": "production" });
  assert.equal(configurationError({
    ...configured(ProviderId.CloudflareWorkersAI, config.model),
    cloudflareAccountId: "account/id",
  }), null);
});

test("Cursor is only accepted with a user-supplied compatible gateway", () => {
  const missing = configured(ProviderId.CursorGateway, "cursor-model");
  assert.match(configurationError(missing), /no public chat inference endpoint/i);
  assert.equal(
    configurationError({ ...missing, baseUrl: "https://gateway.example/v1" }),
    null,
  );
});

test("local Ollama needs no API key", () => {
  const settings = configured(ProviderId.OllamaLocal, "qwen3:8b", { apiKey: "" });
  assert.equal(configurationError(settings), null);
  assert.equal(resolveProviderConfig(settings).baseUrl, "http://localhost:11434");
});

