export const endpointFor = (baseUrl, suffix) => {
  const base = String(baseUrl ?? "").trim().replace(/\/+$/, "");
  const path = `/${String(suffix ?? "").replace(/^\/+/, "")}`;
  return base.endsWith(path) ? base : `${base}${path}`;
};

export const authHeaders = (config) => {
  const headers = {
    "Content-Type": "application/json",
    ...config.extraHeaders,
  };
  if (!config.apiKey) return headers;
  if (config.authMode === "anthropic") {
    headers["x-api-key"] = config.apiKey;
  } else if (config.authMode === "gemini") {
    headers["x-goog-api-key"] = config.apiKey;
  } else if (config.authMode !== "none") {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }
  return headers;
};

export const providerErrorMessage = (response) => {
  if (response.status === 401 || response.status === 403) {
    return "Provider authentication failed.";
  }
  if (response.status === 402) return "Provider credits are exhausted.";
  if (response.status === 408 || response.status === 504) return "Provider request timed out.";
  if (response.status === 429) return "Provider rate limit reached.";
  if (response.status >= 500) return "Provider is temporarily unavailable.";
  return `Provider returned HTTP ${response.status}.`;
};

export const streamProviderErrorMessage = (error) => {
  const raw =
    typeof error === "string"
      ? error
      : String(error?.message ?? error?.type ?? error?.code ?? "");
  const normalized = raw.toLowerCase();
  if (/auth|api.?key|unauthor|forbidden|permission/.test(normalized)) {
    return "Provider authentication failed.";
  }
  if (/rate.?limit|too many requests/.test(normalized)) {
    return "Provider rate limit reached.";
  }
  if (/credit|quota|billing|payment/.test(normalized)) {
    return "Provider credits are exhausted.";
  }
  if (/timeout|timed out|deadline/.test(normalized)) {
    return "Provider request timed out.";
  }
  if (/overload|unavailable|capacity/.test(normalized)) {
    return "Provider is temporarily unavailable.";
  }
  return "Provider stream failed.";
};
