import { escapeHtml } from "./panel.js";

const COPY = {
  title: "AI Mode",
  description:
    "A full-page, source-grounded AI search experience powered by degoog results.",
  backHome: "Back to degoog",
  askAnything: "Ask anything",
  search: "Search",
  classicSearch: "Classic search",
  emptyTitle: "What do you want to explore?",
  emptyDescription:
    "Search the web and get a source-grounded answer you can verify.",
  explore: "Explore",
  examples: "Try asking",
  exampleOne: "Compare local and cloud LLMs for a small team",
  exampleTwo: "Explain photosynthesis step by step",
  exampleThree: "How do I read a JSON file in Python?",
  answerLabel: "AI-powered answer",
  thinking: "Searching and synthesizing",
  errorTitle: "AI Mode encountered a problem",
  retry: "Try again",
  sources: "Sources",
  followUp: "Ask a follow-up",
  send: "Send",
  disclaimer:
    "AI can make mistakes. Check important information in the linked web sources.",
};

export const basePathFromApiBase = (apiBase) => {
  const value = String(apiBase || "");
  const marker = value.indexOf("/api/plugin/");
  return marker >= 0 ? value.slice(0, marker) : "";
};

export const renderModePage = (template, { apiBase }) => {
  const values = {
    ...COPY,
    lang: "en",
    dir: "ltr",
    apiBase,
    basePath: basePathFromApiBase(apiBase),
  };
  return String(template || "").replace(/\{\{(\w+)\}\}/g, (match, key) =>
    key in values ? escapeHtml(values[key]) : match,
  );
};

export const buildModeClientScript = (source, config) => {
  const serialized = JSON.stringify(config).replace(/<\//g, "<\\/");
  return `globalThis.__DGO_AI_MODE_CONFIG__=${serialized};\n${source}`;
};

export const modePageResponse = (html) =>
  new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Security-Policy":
        "default-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self'; form-action 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });

export const modeAssetResponse = (content, contentType) =>
  new Response(content, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
