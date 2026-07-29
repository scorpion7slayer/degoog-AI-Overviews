import { escapeHtml } from "./panel.js";

const COPY = {
  en: {
    title: "AI Mode",
    description:
      "A full-page, source-grounded AI search experience powered by degoog results.",
    backHome: "Back to degoog",
    askAnything: "Ask anything",
    search: "Search",
    classicSearch: "Classic search",
    emptyTitle: "What do you want to explore?",
    emptyDescription:
      "Ask a broad question. AI Mode searches with degoog, synthesizes the results, and keeps the web sources within reach.",
    explore: "Explore",
    examples: "Example questions",
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
  },
  fr: {
    title: "Mode IA",
    description:
      "Une expérience de recherche IA en page complète, sourcée par les résultats degoog.",
    backHome: "Retour à degoog",
    askAnything: "Posez votre question",
    search: "Rechercher",
    classicSearch: "Recherche classique",
    emptyTitle: "Que voulez-vous explorer ?",
    emptyDescription:
      "Posez une question large. Le Mode IA recherche avec degoog, synthétise les résultats et garde les sources Web à portée de main.",
    explore: "Explorer",
    examples: "Exemples de questions",
    exampleOne: "Comparer les LLM locaux et cloud pour une petite équipe",
    exampleTwo: "Expliquer la photosynthèse étape par étape",
    exampleThree: "Comment lire un fichier JSON en Python ?",
    answerLabel: "Réponse optimisée par l’IA",
    thinking: "Recherche et synthèse",
    errorTitle: "Le Mode IA a rencontré un problème",
    retry: "Réessayer",
    sources: "Sources",
    followUp: "Poser une question complémentaire",
    send: "Envoyer",
    disclaimer:
      "L’IA peut se tromper. Vérifiez les informations importantes dans les sources Web liées.",
  },
};

export const basePathFromApiBase = (apiBase) => {
  const value = String(apiBase || "");
  const marker = value.indexOf("/api/plugin/");
  return marker >= 0 ? value.slice(0, marker) : "";
};

const localeFor = (request) => {
  const url = new URL(request.url);
  const requested = url.searchParams.get("lang") || request.headers.get("accept-language") || "";
  return requested.toLowerCase().startsWith("fr") ? "fr" : "en";
};

export const renderModePage = (template, { apiBase, request }) => {
  const lang = localeFor(request);
  const values = {
    ...COPY[lang],
    lang,
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
