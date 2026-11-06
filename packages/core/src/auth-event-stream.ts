import { authenticatedFetch } from "./api-client";
// Native EventSource cannot send an Authorization header. Use the fetch stream
// instead; never put bearer tokens in URLs or authenticate this API by cookie.
export class AuthEventStream {
  onopen?: () => void;
  onerror?: () => void;
  private abort = new AbortController();
  private listeners = new Map<string, ((event: MessageEvent) => void)[]>();
  private timer?: ReturnType<typeof setTimeout>;
  constructor(private path: string) {
    void this.connect();
  }
  addEventListener(type: string, fn: (event: MessageEvent) => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn]);
  }
  close() {
    this.abort.abort();
    clearTimeout(this.timer);
  }
  private async connect() {
    try {
      const response = await authenticatedFetch(this.path, {
        signal: this.abort.signal,
      });
      if (!response.ok || !response.body) throw new Error("Stream unavailable");
      this.onopen?.();
      const reader = response.body.getReader(),
        decoder = new TextDecoder();
      let buffer = "";
      try {
        while (!this.abort.signal.aborted) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder
            .decode(value, { stream: true })
            .replace(/\r\n/g, "\n");
          if (buffer.length > 65536) throw new Error("Stream frame too large");
          let boundary;
          while ((boundary = buffer.indexOf("\n\n")) >= 0) {
            const frame = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            const type = /^event: *(.*)$/m.exec(frame)?.[1] ?? "message";
            const data = frame
              .split("\n")
              .filter((l) => l.startsWith("data:"))
              .map((l) => l.slice(5).trimStart())
              .join("\n");
            for (const fn of this.listeners.get(type) ?? [])
              fn({ data } as MessageEvent);
          }
        }
      } finally {
        await reader.cancel().catch(() => {});
        reader.releaseLock();
      }
    } catch {
      if (!this.abort.signal.aborted) this.onerror?.();
    }
    if (!this.abort.signal.aborted)
      this.timer = setTimeout(() => void this.connect(), 3000);
  }
}
