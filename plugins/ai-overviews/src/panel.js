import { createHash } from "node:crypto";

const MAX_QUERY_LENGTH = 512;
const MAX_TITLE_LENGTH = 400;
const MAX_SNIPPET_LENGTH = 2400;
const MAX_URL_LENGTH = 2048;
const MAX_MEDIA_URL_LENGTH = 4096;

const clampText = (value, max) => String(value ?? "").trim().slice(0, max);

const safeUrl = (value) => {
  const raw = clampText(value, MAX_URL_LENGTH);
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
};

const proxiedMediaUrl = (value) => {
  const raw = clampText(value, MAX_MEDIA_URL_LENGTH);
  if (!raw.startsWith("/") || raw.startsWith("//")) return "";
  try {
    const url = new URL(raw, "https://degoog.invalid");
    if (!url.pathname.endsWith("/api/proxy/image")) return "";
    if (!url.searchParams.has("url") || !url.searchParams.has("sig")) return "";
    return `${url.pathname}${url.search}`;
  } catch {
    return "";
  }
};

const safeMediaUrl = (value, signProxyUrl) => {
  const alreadyProxied = proxiedMediaUrl(value);
  if (alreadyProxied) return alreadyProxied;
  const remoteUrl = safeUrl(value);
  if (!remoteUrl || typeof signProxyUrl !== "function") return "";
  try {
    return proxiedMediaUrl(signProxyUrl(remoteUrl));
  } catch {
    return "";
  }
};

const hostname = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

export const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const normalizeQuery = (query) => clampText(query, MAX_QUERY_LENGTH);

export const buildSources = (results, maxSources, signProxyUrl) => {
  const sources = [];
  for (const result of Array.isArray(results) ? results : []) {
    if (sources.length >= maxSources) break;
    const url = safeUrl(result?.url);
    const mediaUrl = safeMediaUrl(result?.thumbnail || result?.imageUrl, signProxyUrl);
    const source = {
      index: sources.length + 1,
      title: clampText(result?.title, MAX_TITLE_LENGTH),
      url,
      snippet: clampText(result?.snippet, MAX_SNIPPET_LENGTH),
      host: hostname(url),
      mediaUrl,
    };
    if (source.title || source.snippet) sources.push(source);
  }
  return sources;
};

export const summaryCacheKey = (query, sources, providerSignature) => {
  const fingerprint = JSON.stringify({
    query: normalizeQuery(query).toLowerCase(),
    providerSignature,
    sources: sources.map((source) => [source.url, source.title, source.snippet]),
  });
  return createHash("sha256").update(fingerprint).digest("hex");
};

const translated = (t, key, fallback) => {
  if (typeof t !== "function") return fallback;
  const value = t(key);
  return value && value !== key ? value : fallback;
};

const sourceAvatarHtml = (source, extraClass = "") => {
  const label = (source.host || source.title || "?").trim().charAt(0).toUpperCase() || "?";
  return (
    `<span class="dgo-overview-source-avatar${extraClass ? ` ${extraClass}` : ""}">` +
    `<span aria-hidden="true">${escapeHtml(label)}</span>` +
    (source.mediaUrl
      ? `<img src="${escapeHtml(source.mediaUrl)}" alt="" loading="lazy" data-source-avatar>`
      : "") +
    "</span>"
  );
};

const imageRailHtml = (sources, t) => {
  const mediaSources = sources
    .filter((source) => source.mediaUrl && source.url)
    .slice(0, 4);
  if (!mediaSources.length) return "";
  const label = translated(t, "ai-overviews.images", "Images from the results");
  const viewSource = translated(t, "ai-overviews.view-image-source", "Open image source");
  return (
    `<div class="dgo-overview-media" aria-label="${escapeHtml(label)}">` +
    '<ul class="dgo-overview-image-rail">' +
    mediaSources
      .map((source) => {
        const title = source.title || source.host || `Source ${source.index}`;
        return (
          '<li>' +
          `<a class="dgo-overview-image-card" href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(`${viewSource}: ${title}`)}">` +
          `<img src="${escapeHtml(source.mediaUrl)}" alt="${escapeHtml(title)}" loading="lazy" data-overview-image>` +
          (source.host
            ? `<span class="dgo-overview-image-host">${escapeHtml(source.host)}</span>`
            : "") +
          "</a>" +
          "</li>"
        );
      })
      .join("") +
    "</ul>" +
    "</div>"
  );
};

const sourceDrawerHtml = (sources, t) => {
  if (!sources.length) return "";
  const sourcesWord = translated(
    t,
    sources.length === 1 ? "ai-overviews.source" : "ai-overviews.sources",
    sources.length === 1 ? "source" : "sources",
  );
  const label = `${sources.length} ${sourcesWord}`;
  const close = translated(t, "ai-overviews.close-sources", "Close sources");
  const allSources = translated(t, "ai-overviews.all-sources", "Sources");
  const avatars = sources
    .slice(0, 3)
    .map((source) => sourceAvatarHtml(source, "dgo-overview-source-avatar--stacked"))
    .join("");
  const items = sources
    .map((source) => {
      const title = source.title || source.host || `Source ${source.index}`;
      const content =
        sourceAvatarHtml(source) +
        '<span class="dgo-overview-source-copy">' +
        (source.host
          ? `<span class="dgo-overview-source-host">${escapeHtml(source.host)}</span>`
          : "") +
        `<span class="dgo-overview-source-title">${escapeHtml(title)}</span>` +
        (source.snippet
          ? `<span class="dgo-overview-source-snippet">${escapeHtml(source.snippet)}</span>`
          : "") +
        "</span>" +
        `<span class="dgo-overview-source-number">${source.index}</span>`;
      if (!source.url) {
        return `<li><span class="dgo-overview-source">${content}</span></li>`;
      }
      return (
        "<li>" +
        `<a class="dgo-overview-source" href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">` +
        content +
        "</a></li>"
      );
    })
    .join("");
  return (
    '<div class="dgo-overview-sources">' +
    '<button class="dgo-overview-sources-trigger" type="button" aria-haspopup="dialog" aria-controls="dgo-overview-sources-dialog" aria-expanded="false">' +
    `<span class="dgo-overview-source-stack" aria-hidden="true">${avatars}</span>` +
    `<span>${escapeHtml(label)}</span>` +
    '<span class="dgo-overview-sources-chevron" aria-hidden="true">›</span>' +
    "</button>" +
    '<dialog class="dgo-overview-sources-dialog" id="dgo-overview-sources-dialog" aria-labelledby="dgo-overview-sources-title">' +
    '<div class="dgo-overview-sources-dialog-header">' +
    `<h3 id="dgo-overview-sources-title">${escapeHtml(allSources)} <span>${escapeHtml(String(sources.length))}</span></h3>` +
    `<button class="dgo-overview-sources-close" type="button" aria-label="${escapeHtml(close)}">×</button>` +
    "</div>" +
    `<ol class="dgo-overview-source-list">${items}</ol>` +
    "</dialog>" +
    "</div>"
  );
};

export const buildPanelHtml = ({
  t,
  query,
  sources,
  providerLabel,
  hideOnError,
  showSources,
}) => {
  const sourceData = sources.map((source) => ({
    i: source.index,
    u: source.url,
    t: source.title,
    h: source.host,
    s: source.snippet,
    m: source.mediaUrl,
  }));
  const title = translated(t, "ai-overviews.name", "AI Overview");
  const generatedBy = translated(t, "ai-overviews.generated-by", "Generated with");
  const copy = translated(t, "ai-overviews.copy", "Copy");
  const expand = translated(t, "ai-overviews.show-more", "Show more");
  const retry = translated(t, "ai-overviews.retry", "Retry");
  const followUp = translated(t, "ai-overviews.follow-up-placeholder", "Ask a follow-up");
  const send = translated(t, "ai-overviews.send", "Send");
  const disclaimer = translated(
    t,
    "ai-overviews.disclaimer",
    "AI can make mistakes. Check the cited search results.",
  );

  return (
    '<section class="dgo-overview degoog-panel degoog-panel--slot degoog-panel--slot-body-padded"' +
    ` data-query="${escapeHtml(normalizeQuery(query))}"` +
    ` data-sources="${escapeHtml(JSON.stringify(sourceData))}"` +
    ` data-hide-on-error="${hideOnError ? "1" : "0"}"` +
    ' data-stream="1" aria-labelledby="dgo-overview-title">' +
    '<header class="dgo-overview-header">' +
    '<div class="dgo-overview-heading">' +
    `<h2 id="dgo-overview-title">${escapeHtml(title)}</h2>` +
    `<span class="dgo-overview-provider">${escapeHtml(generatedBy)} ${escapeHtml(providerLabel)}</span>` +
    "</div>" +
    '<div class="dgo-overview-actions">' +
    `<button class="dgo-overview-copy degoog-icon-btn" type="button" hidden>${escapeHtml(copy)}</button>` +
    "</div>" +
    "</header>" +
    imageRailHtml(sources, t) +
    '<div class="dgo-overview-thinking" hidden>' +
    `<span>${escapeHtml(translated(t, "ai-overviews.thinking", "Thinking…"))}</span>` +
    '<div class="dgo-overview-thinking-text"></div>' +
    "</div>" +
    '<div class="dgo-overview-answer dgo-overview-answer--clamped degoog-text degoog-text--md"' +
    ' data-state="pending" aria-live="polite" aria-busy="true">' +
    '<div class="dgo-overview-skeleton" aria-hidden="true">' +
    "<span></span><span></span><span></span>" +
    "</div>" +
    "</div>" +
    `<button class="dgo-overview-expand" type="button" hidden>${escapeHtml(expand)}</button>` +
    '<div class="dgo-overview-error" role="alert" hidden>' +
    '<span class="dgo-overview-error-message"></span>' +
    `<button class="dgo-overview-retry" type="button">${escapeHtml(retry)}</button>` +
    "</div>" +
    (showSources ? sourceDrawerHtml(sources, t) : "") +
    '<div class="dgo-overview-conversation" hidden>' +
    '<div class="dgo-overview-messages" aria-live="polite"></div>' +
    '<form class="dgo-overview-follow-up">' +
    `<textarea class="dgo-overview-input degoog-input degoog-input--chat" rows="1" maxlength="4000" placeholder="${escapeHtml(followUp)}" aria-label="${escapeHtml(followUp)}"></textarea>` +
    `<button class="dgo-overview-send" type="submit">${escapeHtml(send)}</button>` +
    "</form>" +
    "</div>" +
    `<p class="dgo-overview-disclaimer">${escapeHtml(disclaimer)}</p>` +
    "</section>"
  );
};
