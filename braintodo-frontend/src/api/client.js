/**
 * Client mỏng gọi API braintodo thật. Endpoint khớp đúng với
 * Azure06072005/braintodo (đã xác nhận từ source code thật).
 */

export function createApiClient(baseUrl) {
  async function getJson(path, { token } = {}) {
    const resp = await fetch(`${baseUrl}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!resp.ok) {
      const detail = await resp.json().catch(() => null);
      throw new Error(detail?.detail || `${path} -> HTTP ${resp.status}`);
    }
    return resp.json();
  }

  async function sendJson(method, path, body) {
    const resp = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const detail = await resp.json().catch(() => null);
      throw new Error(detail?.detail || `${method} ${path} -> HTTP ${resp.status}`);
    }
    // DELETE trả 204 No Content — không có body để parse.
    if (resp.status === 204) return null;
    return resp.json();
  }

  return {
    async register(email, password) {
      return sendJson("POST", "/auth/register", { email, password });
      // -> UserOut: {id, email, is_verified: false}
    },
    async login(email, password) {
      return sendJson("POST", "/auth/login", { email, password });
      // -> TokenResponse: {access_token, token_type: "bearer"}
    },
    async verifyEmail(token) {
      return getJson(`/auth/verify?token=${encodeURIComponent(token)}`);
      // -> UserOut: {..., is_verified: true}
    },
    async me(token) {
      return getJson("/auth/me", { token });
      // -> UserOut, 401 nếu thiếu/sai token
    },

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

    // --- Node mutations (khớp đúng api/nodes.py thật: POST 201, PATCH 200, DELETE 204) ---
    async createNode(data) {
      return sendJson("POST", "/nodes", data);
    },
    async updateNode(nodeId, data) {
      return sendJson("PATCH", `/nodes/${nodeId}`, data);
    },
    async deleteNode(nodeId) {
      return sendJson("DELETE", `/nodes/${nodeId}`);
    },

    // --- Edge mutations (khớp đúng api/edges.py thật: 400 nếu source/target không tồn tại) ---
    async createEdge(data) {
      return sendJson("POST", "/edges", data);
    },
    async updateEdge(edgeId, data) {
      return sendJson("PATCH", `/edges/${edgeId}`, data);
    },
    async deleteEdge(edgeId) {
      return sendJson("DELETE", `/edges/${edgeId}`);
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