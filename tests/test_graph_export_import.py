def test_import_broadcasts_a_single_graph_imported_event() -> None:
    store = InMemoryGraphStore()
    manager = ConnectionManager()
    app.dependency_overrides[get_store] = lambda: store
    app.dependency_overrides[get_embedder] = lambda: FakeEmbeddingProvider()
    app.dependency_overrides[get_manager] = lambda: manager
    sync_client = TestClient(app)   # sync client vì httpx.AsyncClient không hỗ trợ WebSocket

    payload = {"nodes": [{"id": "old-1", "title": "A", ...}], "edges": []}

    try:
        with sync_client.websocket_connect("/ws") as ws:
            resp = sync_client.post("/graph/import", json=payload)
            assert resp.status_code == 200
            message = ws.receive_json()

        assert message == {
            "event": "graph_imported",
            "data": {"nodes_created": 1, "edges_created": 0, "edges_skipped": 0},
        }
    finally:
        app.dependency_overrides.clear()