const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace(/\/$/, "");
const DEMO_USER_ID = import.meta.env.VITE_DEMO_USER_ID || "demo-user-001";

function parseEventData(raw) {
  const value = raw.trim();
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/**
 * Reads an SSE response from a POST request.
 * Supports CRLF/LF boundaries and events split across network chunks.
 */
export async function streamChat({ message, conversationId, signal, onEvent }) {
  const response = await fetch(`${API_BASE_URL}/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      "x-user-id": DEMO_USER_ID
    },
    body: JSON.stringify({ message, conversationId: conversationId || null }),
    signal
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    let messageText = `Backend request failed (${response.status})`;
    try {
      const parsed = JSON.parse(body);
      messageText = parsed.error || parsed.message || messageText;
    } catch {
      if (body) messageText = body.slice(0, 500);
    }
    throw new Error(messageText);
  }

  if (!response.body) {
    throw new Error("Streaming response body is unavailable in this browser.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let currentEvent = "message";
  let dataLines = [];

  const dispatch = () => {
    if (!dataLines.length) {
      currentEvent = "message";
      return;
    }
    const data = parseEventData(dataLines.join("\n"));
    onEvent?.({ type: currentEvent, data });
    currentEvent = "message";
    dataLines = [];
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      buffer = buffer.replace(/\r\n/g, "\n");

      let boundary;
      while ((boundary = buffer.indexOf("\n\n")) !== -1) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);

        for (const line of block.split("\n")) {
          if (!line || line.startsWith(":")) continue;
          if (line.startsWith("event:")) {
            currentEvent = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            dataLines.push(line.slice(5).replace(/^ /, ""));
          }
        }
        dispatch();
      }
    }

    buffer += decoder.decode();
    if (buffer.trim()) {
      for (const line of buffer.split(/\r?\n/)) {
        if (line.startsWith("event:")) currentEvent = line.slice(6).trim();
        else if (line.startsWith("data:")) dataLines.push(line.slice(5).replace(/^ /, ""));
      }
      dispatch();
    }
  } finally {
    reader.releaseLock();
  }
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}
