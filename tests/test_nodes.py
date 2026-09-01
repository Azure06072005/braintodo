async def test_create_and_get_node(auth_headers) -> None:
    client, headers, _store = auth_headers
    resp = await client.post("/nodes", json={"title": "Idea 1"}, headers=headers)
    assert resp.status_code == 201
    node_id = resp.json()["id"]
    resp = await client.get(f"/nodes/{node_id}", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["title"] == "Idea 1"


async def test_create_nod_includes_embedding(auth_headers) -> None:
    client, headers, _store = auth_headers
    resp = await client.post(
        "/nodes", json={"title": "Idea 1", "content": "details"}, headers=headers
    )
    assert resp.status_code == 201
    embedding = resp.json()["embedding"]
    assert embedding is not None
    assert len(embedding) > 0


async def test_list_nodes_paginated(auth_headers) -> None:
    client, headers, _store = auth_headers
    for i in range(5):
        await client.post("/nodes", json={"title": f"Idea {i}"}, headers=headers)
    resp = await client.get("/nodes", params={"skip": 0, "limit": 2}, headers=headers)
    body = resp.json()
    assert body["total"] == 5
    assert len(body["items"]) == 2


async def test_create_edge_missing_node_returns_400(auth_headers) -> None:
    client, headers, _store = auth_headers
    resp = await client.post(
        "/edges",
        json={"source_id": "missing-a", "target_id": "missing-b"},
        headers=headers,
    )
    assert resp.status_code == 400


async def test_nodes_require_authentication(auth_headers) -> None:
    client, _headers, _store = auth_headers
    resp = await client.get("/nodes")
    assert resp.status_code == 401


async def test_create_node_without_node_type_defaults_to_idea(auth_headers) -> None:
    client, headers, _store = auth_headers
    resp = await client.post("/nodes", json={"title": "Idea 1"}, headers=headers)
    assert resp.status_code == 201
    body = resp.json()
    assert body["node_type"] == "idea"
    assert body["due_date"] is None
    assert body["priority"] is None
    assert body["completed_at"] is None
    assert body["recurrence_rule"] is None


async def test_create_task_node_round_trips_task_fields(auth_headers) -> None:
    client, headers, _store = auth_headers
    resp = await client.post(
        "/nodes",
        json={
            "title": "Write chapter 3",
            "node_type": "task",
            "due_date": "2026-09-01",
            "priority": "high",
        },
        headers=headers,
    )
    assert resp.status_code == 201
    node_id = resp.json()["id"]

    resp = await client.get(f"/nodes/{node_id}", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["node_type"] == "task"
    assert body["due_date"] == "2026-09-01"
    assert body["priority"] == "high"
    assert body["completed_at"] is None


async def test_create_node_invalid_priority_returns_422(auth_headers) -> None:
    client, headers, _store = auth_headers
    resp = await client.post(
        "/nodes",
        json={"title": "Bad task", "node_type": "task", "priority": "urgent"},
        headers=headers,
    )
    assert resp.status_code == 422


async def test_create_node_invalid_recurrence_rule_returns_422(auth_headers) -> None:
    client, headers, _store = auth_headers
    resp = await client.post(
        "/nodes",
        json={
            "title": "Bad task",
            "node_type": "task",
            "recurrence_rule": "hourly",
        },
        headers=headers,
    )
    assert resp.status_code == 422


async def test_create_node_invalid_node_type_returns_422(auth_headers) -> None:
    client, headers, _store = auth_headers
    resp = await client.post(
        "/nodes",
        json={"title": "Bad type", "node_type": "reminder"},
        headers=headers,
    )
    assert resp.status_code == 422


async def test_update_idea_node_does_not_require_task_fields(auth_headers) -> None:
    client, headers, _store = auth_headers
    resp = await client.post("/nodes", json={"title": "Idea 1"}, headers=headers)
    node_id = resp.json()["id"]

    resp = await client.patch(
        f"/nodes/{node_id}", json={"title": "Idea 1 renamed"}, headers=headers
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["title"] == "Idea 1 renamed"
    assert body["node_type"] == "idea"
    assert body["due_date"] is None
    assert body["priority"] is None
    assert body["completed_at"] is None
    assert body["recurrence_rule"] is None


async def test_user_cannot_see_another_users_node(app_client) -> None:
    client, _store, make_token = app_client
    token_a = await make_token(email="a@example.com")
    token_b = await make_token(email="b@example.com")
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    resp = await client.post("/nodes", json={"title": "A's idea"}, headers=headers_a)
    node_id = resp.json()["id"]

    resp = await client.get(f"/nodes/{node_id}", headers=headers_b)
    assert resp.status_code == 404

    resp = await client.get("/nodes", headers=headers_b)
    assert resp.json()["total"] == 0