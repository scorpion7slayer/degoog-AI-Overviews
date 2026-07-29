export const readSse = async function* (body) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let event;
  let data = "";

  const flush = () => {
    if (!data) {
      event = undefined;
      return null;
    }
    const value = { event, data: data.replace(/\n$/, "") };
    event = undefined;
    data = "";
    return value;
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newline;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newline).replace(/\r$/, "");
        buffer = buffer.slice(newline + 1);
        if (!line) {
          const valueToYield = flush();
          if (valueToYield) yield valueToYield;
          continue;
        }
        if (line.startsWith(":")) continue;
        if (line.startsWith("event:")) event = line.slice(6).trim();
        if (line.startsWith("data:")) data += `${line.slice(5).replace(/^ /, "")}\n`;
      }
    }
    buffer += decoder.decode();
    if (buffer.startsWith("data:")) data += buffer.slice(5).replace(/^ /, "");
    const finalValue = flush();
    if (finalValue) yield finalValue;
  } finally {
    try {
      reader.releaseLock();
    } catch {}
  }
};

export const readNdjson = async function* (body) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newline;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (!line) continue;
        try {
          yield JSON.parse(line);
        } catch {}
      }
    }
    buffer += decoder.decode();
    if (buffer.trim()) {
      try {
        yield JSON.parse(buffer.trim());
      } catch {}
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {}
  }
};
