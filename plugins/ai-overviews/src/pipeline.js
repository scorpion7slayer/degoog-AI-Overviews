import { ChunkKind, pickAdapter } from "../providers/index.js";

const THINK_ONLY_TIMEOUT_MS = 45_000;
const encoder = new TextEncoder();

export const writeSse = (controller, event, data) => {
  const payload = typeof data === "string" ? data : JSON.stringify(data ?? {});
  controller.enqueue(encoder.encode(`event: ${event}\ndata: ${payload}\n\n`));
};

export const sseResponse = (stream) =>
  new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });

const pump = async (iterator, controller) => {
  let text = "";
  let finishReason;
  for await (const chunk of iterator) {
    if (chunk.kind === ChunkKind.Text) {
      text += chunk.text;
      writeSse(controller, "delta", { text: chunk.text });
    } else if (chunk.kind === ChunkKind.Thinking) {
      writeSse(controller, "thinking", { text: chunk.text });
    } else if (chunk.kind === ChunkKind.Error) {
      writeSse(controller, "error", { message: chunk.message });
      return { text, finishReason, errored: true };
    } else if (chunk.kind === ChunkKind.Done) {
      finishReason = chunk.finishReason;
    }
  }
  return { text, finishReason, errored: false };
};

export const runStream = ({
  messages,
  cacheKey,
  settings,
  providerConfig,
  cache,
  fetchFn,
}) => {
  const adapter = pickAdapter(providerConfig.protocol);
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort("timeout"), settings.timeoutMs);

  const body = new ReadableStream({
    async start(controller) {
      let thinkingWatchdog;
      try {
        if (cacheKey && cache && settings.cacheMinutes > 0) {
          const cached = await cache.get(cacheKey);
          if (cached) {
            writeSse(controller, "delta", { text: cached });
            writeSse(controller, "done", { finishReason: "cache" });
            return;
          }
        }

        if (!settings.enableThinking) {
          thinkingWatchdog = setTimeout(
            () => abortController.abort("thinking-timeout"),
            Math.min(THINK_ONLY_TIMEOUT_MS, settings.timeoutMs),
          );
        }

        const iterator = adapter.stream(providerConfig, messages, {
          maxTokens: settings.maxTokens,
          enableThinking: settings.enableThinking,
          signal: abortController.signal,
          fetch: fetchFn,
        });
        const watchedIterator = (async function* () {
          for await (const chunk of iterator) {
            if (chunk.kind === ChunkKind.Text && thinkingWatchdog) {
              clearTimeout(thinkingWatchdog);
              thinkingWatchdog = undefined;
            }
            yield chunk;
          }
        })();

        const output = await pump(watchedIterator, controller);
        if (output.errored) return;
        if (!output.text.trim()) {
          writeSse(controller, "error", { message: "The model returned no answer." });
          return;
        }
        if (cacheKey && cache && settings.cacheMinutes > 0) {
          try {
            await cache.set(cacheKey, output.text, settings.cacheMinutes * 60_000);
          } catch {}
        }
        writeSse(controller, "done", {
          finishReason: output.finishReason ?? "stop",
        });
      } catch (error) {
        const timedOut = abortController.signal.aborted;
        writeSse(controller, "error", {
          message: timedOut ? "The provider request timed out." : "The provider stream failed.",
        });
      } finally {
        if (thinkingWatchdog) clearTimeout(thinkingWatchdog);
        clearTimeout(timeout);
        try {
          controller.close();
        } catch {}
      }
    },
    cancel() {
      clearTimeout(timeout);
      abortController.abort("client-disconnected");
    },
  });

  return sseResponse(body);
};
