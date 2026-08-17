"""F020: every graph-related route requires a valid JWT, and each user only
ever sees/mutates their own nodes and edges (owner_id isolation)."""

import pytest

GRAPH_ROUTES = [
    ("GET", "/nodes"),
    ("POST", "/nodes"),
    ("GET", "/nodes/some-id"),
    ("PATCH", "/nodes/some-id"),
    ("DELETE", "/nodes/some-id"),
    ("GET", "/edges"),
    ("POST", "/edges"),
    ("GET", "/edges/some-id"),
    ("PATCH", "/edges/some-id"),
    ("DELETE", "/edges/some-id"),
    ("GET", "/graph/export"),
    ("POST", "/graph/import"),
    ("GET", "/clusters"),
    ("GET", "/links/suggestions"),
    ("GET", "/analytics/topology"),
    # NOTE: POST /gnn/recompute excluded - its dependency chain imports
    # torch eagerly, so it can't be exercised in a torch-free suite even
    # just for the 401 check. Covered separately in test_gnn_api.py.
    ("GET", "/search"),
]


@pytest.mark.parametrize("method,path", GRAPH_ROUTES)
async def test_route_requires_authentication(auth_headers, method: str, path: str) -> None:
    client, _headers, _store = auth_headers
    resp = await client.request(method, path, params={"q": "x"} if path == "/search" else None)
    assert resp.status_code == 401, f"{method} {path} did not require auth"


async def test_user_a_cannot_read_user_bs_node(app_client) -> None:
    client, _store, make_token = app_client
    headers_a = {"Authorization": f"Bearer {await make_token(email='a@example.com')}"}
    headers_b = {"Authorization": f"Bearer {await make_token(email='b@example.com')}"}

    node = (
        await client.post("/nodes", json={"title": "B's secret idea"}, headers=headers_b)
    ).json()

    resp = await client.get(f"/nodes/{node['id']}", headers=headers_a)
    assert resp.status_code == 404


async def test_user_a_cannot_update_or_delete_user_bs_node(app_client) -> None:
    client, _store, make_token = app_client
    headers_a = {"Authorization": f"Bearer {await make_token(email='a@example.com')}"}
    headers_b = {"Authorization": f"Bearer {await make_token(email='b@example.com')}"}

    node = (
        await client.post("/nodes", json={"title": "B's idea"}, headers=headers_b)
    ).json()

    resp = await client.patch(
        f"/nodes/{node['id']}", json={"title": "hijacked"}, headers=headers_a
    )
    assert resp.status_code == 404

    resp = await client.delete(f"/nodes/{node['id']}", headers=headers_a)
    assert resp.status_code == 404

    resp = await client.get(f"/nodes/{node['id']}", headers=headers_b)
    assert resp.status_code == 200
    assert resp.json()["title"] == "B's idea"


async def test_users_each_see_only_their_own_node_list(app_client) -> None:
    client, _store, make_token = app_client
    headers_a = {"Authorization": f"Bearer {await make_token(email='a@example.com')}"}
    headers_b = {"Authorization": f"Bearer {await make_token(email='b@example.com')}"}

    await client.post("/nodes", json={"title": "A1"}, headers=headers_a)
    await client.post("/nodes", json={"title": "A2"}, headers=headers_a)
    await client.post("/nodes", json={"title": "B1"}, headers=headers_b)

    resp_a = await client.get("/nodes", headers=headers_a)
    resp_b = await client.get("/nodes", headers=headers_b)

    assert resp_a.json()["total"] == 2
    assert resp_b.json()["total"] == 1


async def test_cannot_create_edge_across_users(app_client) -> None:
    client, _store, make_token = app_client
    headers_a = {"Authorization": f"Bearer {await make_token(email='a@example.com')}"}
    headers_b = {"Authorization": f"Bearer {await make_token(email='b@example.com')}"}

    node_a = (await client.post("/nodes", json={"title": "A"}, headers=headers_a)).json()
    node_b = (await client.post("/nodes", json={"title": "B"}, headers=headers_b)).json()

    resp = await client.post(
        "/edges",
        json={"source_id": node_a["id"], "target_id": node_b["id"]},
        headers=headers_a,
    )
    assert resp.status_code == 400


async def test_graph_export_only_includes_own_data(app_client) -> None:
    client, _store, make_token = app_client
    headers_a = {"Authorization": f"Bearer {await make_token(email='a@example.com')}"}
    headers_b = {"Authorization": f"Bearer {await make_token(email='b@example.com')}"}

    await client.post("/nodes", json={"title": "A's node"}, headers=headers_a)
    await client.post("/nodes", json={"title": "B's node"}, headers=headers_b)

    resp = await client.get("/graph/export", headers=headers_a)
    assert resp.status_code == 200
    titles = {n["title"] for n in resp.json()["nodes"]}
    assert titles == {"A's node"}