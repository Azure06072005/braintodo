import "@testing-library/jest-dom/vitest";

/**
 * jsdom doesn't provide localStorage in a way that persists across a
 * single test file reliably with hook re-renders, and doesn't implement
 * WebSocket at all — both useAuth and useGraphData depend on these.
 * Minimal fakes here so tests exercise the real hook logic without
 * hitting the network or a real browser API.
 */

class MemoryStorage {
  constructor() {
    this._data = new Map();
  }
  getItem(key) {
    return this._data.has(key) ? this._data.get(key) : null;
  }
  setItem(key, value) {
    this._data.set(key, String(value));
  }
  removeItem(key) {
    this._data.delete(key);
  }
  clear() {
    this._data.clear();
  }
}

if (!globalThis.localStorage || typeof globalThis.localStorage.setItem !== "function") {
  globalThis.localStorage = new MemoryStorage();
}

if (typeof globalThis.crypto === "undefined" || typeof globalThis.crypto.randomUUID !== "function") {
  let counter = 0;
  globalThis.crypto = {
    ...(globalThis.crypto || {}),
    randomUUID: () => `test-uuid-${++counter}`,
  };
}

/**
 * Fake WebSocket — useGraphData's realtime effect (source === "live")
 * constructs one via `new WebSocket(url)`. Tests that only exercise mock
 * mode never touch this, but the class must exist or the module import
 * chain (createApiClient -> connectRealtime) throws in jsdom.
 */
class FakeWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = FakeWebSocket.CONNECTING;
    // Never actually "opens" unless a test manually flips it - keeps
    // realtime-mode tests explicit rather than accidentally racing.
  }
  close() {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.();
  }
  send() {}
}
FakeWebSocket.CONNECTING = 0;
FakeWebSocket.OPEN = 1;
FakeWebSocket.CLOSING = 2;
FakeWebSocket.CLOSED = 3;

if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = FakeWebSocket;
}
