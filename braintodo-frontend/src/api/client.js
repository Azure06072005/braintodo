/**
 * Client mỏng gọi API braintodo thật. Endpoint khớp đúng với
 * Azure06072005/braintodo (đã xác nhận từ source code thật).
 */

export function createApiClient(baseUrl) {
  async function getJson(path) {
    const resp = await fetch(`${baseUrl}${path}`);
    if (!resp.ok) {
      throw new Error(`${path} -> HTTP ${resp.status}`);
    }
    return resp.json();
  }

  return {
    async listNodes({ skip = 0, limit = 200 } = {}) {
      const page = await getJson(`/nodes?skip=${skip}&limit=${limit}`);
      return page.items; // backend trả Page[Node]: {items, total, skip, limit}
    },

    async listEdges({ skip = 0, limit = 500 } = {}) {
      const page = await getJson(`/edges?skip=${skip}&limit=${limit}`);
      return page.items;
    },

    async getClusters() {
      return getJson("/clusters");
    },

    async getLinkSuggestions(limit = 10) {
      return getJson(`/links/suggestions?limit=${limit}`);
    },

    async getTopology() {
      return getJson("/analytics/topology");
    },

    async search(q, { limit = 10, depth = 1 } = {}) {
      return getJson(`/search?q=${encodeURIComponent(q)}&limit=${limit}&depth=${depth}`);
    },

    connectRealtime(onEvent, { onStatusChange } = {}) {
      const wsUrl = baseUrl.replace(/^http/, "ws") + "/ws";
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => onStatusChange?.("open");
      socket.onclose = () => onStatusChange?.("closed");
      socket.onerror = () => onStatusChange?.("error");
      socket.onmessage = (msg) => {
        try {
          onEvent(JSON.parse(msg.data));
        } catch {
          // bỏ qua message không parse được (không phải JSON hợp lệ)
        }
      };
      return () => socket.close();
    },
  };
}