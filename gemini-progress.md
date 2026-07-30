# Khôi phục kiến trúc Async (Phase 2 — Database)

- Cập nhật các file requirement và pyproject.toml
- Chuyển `GraphStore` (trong `base.py`), `Neo4jGraphStore`, và `InMemoryGraphStore` sang async.
- Chuyển Repository pattern sang async.
- Sửa lại các router trong `api/nodes.py` và `api/edges.py` để sử dụng Repository thay vì gọi trực tiếp store, đồng thời là async endpoints.
- Cập nhật `main.py` để chạy migrations trong lifespan event.
- Viết lại các hàm test trong `test_nodes.py`, `test_graph_store.py`, `test_repository.py` để sử dụng `pytest-asyncio` và `httpx.AsyncClient`.
